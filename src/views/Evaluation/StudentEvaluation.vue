<template>
  <div class="p-md-4">
    <div class="">
      <h4 class="ch4 mb-0">Evaluation Form</h4>
      <p class="body1">
        Directions: Please evaluate carefully and objectively the performance of your teacher on the
        description per letter by writing the corresponding number on your answer sheet.
      </p>
    </div>

    <!-- Teacher details card -->
    <div v-if="teacher" class="teacher-card card mb-3 flex-grow-1 border-1">
      <div class="card-body">
        <div class="d-flex flex-column">
          <div class="ch5">
            {{ teacher.name || teacher.displayName || teacher.fullName || 'Teacher Name' }}
          </div>
          <div class="body2">
            {{ enrollment?.subjectCode || teacher.department || '' }}
            {{ enrollment?.subjectName ? '— ' + enrollment.subjectName : '' }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <div v-else>
      <div v-if="criterias.length === 0" class="text-center py-4 text-muted">
        No active criteria found for this evaluation.
      </div>

      <form @submit.prevent="confirmAndSubmit">
        <div v-for="(c, idx) in criterias" :key="c.id" class="criteria-section border-1 card mb-4">
          <div class="card-body">
            <h5 class="criteria-title">{{ c.criteriaName }}</h5>

            <div v-if="questionsByCriteria[c.id] && questionsByCriteria[c.id].length">
              <div v-for="q in questionsByCriteria[c.id]" :key="q.id" class="question-item my-3">
                <div class="question-text">{{ q.questionText }}</div>

                <!-- 5-point slider -->
                <div class="slider-wrap mt-1">
                  <input
                    class="slider"
                    :class="{ unanswered: answers[q.id] === null }"
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    :value="answers[q.id] ?? 3"
                    @input="onSliderInput(q.id, $event)"
                    :style="sliderStyle(answers[q.id])"
                    :ref="(el) => setSliderRef(q.id, el)"
                  />

                  <div class="scale-numbers d-flex justify-content-between mt-2">
                    <span
                      v-for="n in 5"
                      :key="n"
                      class="scale-num clickable"
                      @click.prevent="setAnswer(q.id, n)"
                      >{{ n }}</span
                    >
                  </div>

                  <div class="scale-labels d-flex justify-content-between mt-2">
                    <span class="small text-muted">Poor</span>
                    <span class="small text-muted">Excellent</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="text-muted small">No active questions for this criteria.</div>
          </div>
        </div>

        <div class="d-flex justify-content-end gap-2 mb-4">
          <button type="button" class="btn btn-secondary" @click="goBack">Cancel</button>
          <button :disabled="submitting || !formValid" type="submit" class="btn btn-primary">
            <span
              v-if="submitting"
              class="spinner-border spinner-border-sm me-2"
              role="status"
            ></span>
            Submit Evaluation
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCriteriaStore } from '@/store/criteriaStore'
import { useQuestionStore } from '@/store/questionsStore'
import { useFacultyStore } from '@/store/facultyStore'
import { useEnrollmentStore } from '@/store/enrollmentStore'
import { useAuthStore } from '@/store/authStore'
import { db } from '@/firebase'
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore'
import { showLoading, closeLoading, showChangesSaved } from '@/utils/swal'
import Swal from 'sweetalert2'

const route = useRoute()
const router = useRouter()
const criteriaStore = useCriteriaStore()
const questionStore = useQuestionStore()

const loading = ref(true)
const criterias = ref([])
const questionsByCriteria = reactive({})
const answers = reactive({})
const teacher = ref(null)
const sliderRefs = ref({})

const facultyStore = useFacultyStore()
const enrollmentStore = useEnrollmentStore()
const authStore = useAuthStore()
const enrollment = ref(null)

// show only active criterias and active questions
const loadData = async () => {
  loading.value = true
  try {
    await criteriaStore.fetchCriterias()
    // filter active criterias and sort by order if available
    const all = criteriaStore.criterias || []
    criterias.value = all
      .filter((c) => (c.status || c.statuts || '').toLowerCase() === 'active')
      .sort((a, b) => (a.criteriaOrder || 0) - (b.criteriaOrder || 0))

    // for each criteria fetch its questions and save only active questions
    for (const c of criterias.value) {
      await questionStore.fetchQuestionsByCriteria(c.id)
      const qs = (questionStore.questions || []).filter(
        (q) => (q.statuts || q.status || '').toLowerCase() === 'active',
      )
      questionsByCriteria[c.id] = qs.sort((a, b) => (a.questionOrder || 0) - (b.questionOrder || 0))

      // initialize answers keys
      for (const q of questionsByCriteria[c.id]) {
        // start blank (require student interaction)
        answers[q.id] = null
      }
    }
  } catch (err) {
    console.error('Failed to load evaluation data', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  const init = async () => {
    // load teacher info first
    const tid = route.params.teacherId
    if (tid) {
      await facultyStore.fetchFaculty()
      // facultyStore.faculties may contain teacher documents
      teacher.value =
        (facultyStore.faculties || []).find(
          (f) => f.id === tid || f.teacherId === tid || f.userId === tid,
        ) || null
    }

    // load student's enrollments to find subject details for this teacher
    const studentId = authStore.userData?.id || authStore.user?.uid
    if (studentId) {
      try {
        await enrollmentStore.fetchEnrollmentsByStudentId(studentId)
        const enrolls = enrollmentStore.enrollments || []
        // try to match by teacher id, name, or email (normalize strings for robustness)
        const tidParam = String(route.params.teacherId || '').trim()
        const teacherId = teacher.value?.id ? String(teacher.value.id).trim() : ''
        const teacherName = (teacher.value?.name || teacher.value?.displayName || '')
          .toLowerCase()
          .trim()
        const teacherEmail = (teacher.value?.email || teacher.value?.contact || '')
          .toLowerCase()
          .trim()

        // debug log
        // console.debug('Enrollments loaded', enrolls)

        enrollment.value =
          enrolls.find((e) => {
            const eTeacherId = e.teacherId || e.teacher || e.id || ''
            const eTeacherName = (e.teacherName || e.teacher || '').toLowerCase().trim()
            const eTeacherEmail = (e.teacherEmail || e.email || '').toLowerCase().trim()

            return (
              String(eTeacherId) === tidParam ||
              String(eTeacherId) === teacherId ||
              (eTeacherName && teacherName && eTeacherName === teacherName) ||
              (eTeacherEmail && teacherEmail && eTeacherEmail === teacherEmail)
            )
          }) || null
        // helpful debug
        // console.debug('Matched enrollment', enrollment.value)
      } catch (err) {
        console.error('Failed to fetch enrollments', err)
      }
    }

    await loadData()
  }

  init()
})

const submitting = ref(false)

const onSliderInput = (qid, e) => {
  const v = Number(e.target.value)
  answers[qid] = v
}

const positionScaleNumbersFor = (el) => {
  if (!el) return
  const wrap = el.closest('.slider-wrap')
  if (!wrap) return
  const scaleNumbers = wrap.querySelector('.scale-numbers')
  if (!scaleNumbers) return

  const trackRect = el.getBoundingClientRect()
  const containerRect = scaleNumbers.getBoundingClientRect()
  const cs = window.getComputedStyle(el)
  const padL = parseFloat(cs.paddingLeft) || 0
  const padR = parseFloat(cs.paddingRight) || 0
  // effective track left/width inside the input (exclude input padding)
  const trackLeft = trackRect.left + padL
  const trackWidth = Math.max(0, trackRect.width - padL - padR)

  const max = Number(el.max || 5)
  const min = Number(el.min || 1)
  const steps = max - min

  const children = Array.from(scaleNumbers.querySelectorAll('.scale-num'))
  children.forEach((child, idx) => {
    const ratio = idx / steps // 0..1
    const px = trackLeft + ratio * trackWidth
    const left = px - containerRect.left
    child.style.position = 'absolute'
    child.style.left = `${left}px`
    // center labels except first/last
    if (idx === 0) child.style.transform = 'translateX(0)'
    else if (idx === children.length - 1) child.style.transform = 'translateX(-100%)'
    else child.style.transform = 'translateX(-50%)'
  })
}

const setSliderRef = (qid, el) => {
  if (!qid) return
  if (el) {
    sliderRefs.value[qid] = el
    // position labels once element is mounted and laid out
    nextTick(() => positionScaleNumbersFor(el))
  } else {
    delete sliderRefs.value[qid]
  }
}

const resizeHandler = () => {
  // reposition all scale numbers when window resizes
  Object.values(sliderRefs.value || {}).forEach((el) => {
    try {
      positionScaleNumbersFor(el)
    } catch (e) {
      // ignore
    }
  })
}

window.addEventListener('resize', resizeHandler)
onUnmounted(() => {
  window.removeEventListener('resize', resizeHandler)
})

const setAnswer = async (qid, n) => {
  answers[qid] = Number(n)
  await nextTick()
  const el = sliderRefs.value[qid]
  if (el) {
    try {
      el.value = String(n)
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.focus()
    } catch (e) {
      // ignore
    }
  }
}

const formValid = computed(() => {
  const vals = Object.values(answers)
  if (vals.length === 0) return false
  return vals.every((v) => v !== null && v !== undefined)
})

const sliderStyle = (val) => {
  const pct = val === null || val === undefined ? 0 : ((val - 1) / (5 - 1)) * 100
  return { background: `linear-gradient(90deg, #0000AE ${pct}%, #e6e6ee ${pct}%)` }
}

const confirmAndSubmit = async () => {
  const res = await Swal.fire({
    title: 'Submit Evaluation',
    text: 'Are you sure you want to submit this evaluation? You will not be able to change your responses later.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Submit',
    cancelButtonText: 'Cancel',
  })
  if (res.isConfirmed) {
    await submitResponses()
  }
}

const submitResponses = async () => {
  // build payload
  const studentId = authStore.userData?.id || authStore.user?.uid || null
  const evaluationId = route.params.evaluationId || null
  const teacherId = route.params.teacherId || teacher.value?.id || null

  // Validation: ensure every question has a value (non-null)
  const unanswered = Object.keys(answers).filter(
    (qid) => answers[qid] === null || answers[qid] === undefined,
  )
  if (unanswered.length > 0) {
    // focus can be added per question; for now show a warning
    await closeLoading()
    alert('Please answer all questions before submitting.')
    return
  }

  const answersArray = Object.keys(answers).map((qid) => ({ questionId: qid, value: answers[qid] }))

  // Prevent duplicate submissions: check Responses for an existing doc
  try {
    const q = query(
      collection(db, 'Responses'),
      where('evaluationId', '==', evaluationId),
      where('teacherId', '==', teacherId),
      where('studentId', '==', studentId),
    )
    const snap = await getDocs(q)
    if (!snap.empty) {
      // already submitted
      await showChangesSaved() // reuse success modal but you can change to a different message
      router.push('/evaluations')
      return
    }
  } catch (err) {
    console.error('Duplicate check failed', err)
    // proceed — it's safer to attempt to write than block on query failure
  }

  const payload = {
    evaluationId,
    teacherId,
    studentId,
    teacherName: teacher.value?.name || teacher.value?.displayName || null,
    subjectCode: enrollment.value?.subjectCode || null,
    subjectName: enrollment.value?.subjectName || null,
    semester: enrollment.value?.semester || null,
    answers: answersArray,
    createdAt: serverTimestamp(),
  }

  showLoading('Submitting evaluation...')
  submitting.value = true
  try {
    await addDoc(collection(db, 'Responses'), payload)
    closeLoading()
    await showChangesSaved()
    router.push('/evaluations')
  } catch (err) {
    closeLoading()
    console.error('Failed to save responses', err)
    // fallback: still navigate back or show notification (could add Swal error)
  } finally {
    submitting.value = false
  }
}

const goBack = () => {
  router.back()
}
</script>

<style scoped lang="less">
@import '../../styles/index.less';
.eval-form-page {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.body2 {
  color: @text-secondary;
}
.criteria-section {
  border-radius: 6px;
}
.criteria-title {
  .ch5;
  color: @text-primary;
}
.question-text {
  .body1;
  color: @text-primary;
}
.scale-option {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #f4f1fb;
  padding: 0.4rem 0.6rem;
  border-radius: 999px;
}
.scale-option input {
  accent-color: @primary;
}

.teacher-card .teacher-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
}

/* Teacher card box like the screenshot */
.teacher-card {
  border-radius: 0.5rem;
}

/* Slider styling */
.slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: @divider;
  outline: none;
}
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  border: 4px solid @primary;
  box-shadow: 0 2px 6px rgba(79, 70, 229, 0.25);
}
.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  border: 4px solid @primary;
}

.scale-num {
  .overline;
  flex: none;
  width: 20%;
  cursor: pointer;
  color: @text-secondary;
  text-align: center;
  margin-left: 16px;
}
.scale-num:first-child {
  text-align: left;
  padding-left: 6px;
}
.scale-num:last-child {
  text-align: right;
  padding-right: 6px;
}
.slider-wrap .scale-numbers {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0;
  margin: 0;
  padding: 0;
}
.scale-labels {
  cursor: pointer;
}

.slider-wrap {
  /* horizontal padding compensates for the visible thumb radius + border so labels align
     with the slider track ends (thumb ~18px + 4px border => ~13px half-offset) */
  padding: 0 0rem 0.5rem;
}
.slider.unanswered {
  opacity: 0.9;
}
.slider.unanswered::-webkit-slider-thumb {
  opacity: 0; /* hide thumb until user interacts */
}
.slider.unanswered::-moz-range-thumb {
  opacity: 0;
}
</style>
