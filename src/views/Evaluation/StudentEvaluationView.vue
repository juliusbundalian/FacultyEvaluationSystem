<template>
  <div class="p-md-4">
    <div class="d-flex justify-content-between align-items-start">
      <div>
        <h4 class="ch4 mb-0">Submission Review</h4>
        <p class="body1">Viewing the submitted evaluation for this evaluatee.</p>
      </div>
      <div>
        <button class="btn btn-secondary" @click="goBack">Back</button>
      </div>
    </div>

    <div v-if="loading" class="py-4">
      <div v-if="isAdmin && !route.query.studentId && !route.query.evaluatorId">
        <!-- Skeleton for Summary card while loading (per criteria) -->
        <div class="card mb-3">
          <div class="card-body">
            <h5 class="mb-2">Summary — Average score per criteria</h5>
            <div class="avg-skeleton">
              <div
                v-for="i in 3"
                :key="'sk-crit-' + i"
                class="d-flex justify-content-between align-items-center py-2"
              >
                <div class="skeleton skeleton-text me-3"></div>
                <div class="skeleton skeleton-badge"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Skeleton for submissions list -->
        <ul class="list-group">
          <h5 class="mb-3">Submissions</h5>
          <li
            v-for="i in 3"
            :key="'sk-sub-' + i"
            class="list-group-item d-flex justify-content-between align-items-center"
          >
            <div class="skeleton skeleton-text" style="width: 200px"></div>
            <div class="skeleton skeleton-badge"></div>
          </li>
        </ul>
      </div>
      <div v-else>
        <!-- Generic content skeleton -->
        <div class="card mb-3">
          <div class="card-body">
            <div class="skeleton skeleton-title mb-3"></div>
            <div class="skeleton skeleton-text mb-2"></div>
            <div class="skeleton skeleton-text mb-2"></div>
            <div class="skeleton skeleton-text mb-2"></div>
          </div>
        </div>
      </div>
    </div>

    <div v-else>
      <!-- Admin list view (no participant selected) -->
      <div v-if="isAdmin && !route.query.studentId && !route.query.evaluatorId">
        <div class="card mb-3">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h5 class="mb-0">Summary — Average score per criteria</h5>
              <div class="btn-group btn-group-sm">
                <button
                  class="btn"
                  :class="criteriaViewMode === 'chart' ? 'btn-primary' : 'btn-outline-primary'"
                  @click="setCriteriaView('chart')"
                >
                  Chart
                </button>
                <button
                  class="btn"
                  :class="criteriaViewMode === 'table' ? 'btn-primary' : 'btn-outline-primary'"
                  @click="setCriteriaView('table')"
                >
                  Table
                </button>
              </div>
            </div>

            <div v-if="criteriaSummary.length === 0" class="text-muted small">
              No criteria data.
            </div>

            <div v-else>
              <div v-if="criteriaViewMode === 'chart'" class="criteria-chart-wrap">
                <canvas ref="criteriaChartRef"></canvas>
              </div>

              <div v-else class="table-responsive">
                <table class="table table-sm align-middle mb-0">
                  <thead>
                    <tr class="small text-muted">
                      <th style="width: 64px">Rank</th>
                      <th>Criteria</th>
                      <th style="width: 120px" class="text-end">Average</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in criteriaSummary" :key="row.id">
                      <td class="small">{{ row.rank }}</td>
                      <td>
                        <div class="truncate" :title="row.name">{{ row.name }}</div>
                      </td>
                      <td class="text-end fw-semibold">{{ row.avg.toFixed(2) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <ul class="list-group">
          <h5 class="mb-3">Submissions</h5>
          <li
            v-for="s in submissions"
            :key="s.id"
            class="list-group-item d-flex justify-content-between align-items-center"
          >
            <div>
              <div class="ch5 mb-0">{{ s.participantName }}</div>
              <div class="small text-muted">{{ formatTimestamp(s.createdAt) }}</div>
            </div>
            <div>
              <button
                class="btn btn-outline-primary btn-sm"
                @click="viewSubmission(s.participantId)"
              >
                View
              </button>
            </div>
          </li>
        </ul>
        <div v-if="submissions.length === 0" class="text-center text-muted py-4">
          No submissions yet.
        </div>
      </div>

      <!-- Participant response view -->
      <div v-else>
        <div v-if="!responseDoc" class="text-center text-muted py-4">
          You have not submitted an evaluation for this evaluatee yet.
        </div>
        <div v-else>
          <div class="teacher-card card mb-3">
            <div class="card-body d-flex align-items-center gap-3">
              <div>
                <div class="ch5">
                  {{ responseDoc.evaluateeName || responseDoc.teacherName || 'Evaluatee' }}
                </div>
                <div class="body2">
                  <!-- Show subject info for student evaluations; role/department for faculty/admin evaluations if available -->
                  <template v-if="!isFacultyEvaluation">
                    {{ responseDoc.subjectCode }} — {{ responseDoc.subjectName }}
                  </template>
                  <template v-else>
                    {{ responseDoc.evaluateeRole || '' }}
                    <span v-if="responseDoc.evaluateeDepartment">
                      — {{ responseDoc.evaluateeDepartment }}</span
                    >
                  </template>
                </div>
              </div>
            </div>
          </div>

          <!-- When faculty/admin (has sections), render section cards directly (no outer card) -->
          <div v-if="isFacultyEvaluation">
            <div v-if="groupedBySection.length === 0" class="text-muted">No answers available.</div>
            <!-- Separate cards per section -->
            <div
              v-for="section in groupedBySection"
              :key="section.id"
              class="card section-card mb-3"
            >
              <div class="card-header bg-transparent py-2">
                <div class="section-title m-0">{{ section.name }}</div>
              </div>
              <div class="card-body">
                <div v-for="criteria in section.criterias" :key="criteria.id" class="mb-3">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <div class="criteria-title mb-0">{{ criteria.name }}</div>
                    <div
                      v-if="criteria.avg !== null && criteria.avg !== undefined"
                      class="badge bg-secondary text-white"
                    >
                      Avg: {{ criteria.avg }}
                    </div>
                  </div>
                  <div v-for="q in criteria.questions" :key="q.id" class="mb-3">
                    <div class="question-text">{{ q.text || q.id }}</div>
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
          </div>

          <!-- Student (legacy) view stays within a single card -->
          <div v-else class="card mb-3">
            <div class="card-body">
              <div v-if="groupedAnswers.length === 0" class="text-muted">No answers available.</div>
              <div v-for="criteria in groupedAnswers" :key="criteria.id" class="mb-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <div class="criteria-title mb-0">{{ criteria.name }}</div>
                  <div
                    v-if="criteria.avg !== null && criteria.avg !== undefined"
                    class="badge bg-secondary text-white"
                  >
                    Avg: {{ criteria.avg }}
                  </div>
                </div>
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
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick, computed, watch } from 'vue'
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'
import { useRoute, useRouter } from 'vue-router'
import { useStudentStore } from '@/store/studentStore'
import { useAuthStore } from '@/store/authStore'
import { useCriteriaStore } from '@/store/criteriaStore'
import { useSectionsStore } from '@/store/sectionsStore'
import { useQuestionStore } from '@/store/questionsStore'
import { db } from '@/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const criteriaStore = useCriteriaStore()
const questionStore = useQuestionStore()
const sectionsStore = useSectionsStore()

const loading = ref(true)
const responseDoc = ref(null)
const questionTextById = reactive({})
const groupedAnswers = ref([])
const groupedBySection = ref([]) // for faculty/admin hierarchical view
const submissions = ref([]) // list of response docs for admin
const averagesByCriteria = ref([])
const studentStore = useStudentStore()

// Chart.js setup for per-criteria averages (horizontal bar)
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend)
const criteriaChartRef = ref(null)
let criteriaChart = null
const criteriaViewMode = ref('chart')

const criteriaSummary = computed(() => {
  const items = (averagesByCriteria.value || [])
    .filter((c) => c && typeof c.avg === 'number' && !Number.isNaN(c.avg))
    .map((c) => ({ id: c.id, name: c.name || 'Criteria', avg: Number(c.avg) }))
  items.sort((a, b) => (b.avg || 0) - (a.avg || 0))
  let lastAvg = null
  let lastRank = 0
  return items.map((it, idx) => {
    if (lastAvg === null || it.avg !== lastAvg) {
      lastRank = idx + 1
      lastAvg = it.avg
    }
    return { ...it, rank: lastRank }
  })
})

const setCriteriaView = (mode) => {
  criteriaViewMode.value = mode
  const evalId = route.params.evaluationId
  const teacherId = route.params.teacherId
  try {
    localStorage.setItem(`teacherCriteriaView:${evalId}:${teacherId}`, mode)
  } catch (e) {}
}

const renderCriteriaChart = async () => {
  await nextTick()
  const canvas = criteriaChartRef.value
  if (!canvas || criteriaViewMode.value !== 'chart') return

  const labelsRaw = (criteriaSummary.value || []).map((c) => c.name)
  const labels = labelsRaw.map((n) => (n.length > 28 ? n.slice(0, 27) + '…' : n))
  const data = (criteriaSummary.value || []).map((c) => Number(c.avg?.toFixed(2)) || 0)

  try {
    if (criteriaChart) {
      criteriaChart.destroy()
      criteriaChart = null
    }
  } catch (_) {
    // ignore destroy errors
  }

  const ctx = canvas.getContext('2d')
  // compact: tight height per bar
  if (labels.length > 0) {
    const desired = Math.max(200, labels.length * 26)
    if (canvas.height !== desired) canvas.height = desired
  }

  criteriaChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Average',
          data,
          backgroundColor: '#4f46e5',
          borderRadius: 4,
          barThickness: 12,
          categoryPercentage: 0.9,
          barPercentage: 0.9,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { left: 4, right: 8, top: 4, bottom: 4 } },
      scales: {
        x: {
          min: 1,
          max: 5,
          ticks: { stepSize: 1, color: '#6b7280', font: { size: 10 } },
          grid: { color: 'rgba(0,0,0,0.05)' },
        },
        y: {
          ticks: { color: '#374151', font: { size: 11 }, autoSkip: false },
          grid: { display: false },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => {
              const i = items?.[0]?.dataIndex ?? 0
              return labelsRaw[i] || ''
            },
            label: (ctx) => `Average: ${ctx.raw}`,
          },
        },
      },
    },
  })
}

const isAdmin = computed(() =>
  (authStore.userData?.role || '').toString().toLowerCase().includes('admin'),
)

// Determine faculty/admin evaluation context based on optional route param
const evaluationTypeParam = computed(() => route.params.evaluationType)
const isFacultyEvaluation = computed(() => {
  const val = (evaluationTypeParam.value || '').toString().toLowerCase()
  return val === 'faculty' || val === 'admin'
})
const fullEvalType = computed(() => {
  const map = { admin: 'faculty-to-administrator', faculty: 'faculty-to-faculty' }
  const key = (evaluationTypeParam.value || '').toString().toLowerCase()
  return map[key] || key
})

// Treat status field as string ('Active'/'Inactive') or boolean
const isActiveStatus = (itemOrStatus) => {
  let statusVal
  if (itemOrStatus && typeof itemOrStatus === 'object') {
    const obj = itemOrStatus
    statusVal = obj.status ?? obj.statuts ?? obj.active ?? obj.isActive
  } else {
    statusVal = itemOrStatus
  }
  if (statusVal === true) return true
  if (statusVal === false) return false
  try {
    return String(statusVal ?? 'Active').toLowerCase() === 'active'
  } catch {
    return true
  }
}

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

const viewSubmission = (participantId) => {
  // navigate to this same view but include the appropriate query param so onMounted loads that response
  const query = isFacultyEvaluation.value
    ? { evaluatorId: participantId }
    : { studentId: participantId }
  router.push({
    name: route.name || 'StudentEvaluationViewMain',
    params: {
      evaluationId: route.params.evaluationId,
      teacherId: route.params.teacherId,
      evaluationType: route.params.evaluationType,
    },
    query,
  })
}

const goBack = () => {
  const evaluationId = route.params.evaluationId
  // if we're currently viewing a specific student's submission (query present) -> go back to submissions list
  if (route.query && (route.query.studentId || route.query.evaluatorId)) {
    router.push({
      name: route.name || 'StudentEvaluationViewMain',
      params: {
        evaluationId: route.params.evaluationId,
        teacherId: route.params.teacherId,
        evaluationType: route.params.evaluationType,
      },
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
  () => [route.query.studentId, route.query.evaluatorId],
  async ([newStudentId, newEvaluatorId], [oldStudentId, oldEvaluatorId]) => {
    // If switching to a specific student's view, remove the chart (canvas not rendered in that branch)
    if (newStudentId || newEvaluatorId) {
      try {
        if (criteriaChart) criteriaChart.destroy()
      } catch (_) {
        // ignore
      }
      criteriaChart = null
    }
    // when studentId is removed (admin clicked back), reload submissions list
    if (!newStudentId && !newEvaluatorId) {
      loading.value = true
      try {
        const evaluationId = route.params.evaluationId
        const teacherId = route.params.teacherId
        const rQ = isFacultyEvaluation.value
          ? query(
              collection(db, 'Responses'),
              where('evaluationId', '==', evaluationId),
              where('evaluateeId', '==', teacherId),
              where('evaluationType', '==', evaluationTypeParam.value || 'faculty'),
            )
          : query(
              collection(db, 'Responses'),
              where('evaluationId', '==', evaluationId),
              where('teacherId', '==', teacherId),
            )
        const rSnap = await getDocs(rQ)
        const studentsById = Object.fromEntries((studentStore.students || []).map((s) => [s.id, s]))
        submissions.value = rSnap.docs.map((d) => {
          const data = d.data()
          const student = data.studentId ? studentsById[data.studentId] : null
          return {
            id: d.id,
            ...data,
            participantId: isFacultyEvaluation.value ? data.evaluatorId : data.studentId,
            participantName: isFacultyEvaluation.value
              ? data.evaluatorName || data.evaluatorId
              : student
                ? student.fullName ||
                  student.name ||
                  student.displayName ||
                  student.email ||
                  student.id
                : data.studentName || data.studentId,
          }
        })
        // compute averages for header and keep shimmer until ready
        await computeAverages(submissions.value)
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
      const rQ = isFacultyEvaluation.value
        ? query(
            collection(db, 'Responses'),
            where('evaluationId', '==', evaluationId),
            where('evaluateeId', '==', teacherId),
            where('evaluatorId', '==', newEvaluatorId),
            where('evaluationType', '==', evaluationTypeParam.value || 'faculty'),
          )
        : query(
            collection(db, 'Responses'),
            where('evaluationId', '==', evaluationId),
            where('teacherId', '==', teacherId),
            where('studentId', '==', newStudentId),
          )
      const rSnap = await getDocs(rQ)
      if (rSnap.empty) responseDoc.value = null
      else responseDoc.value = rSnap.docs[0].data()

      // rebuild groupedAnswers for this response
      const answersByQuestionId = {}
      for (const a of responseDoc.value.answers || []) answersByQuestionId[a.questionId] = a.value

      if (isFacultyEvaluation.value) {
        // Fetch sections for this evaluation type, then criterias per section
        await sectionsStore.fetchSections(fullEvalType.value)
        const sections = (sectionsStore.sections || []).filter((s) => isActiveStatus(s))
        const sectionGroups = []
        for (const section of sections) {
          await criteriaStore.fetchCriterias(section.sectionId)
          const criterias = (criteriaStore.criterias || []).filter((c) => isActiveStatus(c))
          const critGroups = []
          for (const c of criterias) {
            await questionStore.fetchQuestionsByCriteria(c.criteriaId || c.id)
            const qs = (questionStore.questions || []).filter((q) => isActiveStatus(q))
            const questions = []
            let sum = 0
            let count = 0
            for (const q of qs) {
              if (answersByQuestionId.hasOwnProperty(q.id)) {
                const val = Number(answersByQuestionId[q.id])
                if (!Number.isNaN(val)) {
                  sum += val
                  count += 1
                }
                questions.push({ id: q.id, text: q.questionText, value: answersByQuestionId[q.id] })
              }
            }
            if (questions.length > 0) {
              critGroups.push({
                id: c.criteriaId,
                name: c.criteriaName || c.criteria || 'Criteria',
                questions,
                avg: count ? Number((sum / count).toFixed(2)) : null,
              })
            }
          }
          if (critGroups.length > 0) {
            sectionGroups.push({
              id: section.sectionId,
              name: section.sectionName,
              criterias: critGroups,
            })
          }
        }
        groupedBySection.value = sectionGroups
        groupedAnswers.value = []
      } else {
        // legacy student flow: flat criteria -> questions
        await criteriaStore.fetchCriterias()
        // Only consider active criterias and questions when computing averages
        const criterias = (criteriaStore.criterias || []).filter((c) => isActiveStatus(c))
        const groups = []
        for (const c of criterias) {
          await questionStore.fetchQuestionsByCriteria(c.criteriaId || c.id)
          const qs = questionStore.questions || []
          const questions = []
          let sum = 0
          let count = 0
          for (const q of qs) {
            if (answersByQuestionId.hasOwnProperty(q.id)) {
              const val = Number(answersByQuestionId[q.id])
              if (!Number.isNaN(val)) {
                sum += val
                count += 1
              }
              questions.push({ id: q.id, text: q.questionText, value: answersByQuestionId[q.id] })
            }
          }
          if (questions.length > 0) {
            groups.push({
              id: c.criteriaId,
              name: c.criteriaName || c.criteria || 'Criteria',
              questions,
              avg: count ? Number((sum / count).toFixed(2)) : null,
            })
          }
        }
        groupedAnswers.value = groups
        groupedBySection.value = []
      }
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

  if (isFacultyEvaluation.value) await criteriaStore.fetchAllCriterias()
  else await criteriaStore.fetchCriterias()
  const criterias = criteriaStore.criterias || []
  const groups = []
  for (const c of criterias) {
    await questionStore.fetchQuestionsByCriteria(c.criteriaId || c.id)
    const qs = (questionStore.questions || []).filter((q) => isActiveStatus(q))
    let weightedSum = 0
    let totalCount = 0
    for (const q of qs) {
      const st = stats[q.id]
      if (st && st.count) {
        const avg = st.sum / st.count
        weightedSum += avg * st.count
        totalCount += st.count
      }
    }
    if (totalCount > 0) {
      const cavg = weightedSum / totalCount
      groups.push({
        id: c.id,
        name: c.criteriaName || c.criteria || 'Criteria',
        avg: Number(cavg.toFixed(2)),
      })
    }
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
      // restore view mode preference for this teacher under this evaluation
      try {
        const saved = localStorage.getItem(`teacherCriteriaView:${evaluationId}:${teacherId}`)
        if (saved === 'chart' || saved === 'table') criteriaViewMode.value = saved
      } catch (_) {}
      // If a participant is present in the route, load that specific response
      if (!isFacultyEvaluation.value && routeStudentId) {
        const rQ = query(
          collection(db, 'Responses'),
          where('evaluationId', '==', evaluationId),
          where('teacherId', '==', teacherId),
          where('studentId', '==', routeStudentId),
        )
        const rSnap = await getDocs(rQ)
        responseDoc.value = rSnap.empty ? null : rSnap.docs[0].data()
      } else if (isFacultyEvaluation.value && route.query.evaluatorId) {
        const rQ = query(
          collection(db, 'Responses'),
          where('evaluationId', '==', evaluationId),
          where('evaluateeId', '==', teacherId),
          where('evaluatorId', '==', route.query.evaluatorId),
          where('evaluationType', '==', evaluationTypeParam.value || 'faculty'),
        )
        const rSnap = await getDocs(rQ)
        responseDoc.value = rSnap.empty ? null : rSnap.docs[0].data()
      } else {
        // fetch all responses for this evaluatee/evaluation and list them
        const rQ = isFacultyEvaluation.value
          ? query(
              collection(db, 'Responses'),
              where('evaluationId', '==', evaluationId),
              where('evaluateeId', '==', teacherId),
              where('evaluationType', '==', evaluationTypeParam.value || 'faculty'),
            )
          : query(
              collection(db, 'Responses'),
              where('evaluationId', '==', evaluationId),
              where('teacherId', '==', teacherId),
            )
        const rSnap = await getDocs(rQ)
        // Map studentId to name using studentStore
        const studentsById = Object.fromEntries((studentStore.students || []).map((s) => [s.id, s]))
        submissions.value = rSnap.docs.map((d) => {
          const data = d.data()
          const student = data.studentId ? studentsById[data.studentId] : null
          return {
            id: d.id,
            ...data,
            participantId: isFacultyEvaluation.value ? data.evaluatorId : data.studentId,
            participantName: isFacultyEvaluation.value
              ? data.evaluatorName || data.evaluatorId
              : student
                ? student.fullName ||
                  student.name ||
                  student.displayName ||
                  student.email ||
                  student.id
                : data.studentName || data.studentId,
          }
        })
        // compute averages per question across all submissions and keep shimmer until ready
        await computeAverages(submissions.value)
        // don't set responseDoc yet; admin should pick a student to view
        responseDoc.value = null
      }
    } else {
      // normal student or faculty flow: load the current user's own submission
      if (!currentUserId) {
        loading.value = false
        return
      }

      const rQ = isFacultyEvaluation.value
        ? query(
            collection(db, 'Responses'),
            where('evaluationId', '==', evaluationId),
            where('evaluateeId', '==', teacherId),
            where('evaluatorId', '==', currentUserId),
            where('evaluationType', '==', evaluationTypeParam.value || 'faculty'),
          )
        : query(
            collection(db, 'Responses'),
            where('evaluationId', '==', evaluationId),
            where('teacherId', '==', teacherId),
            where('studentId', '==', currentUserId),
          )
      let rSnap = await getDocs(rQ)
      // Fallback: if no student-style response and no faculty param, try faculty-style lookup
      if (rSnap.empty && !isFacultyEvaluation.value) {
        try {
          const altQ = query(
            collection(db, 'Responses'),
            where('evaluationId', '==', evaluationId),
            where('evaluateeId', '==', teacherId),
            where('evaluatorId', '==', currentUserId),
          )
          rSnap = await getDocs(altQ)
        } catch (_) {}
      }
      if (rSnap.empty) {
        responseDoc.value = null
        loading.value = false
        return
      }

      // assume one document
      const docData = rSnap.docs[0].data()
      responseDoc.value = docData
    }

    // build grouped answers
    if (responseDoc.value) {
      const answersByQuestionId = {}
      for (const a of responseDoc.value.answers || []) answersByQuestionId[a.questionId] = a.value

      if (isFacultyEvaluation.value) {
        // Sections -> Criterias -> Questions
        await sectionsStore.fetchSections(fullEvalType.value)
        const sections = sectionsStore.sections || []
        const sectionGroups = []
        for (const section of sections) {
          await criteriaStore.fetchCriterias(section.sectionId)
          const criterias = criteriaStore.criterias || []
          const critGroups = []
          for (const c of criterias) {
            await questionStore.fetchQuestionsByCriteria(c.criteriaId || c.id)
            const qs = questionStore.questions || []
            const questions = []
            let sum = 0
            let count = 0
            for (const q of qs) {
              questionTextById[q.id] = q.questionText
              if (answersByQuestionId.hasOwnProperty(q.id)) {
                const val = Number(answersByQuestionId[q.id])
                if (!Number.isNaN(val)) {
                  sum += val
                  count += 1
                }
                questions.push({ id: q.id, text: q.questionText, value: answersByQuestionId[q.id] })
              }
            }
            if (questions.length > 0) {
              critGroups.push({
                id: c.criteriaId,
                name: c.criteriaName || c.criteria || 'Criteria',
                questions,
                avg: count ? Number((sum / count).toFixed(2)) : null,
              })
            }
          }
          if (critGroups.length > 0)
            sectionGroups.push({
              id: section.sectionId,
              name: section.sectionName,
              criterias: critGroups,
            })
        }
        groupedBySection.value = sectionGroups
        groupedAnswers.value = []
      } else {
        // Student: Criteria -> Questions
        await criteriaStore.fetchCriterias()
        const criterias = (criteriaStore.criterias || []).filter((c) => isActiveStatus(c))
        const groups = []
        for (const c of criterias) {
          await questionStore.fetchQuestionsByCriteria(c.criteriaId || c.id)
          const qs = (questionStore.questions || []).filter((q) => isActiveStatus(q))
          const questions = []
          let sum = 0
          let count = 0
          for (const q of qs) {
            questionTextById[q.id] = q.questionText
            if (answersByQuestionId.hasOwnProperty(q.id)) {
              const val = Number(answersByQuestionId[q.id])
              if (!Number.isNaN(val)) {
                sum += val
                count += 1
              }
              questions.push({ id: q.id, text: q.questionText, value: answersByQuestionId[q.id] })
            }
          }
          if (questions.length > 0) {
            groups.push({
              id: c.criteriaId,
              name: c.criteriaName || c.criteria || 'Criteria',
              questions,
              avg: count ? Number((sum / count).toFixed(2)) : null,
            })
          }
        }
        groupedAnswers.value = groups
        groupedBySection.value = []
      }
    } else {
      groupedAnswers.value = []
      groupedBySection.value = []
    }
  } catch (err) {
    console.error('Failed to load submission', err)
  } finally {
    loading.value = false
  }
})

// Update or create chart whenever averages change and component is not loading
// Render/destroy chart on data or mode changes
watch([criteriaSummary, () => criteriaViewMode.value], () => {
  if (!loading.value && criteriaViewMode.value === 'chart' && criteriaSummary.value.length) {
    renderCriteriaChart()
  } else {
    try {
      if (criteriaChart) criteriaChart.destroy()
    } catch (_) {}
    criteriaChart = null
  }
})

watch(loading, (isLoading) => {
  if (!isLoading && criteriaViewMode.value === 'chart' && criteriaSummary.value.length > 0) {
    renderCriteriaChart()
  }
})

onUnmounted(() => {
  try {
    if (criteriaChart) criteriaChart.destroy()
  } catch (_) {
    // ignore
  }
  criteriaChart = null
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

/* Criteria compact card styles */
.criteria-card .card-body {
  padding: 0.6rem 0.75rem !important;
}
.criteria-card h6 {
  font-weight: 600;
}
.criteria-chart-wrap {
  position: relative;
  width: 100%;
  min-height: 200px;
}
.truncate {
  max-width: 520px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Shimmer loader */
@keyframes shimmer {
  0% {
    background-position: -400px 0;
  }
  100% {
    background-position: 400px 0;
  }
}
.skeleton {
  position: relative;
  background: #eee;
  background-image: linear-gradient(90deg, #eee 0px, #f5f5f5 40px, #eee 80px);
  background-size: 600px 100%;
  border-radius: 6px;
  animation: shimmer 1.2s infinite linear;
}
.skeleton-title {
  height: 16px;
  width: 220px;
}
.skeleton-text {
  height: 12px;
  width: 60%;
  max-width: 420px;
}
.skeleton-badge {
  height: 22px;
  width: 48px;
  border-radius: 999px;
}
</style>
