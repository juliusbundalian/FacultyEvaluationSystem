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
      <div class="mb-3 ch5">
        {{ isFaculty ? 'Faculty & Administrators to Evaluate' : 'To be Evaluated' }}
      </div>

      <div class="d-grid">
        <!-- Inline list of evaluatees (teachers for students, faculty/admins for faculty) -->
        <div v-if="teachersLoading" class="text-center py-2">
          Loading {{ isFaculty ? 'faculty & administrators' : 'teachers' }}...
        </div>

        <!-- Faculty view: split lists -->
        <template v-else-if="isFaculty">
          <!-- Admins pending -->
          <div class="mb-2">
            <div class="ch5 mb-2">Administrators</div>
            <div v-if="pendingAdmins.length === 0" class="text-muted small mb-2">
              No administrators to evaluate.
            </div>
            <ul v-else class="list-group">
              <li
                v-for="evaluatee in pendingAdmins"
                :key="evaluatee.id"
                class="d-flex justify-content-between align-items-center teacher-list-item"
              >
                <div>
                  <div class="ch5">{{ getEvaluateeName(evaluatee) }}</div>
                  <div class="body2">
                    {{ evaluatee.role }}
                    {{ evaluatee.department ? `• ${evaluatee.department}` : '' }}
                  </div>
                </div>
                <div>
                  <button class="btn btn-primary btn-sm" @click="startForTeacher(evaluatee)">
                    Start
                  </button>
                </div>
              </li>
            </ul>
          </div>

          <!-- Faculty pending -->
          <div class="mt-3">
            <div class="ch5 mb-2">Faculty</div>
            <div v-if="pendingFaculty.length === 0" class="text-muted small mb-2">
              No faculty to evaluate.
            </div>
            <ul v-else class="list-group">
              <li
                v-for="evaluatee in pendingFaculty"
                :key="evaluatee.id"
                class="d-flex justify-content-between align-items-center teacher-list-item"
              >
                <div>
                  <div class="ch5">{{ getEvaluateeName(evaluatee) }}</div>
                  <div class="body2">
                    {{ evaluatee.role }}
                    {{ evaluatee.department ? `• ${evaluatee.department}` : '' }}
                  </div>
                </div>
                <div>
                  <button class="btn btn-primary btn-sm" @click="startForTeacher(evaluatee)">
                    Start
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </template>

        <!-- Student view: single list of teachers -->
        <div v-else>
          <div v-if="teachersToEvaluate.length === 0" class="text-center text-muted py-2">
            No teachers to evaluate at the moment.
          </div>
          <ul v-else class="list-group">
            <li
              v-for="evaluatee in teachersToEvaluate"
              :key="evaluatee.id"
              class="d-flex justify-content-between align-items-center teacher-list-item"
            >
              <div>
                <div class="ch5">
                  {{ getEvaluateeName(evaluatee) }}
                </div>
                <div class="body2">{{ evaluatee.subjectCode }} — {{ evaluatee.subjectName }}</div>
              </div>
              <div>
                <button class="btn btn-primary btn-sm" @click="startForTeacher(evaluatee)">
                  Start
                </button>
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
    <div class="mt-3 w-100">
      <div class="dashed-divider mb-3"></div>
      <div class="ch5 mb-2">Evaluated</div>

      <!-- Faculty view: split evaluated -->
      <template v-if="isFaculty">
        <div class="mb-2">
          <div class="ch6 fw-semibold mb-2">Administrators</div>
          <div v-if="submittedAdmins.length === 0" class="text-muted small mb-2">
            No administrator submissions yet.
          </div>
          <ul v-else class="list-group">
            <li
              v-for="evaluatee in submittedAdmins"
              :key="evaluatee.id"
              class="d-flex justify-content-between align-items-center teacher-list-item"
            >
              <div>
                <div class="ch5">{{ getEvaluateeName(evaluatee) }}</div>
                <div class="body2">
                  {{ evaluatee.role }} {{ evaluatee.department ? `• ${evaluatee.department}` : '' }}
                </div>
              </div>
              <div>
                <button
                  class="btn btn-outline-primary btn-sm review-btn"
                  @click="viewSubmission(evaluatee)"
                >
                  Review
                </button>
              </div>
            </li>
          </ul>
        </div>
        <div class="mt-3">
          <div class="ch6 fw-semibold mb-2">Faculty</div>
          <div v-if="submittedFaculty.length === 0" class="text-muted small mb-2">
            No faculty submissions yet.
          </div>
          <ul v-else class="list-group">
            <li
              v-for="evaluatee in submittedFaculty"
              :key="evaluatee.id"
              class="d-flex justify-content-between align-items-center teacher-list-item"
            >
              <div>
                <div class="ch5">{{ getEvaluateeName(evaluatee) }}</div>
                <div class="body2">
                  {{ evaluatee.role }} {{ evaluatee.department ? `• ${evaluatee.department}` : '' }}
                </div>
              </div>
              <div>
                <button
                  class="btn btn-outline-primary btn-sm review-btn"
                  @click="viewSubmission(evaluatee)"
                >
                  Review
                </button>
              </div>
            </li>
          </ul>
        </div>
      </template>

      <!-- Student view: single evaluated list -->
      <template v-else>
        <ul v-if="submittedTeachers.length > 0" class="list-group">
          <li
            v-for="evaluatee in submittedTeachers"
            :key="evaluatee.id"
            class="d-flex justify-content-between align-items-center teacher-list-item"
          >
            <div>
              <div class="ch5">{{ getEvaluateeName(evaluatee) }}</div>
              <div class="body2">{{ evaluatee.subjectCode }} — {{ evaluatee.subjectName }}</div>
            </div>
            <div>
              <button
                class="btn btn-outline-primary btn-sm review-btn"
                @click="viewSubmission(evaluatee)"
              >
                Review
              </button>
            </div>
          </li>
        </ul>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import { useEvaluationStore } from '@/store/evaluationStore'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/authStore'
import { useEnrollmentStore } from '@/store/enrollmentStore'
import { useUserStore } from '@/store/userStore'
import { db } from '@/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

const evaluationStore = useEvaluationStore()
const authStore = useAuthStore()
const enrollmentStore = useEnrollmentStore()
const userStore = useUserStore()
const loading = ref(true)
const router = useRouter()

const enrollments = ref([])
const teachersToEvaluate = ref([]) // legacy student flow
const teachersLoading = ref(false)
const submittedTeachers = ref([]) // legacy student flow
// Faculty view split lists
const pendingAdmins = ref([])
const pendingFaculty = ref([])
const submittedAdmins = ref([])
const submittedFaculty = ref([])

// Computed property to check if user is faculty
const isFaculty = computed(() => {
  return authStore.role === 'Faculty' || authStore.role === 'Admin' || authStore.role === 'teacher'
})

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
    obj.teacherId ||
    obj.teacherID ||
    (obj.teacher && obj.teacher.id) ||
    obj.userId ||
    obj.id ||
    null
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

const loadFacultyToEvaluate = async (evaluationId) => {
  teachersLoading.value = true
  const facultyId = authStore.userData?.id || authStore.user?.uid
  const facultyDepartment = authStore.userData?.department

  console.log('🎓 Faculty Evaluation Debug:', {
    facultyId,
    facultyDepartment,
    userRole: authStore.role,
    userData: authStore.userData,
  })

  if (!facultyId) {
    console.warn('❌ No faculty ID found')
    teachersToEvaluate.value = []
    teachersLoading.value = false
    return
  }

  try {
    // Fetch all users
    const usersQuery = collection(db, 'Users')
    const usersSnap = await getDocs(usersQuery)
    const allUsers = usersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

    console.log('👥 All users loaded:', allUsers.length, allUsers)

    // Filter users based on faculty evaluation rules:
    // 1. All administrators can be evaluated by any faculty
    // 2. Faculty in the same department can evaluate each other
    const availableEvaluatees = allUsers.filter((user) => {
      // Don't evaluate yourself
      if (user.id === facultyId) {
        console.log('🚫 Excluding self:', user.id)
        return false
      }

      // Can evaluate all administrators
      if (user.role === 'Admin') {
        console.log('✅ Including admin:', user)
        return true
      }

      // Can evaluate faculty in same department
      if (
        (user.role === 'Faculty' || user.role === 'teacher') &&
        user.department === facultyDepartment
      ) {
        console.log('✅ Including same-dept faculty/teacher:', user)
        return true
      }

      console.log(
        '🚫 Excluding user:',
        user,
        'Reason: role =',
        user.role,
        'dept =',
        user.department,
      )
      return false
    })

    console.log('🎯 Available evaluatees after filtering:', availableEvaluatees)

    // Check for existing submissions
    const respQ = query(
      collection(db, 'Responses'),
      where('evaluationId', '==', evaluationId),
      where('evaluatorId', '==', facultyId),
    )
    const respSnap = await getDocs(respQ)

    console.log(
      '📝 Existing responses:',
      respSnap.docs.map((d) => d.data()),
    )

    const submittedEvaluateeIds = new Set(
      respSnap.docs.map((d) => d.data().evaluateeId).filter((id) => id != null && id !== ''),
    )

    console.log('🔒 Already submitted evaluatee IDs:', Array.from(submittedEvaluateeIds))

    // Split into pending and submitted, then by role
    const pending = availableEvaluatees.filter((u) => !submittedEvaluateeIds.has(u.id))
    const submitted = availableEvaluatees.filter((u) => submittedEvaluateeIds.has(u.id))

    pendingAdmins.value = pending.filter((u) => u.role === 'Admin')
    pendingFaculty.value = pending.filter((u) => u.role === 'Faculty' || u.role === 'teacher')
    submittedAdmins.value = submitted.filter((u) => u.role === 'Admin')
    submittedFaculty.value = submitted.filter((u) => u.role === 'Faculty' || u.role === 'teacher')

    console.log('📋 Final results:', {
      pendingAdmins: pendingAdmins.value,
      pendingFaculty: pendingFaculty.value,
      submittedAdmins: submittedAdmins.value,
      submittedFaculty: submittedFaculty.value,
    })
  } catch (err) {
    console.error('Failed to load faculty evaluatees:', err)
    teachersToEvaluate.value = []
  } finally {
    teachersLoading.value = false
  }
}

const loadEvaluatees = async (evaluationId) => {
  if (isFaculty.value) {
    await loadFacultyToEvaluate(evaluationId)
  } else {
    await loadTeachersToEvaluate(evaluationId)
  }
}

const getEvaluateeName = (evaluatee) => {
  if (isFaculty.value) {
    // For faculty evaluations, use the user's name fields
    return evaluatee.firstName && evaluatee.lastName
      ? `${evaluatee.firstName} ${evaluatee.lastName}`
      : evaluatee.name || evaluatee.email || 'Faculty/Admin'
  } else {
    // For student evaluations, use the teacher name fields
    return evaluatee.teacherName || evaluatee.teacher || evaluatee.name || 'Teacher'
  }
}

const startEvaluation = (evaluatee) => {
  const evalId = activeEvaluation.value?.id

  if (isFaculty.value) {
    // For faculty evaluations, use evaluateeId instead of teacherId
    const evaluationType = evaluatee.role === 'Admin' ? 'admin' : 'faculty'
    router.push({
      name: 'StudentEvaluation',
      params: {
        evaluationId: evalId,
        teacherId: evaluatee.id,
        evaluationType,
      },
    })
  } else {
    // For student evaluations, use existing logic
    const tid = getTeacherKey(evaluatee)
    router.push({ name: 'StudentEvaluation', params: { evaluationId: evalId, teacherId: tid } })
  }
}

const startForTeacher = (evaluatee) => {
  startEvaluation(evaluatee)
}

const viewSubmission = (evaluatee) => {
  const evalId = activeEvaluation.value?.id

  if (isFaculty.value) {
    // For faculty evaluations
    const evaluationType = evaluatee.role === 'Admin' ? 'admin' : 'faculty'
    router.push({
      name: 'StudentEvaluationView',
      params: {
        evaluationId: evalId,
        teacherId: evaluatee.id,
        evaluationType,
      },
    })
  } else {
    // For student evaluations
    const tid = getTeacherKey(evaluatee)
    router.push({ name: 'StudentEvaluationView', params: { evaluationId: evalId, teacherId: tid } })
  }
}

// reload evaluatee list when activeEvaluation becomes available
watch(activeEvaluation, (v) => {
  if (v && v.id) loadEvaluatees(v.id)
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
