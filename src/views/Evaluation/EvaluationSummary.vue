<template>
  <div class="evaluation-summary">
    <div class="card mb-3 header-card">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="ch4 mb-1">{{ evaluation?.evaluationName || 'Evaluation' }}</div>
            <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
              <div class="small text-muted">
                {{ formatDate(evaluation?.startDate) }} — {{ formatDate(evaluation?.endDate) }}
              </div>
              <span v-if="statusText" class="badge rounded-pill" :class="statusClass">{{ statusText }}</span>
            </div>

            <div class="fw-semibold mb-1">Description</div>
            <div class="body1 text-muted">
              {{ evaluation?.evaluationDescription || 'No description available.' }}
            </div>
          </div>

          <div class="text-end">
            <div class="timer-badge">
              <span class="icon me-1" style="font-size: 18px">timer</span>
              {{ timeRemaining }}
            </div>
            <div class="mt-2">
              <button class="btn btn-secondary btn-sm" @click="goBack">Back</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row stats-row mb-3">
      <div class="col-md-4">
        <div class="stat-card">
          <div class="stat-icon bg-info"><span class="icon">group</span></div>
          <div>
            <div class="small text-muted">Teachers</div>
            <div class="h4 mb-0 text-info">{{ facultyStore.facultyCount }}</div>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="stat-card">
          <div class="stat-icon bg-warning"><span class="icon">groups</span></div>
          <div>
            <div class="small text-muted">Students</div>
            <div class="h4 mb-0 text-warning">{{ studentStore.studentCount }}</div>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="stat-card">
          <div class="stat-icon bg-success"><span class="icon">question_answer</span></div>
          <div>
            <div class="small text-muted">Number of Questions</div>
            <div class="h4 mb-0 text-success">{{ numberOfQuestions }}</div>
          </div>
        </div>
      </div>
    </div>

    

    <div class="card mb-3">
      <div class="card-body">
        <h5 class="mb-3">Evaluated Teachers</h5>

        <div v-if="teachers.length === 0" class="text-muted">No teacher data available.</div>
        <ul v-else class="list-group">
          <li
            v-for="t in teachers"
            :key="t.id"
            class="d-flex justify-content-between align-items-center teacher-list-item"
          >
            <div>
              <div class="ch5 mb-0">{{ t.name || t.teacherName || t.id }}</div>
              <div class="body2 text-muted">
                {{ t.subjectCode || '' }} {{ t.subjectName ? '— ' + t.subjectName : '' }}
              </div>
            </div>
            <div>
              <button
                class="btn btn-outline-primary btn-sm rounded-pill review-btn"
                @click="viewTeacher(t.id)"
              >
                Review
              </button>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, onBeforeUnmount, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEvaluationStore } from '@/store/evaluationStore'
import { useCriteriaStore } from '@/store/criteriaStore'
import { useQuestionStore } from '@/store/questionsStore'
import { useFacultyStore } from '@/store/facultyStore'
import { useStudentStore } from '@/store/studentStore'
import { db } from '@/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import Chart from 'chart.js/auto'

const route = useRoute()
const router = useRouter()
const evaluationStore = useEvaluationStore()
const criteriaStore = useCriteriaStore()
const questionStore = useQuestionStore()
const facultyStore = useFacultyStore()
const studentStore = useStudentStore()

const loading = ref(true)
const evaluation = ref(null)
const now = ref(new Date())
let nowInterval = null
const totalResponses = ref(0)
const groupedStats = ref([])
const teachers = ref([])
const evaluatedTeacherCount = ref(0)
const timeRemaining = ref('N/A')
const doughnutRef = ref(null)
const barRef = ref(null)
const numberOfQuestions = ref(0)
let doughnutChart = null
let barChart = null

const formatDate = (d) => {
  if (!d) return 'N/A'
  const date = new Date(d)
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

const computeStatus = (e) => {
  try {
    if (!e) return 'Unknown'
    const current = new Date(now.value)
    const start = e.startDate ? new Date(e.startDate) : null
    const end = e.endDate ? new Date(e.endDate) : null
    if (start) start.setHours(0, 0, 0, 0)
    if (end) end.setHours(23, 59, 59, 999)
    if (start && end) {
      if (current < start) return 'Upcoming'
      if (current >= start && current <= end) return 'Active'
      return 'Closed'
    }
    if (start && !end) return current < start ? 'Upcoming' : 'Active'
    if (!start && end) return current <= end ? 'Active' : 'Closed'
    return 'Unknown'
  } catch (err) {
    return 'Unknown'
  }
}

const statusText = computed(() => computeStatus(evaluation.value))
const statusClass = computed(() => {
  const s = (statusText.value || '').toLowerCase()
  if (s === 'active') return 'bg-success text-white'
  if (s === 'upcoming') return 'bg-secondary text-white'
  if (s === 'closed') return 'bg-danger text-white'
  return 'bg-light text-muted'
})

onMounted(async () => {
  loading.value = true
  try {
    const evaluationId = route.params.evaluationId


    // subscribe to real-time evaluation updates so status/time reflect automatically
    evaluationStore.subscribeEvaluations()
    // initial fetch (in case snapshot lags)
    await evaluationStore.fetchEvaluations()
    evaluation.value =
      (evaluationStore.evaluations || []).find((e) => e.id === evaluationId) || null

    // update current time every 30s to refresh status/timeRemaining
    nowInterval = setInterval(() => (now.value = new Date()), 30000)

    // fetch responses for this evaluation
    const rQ = query(collection(db, 'Responses'), where('evaluationId', '==', evaluationId))
    const rSnap = await getDocs(rQ)
    const responses = rSnap.docs.map((d) => d.data())
    totalResponses.value = responses.length

    const updateRemaining = () => {
      if (evaluation.value && evaluation.value.endDate) {
        const end = new Date(evaluation.value.endDate)
        end.setHours(23, 59, 59, 999)
        const diff = end - new Date(now.value)
        if (diff <= 0) timeRemaining.value = 'Closed'
        else {
          const hrs = Math.floor(diff / (1000 * 60 * 60))
          const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
          timeRemaining.value = `${hrs}h ${mins}m`
        }
      } else timeRemaining.value = 'N/A'
    }
    updateRemaining()
    // keep timeRemaining in sync when now or evaluation changes
    watch([now, evaluation], updateRemaining)

    // build teacher counts
    const teacherMap = {}
    for (const r of responses) {
      const tid = r.teacherId
      teacherMap[tid] = (teacherMap[tid] || 0) + 1
    }

    // fetch faculties and students (authoritative system-wide counts)
    await facultyStore.fetchFaculty()
    await studentStore.fetchStudents()
    const faculties = facultyStore.faculties || []
    teachers.value = Object.keys(teacherMap).map((tid) => {
      const f = faculties.find((x) => x.id === tid) || { id: tid, name: tid }
      return {
        id: tid,
        name: f.name || f.teacherName || f.displayName || tid,
        count: teacherMap[tid],
      }
    })

    evaluatedTeacherCount.value = teachers.value.filter((t) => (t.count || 0) > 0).length

    // Build question map and accumulate answers
    await criteriaStore.fetchCriterias()
    const criterias = criteriaStore.criterias || []

    // map questionId -> { text, criteriaId }
    const questionInfo = {}
    for (const c of criterias) {
      await questionStore.fetchQuestionsByCriteria(c.id)
      const qs = questionStore.questions || []
      for (const q of qs) {
        questionInfo[q.id] = { text: q.questionText, criteriaId: c.id }
      }
    }

    // accumulate sums and counts per question
    const stats = {}
    for (const r of responses) {
      for (const a of r.answers || []) {
        const qid = a.questionId
        const val = Number(a.value) || 0
        if (!stats[qid]) stats[qid] = { sum: 0, count: 0 }
        stats[qid].sum += val
        stats[qid].count += 1
      }
    }

    // build grouped stats per criteria
    const groups = []
    for (const c of criterias) {
      const questions = []
      let criteriaSum = 0
      let criteriaCount = 0
      for (const qid in questionInfo) {
        if (questionInfo[qid].criteriaId !== c.id) continue
        const info = questionInfo[qid]
        const s = stats[qid]
        const avg = s && s.count ? s.sum / s.count : null
        if (avg !== null) {
          criteriaSum += avg
          criteriaCount += 1
        }
        questions.push({ id: qid, text: info.text || qid, avg })
      }
      const cavg = criteriaCount ? criteriaSum / criteriaCount : null
      if (questions.length > 0)
        groups.push({ id: c.id, name: c.name || c.criteria || 'Criteria', avg: cavg, questions })
    }

    groupedStats.value = groups

    // compute number of questions
    let qCount = 0
    for (const g of groups) {
      qCount += (g.questions || []).length
    }
    numberOfQuestions.value = qCount

  // render charts after DOM update (general charts)
    await nextTick()
    try {
      console.log('Creating charts...', {
        totalResponses: totalResponses.value,
        teachers: teachers.value.length,
      })
      // wait for refs (defensive) — retry up to 2s
      const waitForRef = async (r, ms = 2000, interval = 100) => {
        const start = Date.now()
        while (Date.now() - start < ms) {
          if (r.value) return true
          // eslint-disable-next-line no-await-in-loop
          await new Promise((res) => setTimeout(res, interval))
        }
        return !!r.value
      }

      const haveDoughnut = await waitForRef(doughnutRef)
      const haveBar = await waitForRef(barRef)

      if (!haveDoughnut) console.warn('doughnutRef still not available after wait')
      if (!haveBar) console.warn('barRef still not available after wait')

      if (doughnutRef.value) {
        const enrolledCount = await getEnrolledCount(evaluationId)
        const evaluatedCount = totalResponses.value
        const notEvaluated = Math.max(0, enrolledCount - evaluatedCount)
        if (doughnutChart) doughnutChart.destroy()
        doughnutChart = new Chart(doughnutRef.value.getContext('2d'), {
          type: 'doughnut',
          data: {
            labels: ['Evaluated', 'Not Evaluated'],
            datasets: [
              { data: [evaluatedCount, notEvaluated], backgroundColor: ['#4caf50', '#e0e0e0'] },
            ],
          },
        })
      } else {
        console.warn('doughnutRef not found — attempting to create canvas dynamically')
        // try to create a canvas and append it to the analytics container
        const analyticsContainer = document.querySelector('.evaluation-summary .card .card-body')
        if (analyticsContainer) {
          const canvas = document.createElement('canvas')
          canvas.id = 'evaluatedDoughnut_dynamic'
          canvas.width = 200
          canvas.height = 200
          analyticsContainer
            .querySelector('.row')
            ?.insertBefore(canvas, analyticsContainer.querySelector('.row').firstChild)
          try {
            const enrolledCount = await getEnrolledCount(evaluationId)
            const evaluatedCount = totalResponses.value
            const notEvaluated = Math.max(0, enrolledCount - evaluatedCount)
            doughnutChart = new Chart(canvas.getContext('2d'), {
              type: 'doughnut',
              data: {
                labels: ['Evaluated', 'Not Evaluated'],
                datasets: [
                  { data: [evaluatedCount, notEvaluated], backgroundColor: ['#4caf50', '#e0e0e0'] },
                ],
              },
            })
            console.log('Doughnut chart rendered on dynamic canvas')
          } catch (err) {
            console.error('Failed to render dynamic doughnut chart', err)
          }
        } else console.warn('analyticsContainer not found for dynamic doughnut')
      }

      if (barRef.value) {
        const evaluated = teachers.value.filter((t) => (t.count || 0) > 0).length
        const pending = Math.max(0, teachers.value.length - evaluated)
        if (barChart) barChart.destroy()
        barChart = new Chart(barRef.value.getContext('2d'), {
          type: 'bar',
          data: {
            labels: ['Evaluated', 'Pending'],
            datasets: [
              {
                label: 'Teachers',
                data: [evaluated, pending],
                backgroundColor: ['#2196f3', '#ffb74d'],
              },
            ],
          },
          options: { scales: { y: { beginAtZero: true, precision: 0 } } },
        })
      } else {
        console.warn('barRef not found — attempting to create canvas dynamically')
        const analyticsContainer = document.querySelector('.evaluation-summary .card .card-body')
        if (analyticsContainer) {
          const canvas = document.createElement('canvas')
          canvas.id = 'teachersBar_dynamic'
          canvas.width = 200
          canvas.height = 200
          analyticsContainer.querySelector('.row')?.appendChild(canvas)
          try {
            const evaluated = teachers.value.filter((t) => (t.count || 0) > 0).length
            const pending = Math.max(0, teachers.value.length - evaluated)
            barChart = new Chart(canvas.getContext('2d'), {
              type: 'bar',
              data: {
                labels: ['Evaluated', 'Pending'],
                datasets: [
                  {
                    label: 'Teachers',
                    data: [evaluated, pending],
                    backgroundColor: ['#2196f3', '#ffb74d'],
                  },
                ],
              },
              options: { scales: { y: { beginAtZero: true, precision: 0 } } },
            })
            console.log('Bar chart rendered on dynamic canvas')
          } catch (err) {
            console.error('Failed to render dynamic bar chart', err)
          }
        } else console.warn('analyticsContainer not found for dynamic bar')
      }
    } catch (err) {
      console.error('Failed to render charts', err)
    }
  } catch (err) {
    console.error('Failed to load evaluation summary', err)
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  try {
    if (doughnutChart) doughnutChart.destroy()
  } catch (e) {}
  try {
    if (barChart) barChart.destroy()
  } catch (e) {}
  if (nowInterval) {
    clearInterval(nowInterval)
    nowInterval = null
  }
  evaluationStore.unsubscribeEvaluations()
})

const getEnrolledCount = async (evaluationId) => {
  // best-effort: count enrollments (students) that are linked to this evaluation via subjects if available
  // fallback: use students count
  try {
    // try to count distinct studentIds from Enrollments
    const q = query(collection(db, 'Enrollments'))
    const snap = await getDocs(q)
    const enrolls = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    const unique = new Set(enrolls.map((e) => e.studentId).filter(Boolean))
    return unique.size
  } catch (err) {
    console.error('Failed to fetch enrolled count', err)
    return 0
  }
}

const viewTeacher = (teacherId) => {
  // route to StudentEvaluationView inside Main layout so sidebar/topbar remain
  const evalId = route.params.evaluationId
  router.push({ name: 'StudentEvaluationViewMain', params: { evaluationId: evalId, teacherId } })
}

const goBack = () => {
  // navigate back to the main evaluation list under /main
  router.push('/main/evaluation')
}

// (Criteria Summary toggle is intentionally removed on this page per request)
</script>

<style scoped lang="less">
@import '../../styles/index.less';

.evaluation-summary .card {
  overflow: visible;
}

.header-card .card-body {
  padding: 1.5rem;
}
.timer-badge {
  .badge-label;
  background: @warning;
  color: @text-primary;
  padding: 4px 12px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  /* prevent the badge from shrinking when the title is long */
  flex: 0 0 auto;
  white-space: nowrap;
  min-width: 88px;
  max-width: 240px;
  justify-content: center;
}

.stats-row {
  margin-top: 0.6rem;
}
.stat-card {
  display: flex;
  gap: 1rem;
  align-items: center;
  border: 1px solid @divider;
  border-radius: 8px;
  padding: 1rem;
}
.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #0b2545;
  font-size: 1.25rem;
}
.stat-icon.bg-info {
  background: #e6f7ff;
  color: #06b6d4;
}
.stat-icon.bg-warning {
  background: #fff4e6;
  color: #f59e0b;
}
.stat-icon.bg-success {
  background: #ecfdf5;
  color: #22c55e;
}

.teacher-list-item {
  border-radius: 8px;
  margin-bottom: 0.6rem;
  border: 1px solid @divider;
  padding: 1rem;
}
.review-btn {
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
}

/* Criteria compact card styles */
/* (Removed criteria-card/table styles from this page) */

/* typography tweaks to match other views */
.ch4 {
  color: @text-primary;
}
.ch5 {
  color: @text-primary;
}
.body1 {
  color: @text-primary;
}
.body2 {
  color: @text-secondary;
}
</style>
