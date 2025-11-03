<template>
  <div class="p-md-4">
    <div class="">
      <h4 class="ch4 mb-0">Faculty Evaluation Form</h4>
      <p class="body1">
        Please evaluate carefully and objectively the performance of your colleague based on the
        following criteria.
      </p>
    </div>

    <!-- Evaluatee details card -->
    <div v-if="evaluatee" class="teacher-card card mb-3 flex-grow-1 border-1">
      <div class="card-body">
        <div class="d-flex flex-column">
          <div class="ch5">
            {{ evaluatee.name || evaluatee.displayName || evaluatee.fullName || 'Faculty Member' }}
          </div>
          <div class="body2">
            {{ evaluatee.department || evaluatee.position || '' }}
            {{ evaluationType === 'faculty-to-administrator' ? '• Administrator' : '• Faculty' }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <!-- Navigation Phase -->
    <div v-else-if="currentPhase === 'sections'" class="">
      <!-- Sections List -->
      <div v-if="sections.length === 0" class="text-center py-4 text-muted">
        No sections found for this evaluation type.
      </div>

      <div v-else>
        <div class="d-flex justify-content-between align-items-center mb-4">
          <div>
            <div class="ch5">Evaluation Sections</div>
            <div class="body2">Select a section to begin evaluation</div>
          </div>
          <div class="badge bg-primary">
            {{ completedSections.length }} / {{ sections.length }} Complete
          </div>
        </div>

        <div class="list-group">
          <div
            v-for="section in sections"
            :key="section.id"
            class="list-group-item list-group-item-action d-flex justify-content-between align-items-center section-item"
            :class="{ completed: isCompletedSection(section.id) }"
            @click="selectSection(section)"
          >
            <div>
              <div class="fw-medium">{{ section.sectionName }}</div>
              <div class="small text-muted">
                {{ getSectionProgress(section.id) }}
              </div>
            </div>
            <div>
              <span v-if="isCompletedSection(section.id)" class="badge bg-success">
                <span class="icon">check</span>
              </span>
              <span v-else class="badge bg-secondary">
                <span class="icon">arrow_forward</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Submit Button (only show when all sections complete) -->
        <div
          v-if="completedSections.length === sections.length"
          class="d-flex justify-content-end gap-2 mt-4"
        >
          <button type="button" class="btn btn-secondary" @click="goBack">Cancel</button>
          <button type="button" class="btn btn-primary" @click="confirmAndSubmit">
            Submit Complete Evaluation
          </button>
        </div>
      </div>
    </div>

    <!-- Criteria Phase -->
    <div v-else-if="currentPhase === 'criteria'" class="">
      <!-- Breadcrumb -->
      <nav aria-label="breadcrumb" class="mb-3">
        <ol class="breadcrumb">
          <li class="breadcrumb-item">
            <button type="button" class="btn btn-link p-0" @click="backToSections">Sections</button>
          </li>
          <li class="breadcrumb-item active">{{ currentSection?.sectionName }}</li>
        </ol>
      </nav>

      <div v-if="criterias.length === 0" class="text-center py-4 text-muted">
        No criteria found for this section.
      </div>

      <div v-else>
        <div class="d-flex justify-content-between align-items-center mb-4">
          <div>
            <div class="ch5">{{ currentSection?.sectionName }}</div>
            <div class="body2">Select criteria to evaluate</div>
          </div>
          <div class="badge bg-primary">
            {{ completedCriterias.length }} / {{ criterias.length }} Complete
          </div>
        </div>

        <div class="list-group">
          <div
            v-for="criteria in criterias"
            :key="criteria.id"
            class="list-group-item list-group-item-action d-flex justify-content-between align-items-center section-item"
            :class="{ completed: isCompletedCriteria(criteria.id) }"
            @click="selectCriteria(criteria)"
          >
            <div>
              <div class="fw-medium">{{ criteria.criteriaName }}</div>
              <div class="small text-muted">
                {{ getCriteriaProgress(criteria.id) }}
              </div>
            </div>
            <div>
              <span v-if="isCompletedCriteria(criteria.id)" class="badge bg-success">
                <span class="icon">check</span>
              </span>
              <span v-else class="badge bg-secondary">
                <span class="icon">arrow_forward</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Navigation -->
        <div class="d-flex justify-content-between mt-4">
          <button type="button" class="btn btn-secondary" @click="backToSections">
            <span class="icon me-1">arrow_back</span>
            Back to Sections
          </button>
          <button
            v-if="completedCriterias.length === criterias.length"
            type="button"
            class="btn btn-outline-primary"
            @click="backToSections"
          >
            Section Complete
            <span class="icon ms-1">check</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Questions Phase -->
    <div v-else-if="currentPhase === 'questions'" class="">
      <!-- Breadcrumb -->
      <nav aria-label="breadcrumb" class="mb-3">
        <ol class="breadcrumb">
          <li class="breadcrumb-item">
            <button type="button" class="btn btn-link p-0" @click="backToSections">Sections</button>
          </li>
          <li class="breadcrumb-item">
            <button type="button" class="btn btn-link p-0" @click="backToCriterias">
              {{ currentSection?.sectionName }}
            </button>
          </li>
          <li class="breadcrumb-item active">{{ currentCriteria?.criteriaName }}</li>
        </ol>
      </nav>

      <div v-if="questions.length === 0" class="text-center py-4 text-muted">
        No questions found for this criteria.
      </div>

      <form v-else @submit.prevent="saveAndContinue">
        <div class="criteria-section border-1 card mb-4">
          <div class="card-body">
            <h5 class="criteria-title">{{ currentCriteria?.criteriaName }}</h5>

            <div v-for="q in questions" :key="q.id" class="question-item my-3">
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
        </div>

        <!-- Navigation -->
        <div class="d-flex justify-content-between gap-2 mb-4">
          <button type="button" class="btn btn-secondary" @click="backToCriterias">
            <span class="icon me-1">arrow_back</span>
            Back to Criteria
          </button>
          <button :disabled="!allQuestionsAnswered" type="submit" class="btn btn-primary">
            Save & Continue
            <span class="icon ms-1">arrow_forward</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSectionsStore } from '@/store/sectionsStore'
import { useCriteriaStore } from '@/store/criteriaStore'
import { useQuestionStore } from '@/store/questionsStore'
import { useUserStore } from '@/store/userStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useAuthStore } from '@/store/authStore'
import { db } from '@/firebase'
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore'
import { showLoading, closeLoading, showChangesSaved } from '@/utils/swal'
import Swal from 'sweetalert2'

const route = useRoute()
const router = useRouter()
const sectionsStore = useSectionsStore()
const criteriaStore = useCriteriaStore()
const questionStore = useQuestionStore()
const userStore = useUserStore()
const settingsStore = useSettingsStore()
const authStore = useAuthStore()

const loading = ref(true)
const currentPhase = ref('sections') // 'sections', 'criteria', 'questions'
const sections = ref([])
const criterias = ref([])
const questions = ref([])
const answers = reactive({})
const sliderRefs = ref({})

const evaluationType = computed(() => route.params.evaluationType)
const evaluateeId = computed(() => route.params.evaluateeId)
const evaluationId = computed(() => route.query.evaluationId)
const evaluateeName = computed(() => route.query.evaluateeName)

const evaluatee = ref(null)
const currentSection = ref(null)
const currentCriteria = ref(null)
const completedSections = ref([])
const completedCriterias = ref([])

const loadEvaluatee = async () => {
  try {
    await userStore.fetchUsers()
    const users = userStore.users || []
    evaluatee.value = users.find((user) => user.id === evaluateeId.value) || {
      name: evaluateeName.value,
      id: evaluateeId.value,
    }
  } catch (err) {
    console.error('Failed to load evaluatee', err)
  }
}

const loadSections = async () => {
  try {
    await settingsStore.fetchSettings()
    await sectionsStore.fetchSections(evaluationType.value)
    sections.value = (sectionsStore.sections || [])
      .filter((s) => s.status === 'Active')
      .sort((a, b) => (a.sectionOrder || 0) - (b.sectionOrder || 0))
  } catch (err) {
    console.error('Failed to load sections', err)
  }
}

const loadCriterias = async (sectionId) => {
  try {
    await criteriaStore.fetchCriterias()
    criterias.value = (criteriaStore.criterias || [])
      .filter((c) => c.sectionId === sectionId && c.status === 'Active')
      .sort((a, b) => (a.criteriaOrder || 0) - (b.criteriaOrder || 0))
  } catch (err) {
    console.error('Failed to load criterias', err)
  }
}

const loadQuestions = async (criteriaId) => {
  try {
    await questionStore.fetchQuestionsByCriteria(criteriaId)
    questions.value = (questionStore.questions || [])
      .filter((q) => q.status === 'Active' || q.statuts === 'Active')
      .sort((a, b) => (a.questionOrder || 0) - (b.questionOrder || 0))

    // Initialize answers for questions
    for (const q of questions.value) {
      if (!(q.id in answers)) {
        answers[q.id] = null
      }
    }
  } catch (err) {
    console.error('Failed to load questions', err)
  }
}

const selectSection = (section) => {
  currentSection.value = section
  currentPhase.value = 'criteria'
  loadCriterias(section.id)
}

const selectCriteria = (criteria) => {
  currentCriteria.value = criteria
  currentPhase.value = 'questions'
  loadQuestions(criteria.id)
}

const backToSections = () => {
  currentPhase.value = 'sections'
  currentSection.value = null
  currentCriteria.value = null
}

const backToCriterias = () => {
  currentPhase.value = 'criteria'
  currentCriteria.value = null
}

const isCompletedSection = (sectionId) => {
  return completedSections.value.includes(sectionId)
}

const isCompletedCriteria = (criteriaId) => {
  return completedCriterias.value.includes(criteriaId)
}

const getSectionProgress = (sectionId) => {
  // This would calculate progress based on completed criterias in section
  return 'Click to begin'
}

const getCriteriaProgress = (criteriaId) => {
  // This would calculate progress based on answered questions
  return 'Click to evaluate'
}

const allQuestionsAnswered = computed(() => {
  if (questions.value.length === 0) return false
  return questions.value.every((q) => answers[q.id] !== null && answers[q.id] !== undefined)
})

const onSliderInput = (qid, e) => {
  const v = Number(e.target.value)
  answers[qid] = v
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

const positionScaleNumbersFor = (el) => {
  // Copy the exact positioning logic from StudentEvaluation.vue
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
    const ratio = idx / steps
    const px = trackLeft + ratio * trackWidth
    const left = px - containerRect.left
    child.style.position = 'absolute'
    child.style.left = `${left}px`
    if (idx === 0) child.style.transform = 'translateX(0)'
    else if (idx === children.length - 1) child.style.transform = 'translateX(-100%)'
    else child.style.transform = 'translateX(-50%)'
  })
}

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

const sliderStyle = (val) => {
  const pct = val === null || val === undefined ? 0 : ((val - 1) / (5 - 1)) * 100
  return { background: `linear-gradient(90deg, #0000AE ${pct}%, #e6e6ee ${pct}%)` }
}

const saveAndContinue = () => {
  if (!allQuestionsAnswered.value) return

  // Mark criteria as completed
  if (!completedCriterias.value.includes(currentCriteria.value.id)) {
    completedCriterias.value.push(currentCriteria.value.id)
  }

  // Check if all criterias in section are completed
  const sectionCriterias = criterias.value.map((c) => c.id)
  const sectionComplete = sectionCriterias.every((id) => completedCriterias.value.includes(id))

  if (sectionComplete && !completedSections.value.includes(currentSection.value.id)) {
    completedSections.value.push(currentSection.value.id)
  }

  // Go back to criterias
  backToCriterias()
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
    await submitEvaluation()
  }
}

const submitEvaluation = async () => {
  const currentUserId = authStore.userData?.id || authStore.user?.uid

  if (!currentUserId || !evaluateeId.value || !evaluationId.value) {
    console.error('Missing required data for submission')
    return
  }

  // Check for duplicate submission
  try {
    const q = query(
      collection(db, 'Responses'),
      where('evaluationId', '==', evaluationId.value),
      where('evaluatorId', '==', currentUserId),
      where('evaluateeId', '==', evaluateeId.value),
    )
    const snap = await getDocs(q)
    if (!snap.empty) {
      await showChangesSaved()
      router.push('/faculty-evaluations')
      return
    }
  } catch (err) {
    console.error('Duplicate check failed', err)
  }

  // Build answers array with section and criteria context
  const answersArray = Object.keys(answers)
    .filter((qid) => answers[qid] !== null && answers[qid] !== undefined)
    .map((qid) => {
      const question = questions.value.find((q) => q.id === qid)
      return {
        questionId: qid,
        value: answers[qid],
        criteriaId: question?.criteriaId || currentCriteria.value?.id,
        sectionId: currentSection.value?.id,
      }
    })

  const payload = {
    evaluationId: evaluationId.value,
    evaluatorId: currentUserId,
    evaluateeId: evaluateeId.value,
    evaluatorName: authStore.userData?.name || authStore.userData?.displayName,
    evaluateeName: evaluatee.value?.name || evaluateeName.value,
    evaluatorDepartment: authStore.userData?.department,
    evaluateeDepartment: evaluatee.value?.department,
    evaluationType: evaluationType.value,
    answers: answersArray,
    createdAt: serverTimestamp(),
    submittedAt: serverTimestamp(),
  }

  showLoading('Submitting evaluation...')
  try {
    await addDoc(collection(db, 'Responses'), payload)
    closeLoading()
    await showChangesSaved()
    router.push('/faculty-evaluations')
  } catch (err) {
    closeLoading()
    console.error('Failed to save evaluation', err)
    await Swal.fire('Error', 'Failed to submit evaluation. Please try again.', 'error')
  }
}

const goBack = () => {
  router.push('/faculty-evaluations')
}

onMounted(async () => {
  loading.value = true
  try {
    await loadEvaluatee()
    await loadSections()
  } catch (err) {
    console.error('Failed to initialize evaluation form', err)
  } finally {
    loading.value = false
  }
})
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

.teacher-card .teacher-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
}

.teacher-card {
  border-radius: 0.5rem;
}

.section-item {
  cursor: pointer;
  transition: all 0.2s ease;
}

.section-item:hover {
  background-color: @hover;
}

.section-item.completed {
  background-color: #d4edda;
  border-color: #c3e6cb;
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
  padding: 0 0rem 0.5rem;
}

.slider.unanswered {
  opacity: 0.9;
}

.slider.unanswered::-webkit-slider-thumb {
  opacity: 0;
}

.slider.unanswered::-moz-range-thumb {
  opacity: 0;
}

.ch4 {
  color: @text-primary;
}

.ch5 {
  color: @text-primary;
}

.body1,
.body2 {
  color: @text-secondary;
}

.breadcrumb {
  background: none;
  padding: 0;
  margin: 0;
}

.breadcrumb-item + .breadcrumb-item::before {
  color: @text-secondary;
}

.btn-link {
  color: @primary;
  text-decoration: none;
}

.btn-link:hover {
  color: @primary;
  text-decoration: underline;
}
</style>
