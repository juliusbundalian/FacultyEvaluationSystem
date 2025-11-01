<template>
  <div class="eval-page">
    <!-- Header area (kept minimal - card shows active evaluation) -->

    <!-- Loading -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary mb-2" role="status"></div>
      <div class="text-muted">Loading evaluation...</div>
    </div>

    <!-- Active Evaluation Card -->
    <div v-else-if="activeEvaluation" class="">
      <div class="d-flex align-items-start justify-content-between">
        <div>
          <div class="ch4">{{ activeEvaluation.evaluationName }}</div>
          <div class="body1 dates-range">
            {{ formatDate(activeEvaluation.startDate) }} –
            {{ formatDate(activeEvaluation.endDate) }}
          </div>
        </div>
        <div v-if="remaining" class="timer-badge">
          <span class="icon me-1" style="font-size: 18px">timer</span>
          {{ remaining }}
        </div>
      </div>

      <div class="mt-3">
        <div class="ch5">Description</div>
        <div class="body1">{{ activeEvaluation.evaluationDescription || '' }}</div>
      </div>

      <div class="dashed-divider my-3"></div>
      <div class="mb-3 ch5">To be Evaluated</div>

      <div class="d-grid">
        <!-- Inline list of teachers to evaluate (replacing modal) -->
        <div v-if="teachersLoading" class="text-center py-2">Loading teachers...</div>
        <div v-else>
          <div v-if="teachersToEvaluate.length === 0" class="text-center text-muted py-2">
            No teachers to evaluate at the moment.
          </div>
          <ul v-else class="list-group">
            <li
              v-for="t in teachersToEvaluate"
              :key="t.id"
              class="d-flex justify-content-between align-items-center teacher-list-item"
            >
              <div>
                <div class="ch5">
                  {{ t.teacherName || t.teacher || t.name || 'Teacher' }}
                </div>
                <div class="body2">{{ t.subjectCode }} — {{ t.subjectName }}</div>
              </div>
              <div>
                <button class="btn btn-primary btn-sm" @click="startForTeacher(t)">Start</button>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- No Active Evaluation -->
    <div v-else class="text-center py-5">
      <img
        src="https://cdn-icons-png.flaticon.com/512/4076/4076500.png"
        alt="No Evaluation"
        class="no-eval-img mb-3"
      />
      <h6 class="fw-semibold text-dark">No Active Evaluation</h6>
      <p class="small text-muted mb-0">
        Please check back later when a new evaluation period begins.
      </p>
    </div>

    <!-- Submitted evaluations list -->
    <div v-if="submittedTeachers.length > 0" class="mt-3 w-100">
      <div class="dashed-divider mb-3"></div>
      <div class="ch5 mb-2">Evaluated</div>
      <ul class="list-group">
        <li
          v-for="t in submittedTeachers"
          :key="t.id"
          class="d-flex justify-content-between align-items-center teacher-list-item"
        >
          <div>
            <div class="ch5">{{ t.teacherName || t.teacher || t.name || 'Teacher' }}</div>
            <div class="body2">{{ t.subjectCode }} — {{ t.subjectName }}</div>
          </div>
          <div>
            <button class="btn btn-outline-primary btn-sm review-btn" @click="viewSubmission(t)">
              Review
            </button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import { useEvaluationStore } from '@/store/evaluationStore'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/authStore'
import { useEnrollmentStore } from '@/store/enrollmentStore'
import { db } from '@/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

const evaluationStore = useEvaluationStore()
const authStore = useAuthStore()
const enrollmentStore = useEnrollmentStore()
const loading = ref(true)
const router = useRouter()

const enrollments = ref([])
const teachersToEvaluate = ref([])
const teachersLoading = ref(false)
const submittedTeachers = ref([])

const activeEvaluation = computed(() => {
  const evals = evaluationStore.evaluations || []
  const now = new Date()

  return evals.find((ev) => {
    const start = ev.startDate ? new Date(ev.startDate) : null
    const end = ev.endDate ? new Date(ev.endDate) : null

    if (start) start.setHours(0, 0, 0, 0)
    if (end) end.setHours(23, 59, 59, 999)

    return (!start || now >= start) && (!end || now <= end)
  })
})

// countdown timer
const remaining = ref('')
const _timerId = { value: null }

const formatRemaining = (ms) => {
  if (ms <= 0) return 'Closed'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
}

const updateRemaining = () => {
  const ev = activeEvaluation.value
  if (!ev || !ev.endDate) {
    remaining.value = ev ? 'No end date' : ''
    return
  }
  const end = new Date(ev.endDate)
  // normalize to end-of-day so countdown lasts through the entire end date
  end.setHours(23, 59, 59, 999)
  const now = new Date()
  const diff = end - now
  remaining.value = formatRemaining(diff)
  // once time elapsed, watcher on activeEvaluation will stop timer
}


const startTimer = () => {
  stopTimer()
  updateRemaining()
  _timerId.value = setInterval(updateRemaining, 1000)
}

const stopTimer = () => {
  if (_timerId.value) {
    clearInterval(_timerId.value)
    _timerId.value = null
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const goToEvaluation = (id) => {
  router.push({ name: 'StudentEvaluation', params: { evaluationId: id, teacherId: '' } })
}

const getTeacherKey = (obj) => {
  if (!obj) return null
  const key =
    obj.teacherId || obj.teacherID || (obj.teacher && obj.teacher.id) || obj.userId || obj.id || null
  return key != null && key !== '' ? String(key) : null
}

const loadTeachersToEvaluate = async (evaluationId) => {
  teachersLoading.value = true
  const studentId = authStore.userData?.id || authStore.user?.uid
  if (!studentId) {
    enrollments.value = []
    teachersToEvaluate.value = []
    teachersLoading.value = false
    return
  }

  await enrollmentStore.fetchEnrollmentsByStudentId(studentId)
  const allEnrolls = enrollmentStore.enrollments || []
  try {
    const respQ = query(
      collection(db, 'Responses'),
      where('evaluationId', '==', evaluationId),
      where('studentId', '==', studentId),
    )
    const respSnap = await getDocs(respQ)
    // Collect only valid teacher ids (ignore missing/empty)
    const submittedTeacherIds = new Set(
      respSnap.docs
        .map((d) => {
          const val = d.data().teacherId
          return val != null && val !== '' ? String(val) : null
        })
        .filter((v) => v !== null),
    )

    teachersToEvaluate.value = allEnrolls.filter((e) => {
      const tid = getTeacherKey(e)
      // If no teacher key in enrollment, we can't match it to any submission — show it.
      if (!tid) return true
      return !submittedTeacherIds.has(tid)
    })

    // build submitted list from enrollments where teacher has submission
    submittedTeachers.value = allEnrolls.filter((e) => {
      const tid = getTeacherKey(e)
      return !!tid && submittedTeacherIds.has(tid)
    })
  } catch (err) {
    console.error('Failed to check previous responses', err)
    teachersToEvaluate.value = allEnrolls
  } finally {
    teachersLoading.value = false
  }
}

const startForTeacher = (teacher) => {
  const evalId = activeEvaluation.value?.id
  const tid = getTeacherKey(teacher)
  router.push({ name: 'StudentEvaluation', params: { evaluationId: evalId, teacherId: tid } })
}

const viewSubmission = (teacher) => {
  const evalId = activeEvaluation.value?.id
  const tid = getTeacherKey(teacher)
  router.push({ name: 'StudentEvaluationView', params: { evaluationId: evalId, teacherId: tid } })
}

// reload teacher list when activeEvaluation becomes available
watch(activeEvaluation, (v) => {
  if (v && v.id) loadTeachersToEvaluate(v.id)
  // start/stop countdown
  if (v) startTimer()
  else stopTimer()
})

onMounted(async () => {
  try {
    evaluationStore.subscribeEvaluations()
    // start timer if active evaluation already available
    if (activeEvaluation.value) startTimer()
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  stopTimer()
  evaluationStore.unsubscribeEvaluations()
})
</script>

<style scoped lang="less">
@import '../../styles/index.less';
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

.dashed-divider {
  border-top: 1px dashed @divider;
  margin: 0.25rem 0 1rem 0;
}

.teacher-list-item {
  border-radius: 8px;
  margin-bottom: 0.6rem;
  border: 1px solid @divider;
}

.teacher-list-item {
  padding: 1rem 1rem;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

/* match StudentEvaluation typography more closely */
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

.dates-range {
  color: @text-secondary;
}

/* 🧾 No eval illustration */
.no-eval-img {
  width: 110px;
  opacity: 0.8;
}
</style>
