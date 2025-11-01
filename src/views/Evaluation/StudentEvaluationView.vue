<template>
  <div class="p-md-4">
    <div class="d-flex justify-content-between align-items-start">
      <div>
        <h4 class="ch4 mb-0">Submission Review</h4>
        <p class="body1">Viewing the submitted evaluation for this teacher.</p>
      </div>
      <div>
        <button class="btn btn-secondary" @click="goBack">Back</button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <div v-else>
      <div v-if="!responseDoc">
        <div v-if="isAdmin">
          <div v-if="submissions.length === 0" class="text-center text-muted py-4">
            No submissions yet for this teacher.
          </div>

          <div v-else>
            <!-- Averages summary -->
            <div v-if="averagesByCriteria.length > 0" class="card mb-3">
              <div class="card-body">
                <h5 class="mb-2">Summary — Average score per question</h5>
                <div v-for="c in averagesByCriteria" :key="c.id" class="mb-2">
                  <div class="fw-semibold mb-1">{{ c.name }}</div>
                  <ul class="list-unstyled mb-1">
                    <li
                      v-for="q in c.questions"
                      :key="q.id"
                      class="d-flex justify-content-between align-items-center py-1"
                    >
                      <div class="small text-muted">{{ q.text }}</div>
                      <div class="badge bg-secondary text-white">{{ q.avg }}</div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <ul class="list-group">
              <h5 class="mb-3">Student Responses</h5>
              <li
                v-for="s in submissions"
                :key="s.id"
                class="list-group-item d-flex justify-content-between align-items-center"
              >
                <div>
                  <div class="ch5 mb-0">{{ s.studentName }}</div>
                  <div class="small text-muted">{{ formatTimestamp(s.createdAt) }}</div>
                </div>
                <div>
                  <button
                    class="btn btn-outline-primary btn-sm"
                    @click="viewSubmission(s.studentId)"
                  >
                    View
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div v-else class="text-center text-muted py-4">
          You have not submitted an evaluation for this teacher yet.
        </div>
      </div>

      <div v-else>
        <div class="teacher-card card mb-3">
          <div class="card-body d-flex align-items-center gap-3">
            <div>
              <div class="ch5">{{ responseDoc.teacherName }}</div>
              <div class="body2">{{ responseDoc.subjectCode }} — {{ responseDoc.subjectName }}</div>
            </div>
          </div>
        </div>

        <div class="card mb-3">
          <div class="card-body">
            <div v-if="groupedAnswers.length === 0" class="text-muted">No answers available.</div>

            <div v-for="criteria in groupedAnswers" :key="criteria.id" class="mb-4">
              <div class="criteria-title mb-3">{{ criteria.name }}</div>

              <div v-for="q in criteria.questions" :key="q.id" class="mb-3">
                <div class="question-text">{{ q.text || q.id }}</div>

                <!-- read-only slider UI -->
                <div class="slider-wrap mt-1">
                  <input
                    class="slider"
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    :value="q.value"
                    :style="sliderStyle(q.value)"
                    disabled
                    :ref="(el) => setSliderRef(q.id, el)"
                  />

                  <div class="scale-numbers d-flex justify-content-between mt-1">
                    <span v-for="n in 5" :key="n" class="scale-num">{{ n }}</span>
                  </div>

                  <div class="scale-labels d-flex justify-content-between mt-1">
                    <span class="small text-muted">Poor</span>
                    <span class="small text-muted">Excellent</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Back button moved to header (top-right) -->
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStudentStore } from '@/store/studentStore'
import { useAuthStore } from '@/store/authStore'
import { useCriteriaStore } from '@/store/criteriaStore'
import { useQuestionStore } from '@/store/questionsStore'
import { db } from '@/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const criteriaStore = useCriteriaStore()
const questionStore = useQuestionStore()

const loading = ref(true)
const responseDoc = ref(null)
const questionTextById = reactive({})
const groupedAnswers = ref([])
const submissions = ref([]) // list of response docs for admin
const averagesByCriteria = ref([])
const studentStore = useStudentStore()

const isAdmin = computed(() =>
  (authStore.userData?.role || '').toString().toLowerCase().includes('admin'),
)

const formatTimestamp = (ts) => {
  if (!ts) return 'N/A'
  try {
    // Firestore Timestamp has toDate()
    const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts)
    return d.toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch (e) {
    return 'N/A'
  }
}

const viewSubmission = (studentId) => {
  // navigate to this same view but include studentId in query so onMounted loads that response
  router.push({
    name: route.name || 'StudentEvaluationViewMain',
    params: { evaluationId: route.params.evaluationId, teacherId: route.params.teacherId },
    query: { studentId },
  })
}

const goBack = () => {
  const evaluationId = route.params.evaluationId
  // if we're currently viewing a specific student's submission (query present) -> go back to submissions list
  if (route.query && route.query.studentId) {
    router.push({
      name: route.name || 'StudentEvaluationViewMain',
      params: { evaluationId: route.params.evaluationId, teacherId: route.params.teacherId },
      query: {},
    })
    return
  }

  // Otherwise decide where to go based on current path / role
  const currentPath = (route.path || '').toString()
  // If we're under the /main layout, go to the EvaluationSummary
  if (currentPath.startsWith('/main')) {
    router.push({ name: 'EvaluationSummary', params: { evaluationId } })
    return
  }

  // If we're under the /evaluations layout (student evaluators page), go back to the evaluators list
  if (currentPath.startsWith('/evaluations')) {
    router.push({ name: 'EvaluatorsView' })
    return
  }

  // Fallback: go back in history
  router.back()
}

// react to query changes (when admin clicks a student and we land with a studentId)
watch(
  () => route.query.studentId,
  async (newVal, oldVal) => {
    // when studentId is removed (admin clicked back), reload submissions list
    if (!newVal) {
      loading.value = true
      try {
        const evaluationId = route.params.evaluationId
        const teacherId = route.params.teacherId
        const rQ = query(
          collection(db, 'Responses'),
          where('evaluationId', '==', evaluationId),
          where('teacherId', '==', teacherId),
        )
        const rSnap = await getDocs(rQ)
        const studentsById = Object.fromEntries((studentStore.students || []).map((s) => [s.id, s]))
        submissions.value = rSnap.docs.map((d) => {
          const data = d.data()
          const student = studentsById[data.studentId]
          return {
            id: d.id,
            ...data,
            studentName: student
              ? student.fullName ||
                student.name ||
                student.displayName ||
                student.email ||
                student.id
              : data.studentName || data.studentId,
          }
        })
        // compute averages for header
        computeAverages(submissions.value)
        responseDoc.value = null
        groupedAnswers.value = []
      } catch (err) {
        console.error('Failed to reload submissions', err)
      } finally {
        loading.value = false
      }
      return
    }
    // re-run the fetch logic by calling onMounted handl er: simplest is to reload the page data
    loading.value = true
    try {
      const evaluationId = route.params.evaluationId
      const teacherId = route.params.teacherId
      const rQ = query(
        collection(db, 'Responses'),
        where('evaluationId', '==', evaluationId),
        where('teacherId', '==', teacherId),
        where('studentId', '==', newVal),
      )
      const rSnap = await getDocs(rQ)
      if (rSnap.empty) responseDoc.value = null
      else responseDoc.value = rSnap.docs[0].data()

      // rebuild groupedAnswers for this response
      await criteriaStore.fetchCriterias()
      const criterias = criteriaStore.criterias || []
      const answersByQuestionId = {}
      for (const a of responseDoc.value.answers || []) answersByQuestionId[a.questionId] = a.value
      const groups = []
      for (const c of criterias) {
        await questionStore.fetchQuestionsByCriteria(c.id)
        const qs = questionStore.questions || []
        const questions = []
        for (const q of qs) {
          if (answersByQuestionId.hasOwnProperty(q.id))
            questions.push({ id: q.id, text: q.questionText, value: answersByQuestionId[q.id] })
        }
        if (questions.length > 0)
          groups.push({
            id: c.criteriaId,
            name: c.criteriaName || c.criteria || 'Criteria',
            questions,
          })
      }
      groupedAnswers.value = groups
    } catch (err) {
      console.error('Failed to load selected submission', err)
    } finally {
      loading.value = false
    }
  },
)

// slider refs and helpers to position labels exactly like the form view
const sliderRefs = ref({})

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
    if (idx === 0) child.style.transform = 'translateX(0)'
    else if (idx === children.length - 1) child.style.transform = 'translateX(-100%)'
    else child.style.transform = 'translateX(-50%)'
  })
}

const setSliderRef = (qid, el) => {
  if (!qid) return
  if (el) {
    sliderRefs.value[qid] = el
    nextTick(() => positionScaleNumbersFor(el))
  } else {
    delete sliderRefs.value[qid]
  }
}

const resizeHandler = () => {
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

const computeAverages = async (subs) => {
  averagesByCriteria.value = []
  if (!subs || subs.length === 0) return

  const stats = {}
  for (const s of subs) {
    for (const a of s.answers || []) {
      const qid = a.questionId
      const val = Number(a.value) || 0
      if (!stats[qid]) stats[qid] = { sum: 0, count: 0 }
      stats[qid].sum += val
      stats[qid].count += 1
    }
  }

  await criteriaStore.fetchCriterias()
  const criterias = criteriaStore.criterias || []
  const groups = []
  for (const c of criterias) {
    await questionStore.fetchQuestionsByCriteria(c.id)
    const qs = questionStore.questions || []
    const questions = []
    for (const q of qs) {
      const st = stats[q.id]
      const avg = st && st.count ? st.sum / st.count : null
      if (avg !== null) {
        questions.push({
          id: q.id,
          text: q.questionText || q.id,
          avg: Number(avg.toFixed(2)),
          count: st.count,
        })
      }
    }
    if (questions.length > 0)
      groups.push({ id: c.id, name: c.criteriaName || c.criteria || 'Criteria', questions })
  }

  averagesByCriteria.value = groups
}

const sliderStyle = (val) => {
  const pct = val === null || val === undefined ? 0 : ((val - 1) / (5 - 1)) * 100
  return { background: `linear-gradient(90deg, #0000AE ${pct}%, #e6e6ee ${pct}%)` }
}

onMounted(async () => {
  loading.value = true
  try {
    // Always fetch students for name lookup
    await studentStore.fetchStudents()
    const evaluationId = route.params.evaluationId
    const teacherId = route.params.teacherId
    const routeStudentId = route.params.studentId || route.query.studentId
    const currentUserId = authStore.userData?.id || authStore.user?.uid
    const currentRole = (authStore.userData?.role || '').toString().toLowerCase()

    // If admin, show list of submissions for this teacher or a specific student's submission
    const isAdmin = currentRole.includes('admin')

    if (isAdmin) {
      // If a studentId is present in the route, load that student's response
      if (routeStudentId) {
        const rQ = query(
          collection(db, 'Responses'),
          where('evaluationId', '==', evaluationId),
          where('teacherId', '==', teacherId),
          where('studentId', '==', routeStudentId),
        )
        const rSnap = await getDocs(rQ)
        if (rSnap.empty) {
          responseDoc.value = null
        } else {
          responseDoc.value = rSnap.docs[0].data()
        }
      } else {
        // fetch all responses for this teacher/evaluation and list them
        const rQ = query(
          collection(db, 'Responses'),
          where('evaluationId', '==', evaluationId),
          where('teacherId', '==', teacherId),
        )
        const rSnap = await getDocs(rQ)
        // Map studentId to name using studentStore
        const studentsById = Object.fromEntries((studentStore.students || []).map((s) => [s.id, s]))
        submissions.value = rSnap.docs.map((d) => {
          const data = d.data()
          const student = studentsById[data.studentId]
          return {
            id: d.id,
            ...data,
            studentName: student
              ? student.fullName ||
                student.name ||
                student.displayName ||
                student.email ||
                student.id
              : data.studentName || data.studentId,
          }
        })
        // compute averages per question across all submissions
        computeAverages(submissions.value)
        // don't set responseDoc yet; admin should pick a student to view
        responseDoc.value = null
      }
    } else {
      // normal student flow: load the student's own submission
      if (!currentUserId) {
        loading.value = false
        return
      }

      const rQ = query(
        collection(db, 'Responses'),
        where('evaluationId', '==', evaluationId),
        where('teacherId', '==', teacherId),
        where('studentId', '==', currentUserId),
      )
      const rSnap = await getDocs(rQ)
      if (rSnap.empty) {
        responseDoc.value = null
        loading.value = false
        return
      }

      // assume one document
      const docData = rSnap.docs[0].data()
      responseDoc.value = docData
    }

    // build question text map and grouped answers by fetching criterias/questions like the form
    if (responseDoc.value) {
      await criteriaStore.fetchCriterias()
      const criterias = criteriaStore.criterias || []

      // preload all questions per criteria and build mapping
      const answersByQuestionId = {}
      for (const a of responseDoc.value.answers || []) {
        answersByQuestionId[a.questionId] = a.value
      }

      const groups = []
      for (const c of criterias) {
        await questionStore.fetchQuestionsByCriteria(c.id)
        const qs = questionStore.questions || []
        const questions = []
        for (const q of qs) {
          questionTextById[q.id] = q.questionText
          // only include questions that have an answer in this response
          if (answersByQuestionId.hasOwnProperty(q.id)) {
            questions.push({ id: q.id, text: q.questionText, value: answersByQuestionId[q.id] })
          }
        }

        if (questions.length > 0) {
          groups.push({
            id: c.criteriaId,
            name: c.criteriaName || c.criteria || 'Criteria',
            questions,
          })
        }
      }

      groupedAnswers.value = groups
    } else {
      groupedAnswers.value = []
    }
  } catch (err) {
    console.error('Failed to load submission', err)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped lang="less">
@import '../../styles/index.less';

.teacher-card .teacher-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
}

.eval-view-page {
  display: flex;
  flex-direction: column;
}

.criteria-title {
  .ch5;
  color: @text-primary;
}
.question-text {
  .body1;
  color: @text-primary;
}

/* Slider styling (match StudentEvaluation form) */
.slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: #e9e9f0;
  outline: none;
}
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  border: 4px solid #0000ae;
  box-shadow: 0 2px 6px rgba(79, 70, 229, 0.25);
}
.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  border: 4px solid #0000ae;
}

.slider-wrap {
  padding: 0 0rem 0.5rem;
}
.scale-num {
  .overline;
  cursor: default;
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  color: @text-secondary;
  white-space: nowrap;
}
.slider-wrap .scale-numbers {
  position: relative;
  height: 18px;
  margin: 0;
  padding: 0;
}
.scale-labels {
  cursor: default;
}

.body2 {
  color: @text-secondary;
}

.list-group-item {
  background-color: transparent;
  border-radius: 6px;
}
</style>
