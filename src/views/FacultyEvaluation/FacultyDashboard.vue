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

      <!-- Faculty to Administrator Section -->
      <div v-if="availableAdmins.length > 0" class="mt-4">
        <div class="dashed-divider my-3"></div>
        <div class="mb-3 ch5">Administrators to Evaluate</div>

        <div class="d-grid">
          <div v-if="facultyLoading" class="text-center py-2">Loading administrators...</div>
          <div v-else>
            <ul class="list-group">
              <li
                v-for="admin in availableAdmins"
                :key="admin.id"
                class="d-flex justify-content-between align-items-center teacher-list-item"
              >
                <div>
                  <div class="ch5">
                    {{ admin.name || admin.displayName || admin.fullName || 'Administrator' }}
                  </div>
                  <div class="body2">
                    {{ admin.department || admin.position || 'Administrator' }}
                  </div>
                </div>
                <div>
                  <button
                    class="btn btn-primary btn-sm"
                    @click="startEvaluation('faculty-to-administrator', admin)"
                  >
                    Start
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Faculty to Faculty Section -->
      <div v-if="availableFaculty.length > 0" class="mt-4">
        <div class="dashed-divider my-3"></div>
        <div class="mb-3 ch5">
          Faculty to Evaluate ({{ currentUser?.department || 'Same Department' }})
        </div>

        <div class="d-grid">
          <div v-if="facultyLoading" class="text-center py-2">Loading faculty...</div>
          <div v-else>
            <ul class="list-group">
              <li
                v-for="faculty in availableFaculty"
                :key="faculty.id"
                class="d-flex justify-content-between align-items-center teacher-list-item"
              >
                <div>
                  <div class="ch5">
                    {{ faculty.name || faculty.displayName || faculty.fullName || 'Faculty' }}
                  </div>
                  <div class="body2">{{ faculty.department || faculty.position || 'Faculty' }}</div>
                </div>
                <div>
                  <button
                    class="btn btn-primary btn-sm"
                    @click="startEvaluation('faculty-to-faculty', faculty)"
                  >
                    Start
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- No Available Evaluations -->
      <div
        v-if="availableAdmins.length === 0 && availableFaculty.length === 0 && !facultyLoading"
        class="mt-4"
      >
        <div class="dashed-divider my-3"></div>
        <div class="text-center py-4 text-muted">
          <div class="ch5 mb-2">All Evaluations Complete</div>
          <div class="body1">You have evaluated all available faculty and administrators.</div>
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
    <div v-if="submittedEvaluations.length > 0" class="mt-3 w-100">
      <div class="dashed-divider mb-3"></div>
      <div class="ch5 mb-2">Completed Evaluations</div>
      <ul class="list-group">
        <li
          v-for="evaluation in submittedEvaluations"
          :key="evaluation.id"
          class="d-flex justify-content-between align-items-center teacher-list-item"
        >
          <div>
            <div class="ch5">{{ evaluation.evaluateeName }}</div>
            <div class="body2">
              {{ evaluation.evaluationType === 'faculty-to-faculty' ? 'Faculty' : 'Administrator' }}
            </div>
          </div>
          <div>
            <button
              class="btn btn-outline-primary btn-sm review-btn"
              @click="viewSubmission(evaluation)"
            >
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
import { useUserStore } from '@/store/userStore'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/authStore'
import { db } from '@/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

const evaluationStore = useEvaluationStore()
const userStore = useUserStore()
const authStore = useAuthStore()
const loading = ref(true)
const facultyLoading = ref(false)
const router = useRouter()

const availableFaculty = ref([])
const availableAdmins = ref([])
const submittedEvaluations = ref([])

const currentUser = computed(() => authStore.userData)

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
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

const startTimer = () => {
  if (_timerId.value) clearInterval(_timerId.value)

  const updateTimer = () => {
    if (activeEvaluation.value?.endDate) {
      const end = new Date(activeEvaluation.value.endDate)
      end.setHours(23, 59, 59, 999)
      const diff = end - new Date()
      remaining.value = formatRemaining(diff)
    } else {
      remaining.value = 'N/A'
    }
  }

  updateTimer()
  _timerId.value = setInterval(updateTimer, 60000) // update every minute
}

const stopTimer = () => {
  if (_timerId.value) {
    clearInterval(_timerId.value)
    _timerId.value = null
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

const loadAvailableEvaluations = async (evaluationId) => {
  if (!currentUser.value?.id || !evaluationId) return

  facultyLoading.value = true

  try {
    // Fetch all users
    await userStore.fetchUsers()
    const allUsers = userStore.users || []

    // Get current user's department
    const userDepartment = currentUser.value.department

    // Separate admins and faculty
    const admins = allUsers.filter(
      (user) => user.role === 'admin' && user.id !== currentUser.value.id,
    )

    const faculty = allUsers.filter(
      (user) =>
        user.role === 'teacher' &&
        user.department === userDepartment &&
        user.id !== currentUser.value.id,
    )

    // Check for existing responses to filter out already evaluated people
    const responsesQuery = query(
      collection(db, 'Responses'),
      where('evaluationId', '==', evaluationId),
      where('evaluatorId', '==', currentUser.value.id),
    )
    const responsesSnap = await getDocs(responsesQuery)
    const evaluatedIds = new Set(responsesSnap.docs.map((doc) => doc.data().evaluateeId))

    // Filter out already evaluated people
    availableAdmins.value = admins.filter((admin) => !evaluatedIds.has(admin.id))
    availableFaculty.value = faculty.filter((fac) => !evaluatedIds.has(fac.id))

    // Load submitted evaluations for display
    submittedEvaluations.value = responsesSnap.docs.map((doc) => {
      const data = doc.data()
      const evaluatee = allUsers.find((user) => user.id === data.evaluateeId)
      return {
        id: doc.id,
        ...data,
        evaluateeName: evaluatee?.name || evaluatee?.displayName || data.evaluateeName || 'Unknown',
      }
    })
  } catch (err) {
    console.error('Failed to load available evaluations', err)
  } finally {
    facultyLoading.value = false
  }
}

const startEvaluation = (evaluationType, evaluatee) => {
  const evalId = activeEvaluation.value?.id
  router.push({
    name: 'FacultyEvaluationForm',
    params: {
      evaluationType,
      evaluateeId: evaluatee.id,
    },
    query: {
      evaluationId: evalId,
      evaluateeName: evaluatee.name || evaluatee.displayName || evaluatee.fullName,
    },
  })
}

const viewSubmission = (evaluation) => {
  // Navigate to a review page (to be implemented)
  console.log('View submission:', evaluation)
}

// reload available evaluations when activeEvaluation becomes available
watch(activeEvaluation, (v) => {
  if (v && v.id) loadAvailableEvaluations(v.id)
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
}

.eval-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
  padding: 0 1rem;
}

.dates-range {
  color: @text-secondary;
}

.dashed-divider {
  border-top: 1px dashed @divider;
  width: 100%;
}

.teacher-list-item {
  padding: 16px 20px;
  border: 1px solid @divider;
  border-radius: 8px;
  background: white;
  margin-bottom: 8px;
  transition: all 0.2s ease;
}

.teacher-list-item:hover {
  background: @hover;
  border-color: @primary;
}

.no-eval-img {
  width: 120px;
  height: 120px;
  opacity: 0.6;
}

.review-btn {
  border-radius: 999px;
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
</style>
