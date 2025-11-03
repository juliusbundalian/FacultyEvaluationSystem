<template>
  <div class="container-fluid py-3">
    <div class="row g-3">
      <div class="col-12 col-lg-5">
        <div class="card h-100">
          <div class="card-body">
            <div class="d-flex align-items-center gap-3 mb-3">
              <img :src="avatarUrl" class="rounded-circle" style="width:64px;height:64px;object-fit:cover" />
              <div>
                <div class="ch5 mb-0">{{ userData?.name || 'Student' }}</div>
                <div class="text-muted">{{ userData?.role || 'Student' }}</div>
              </div>
            </div>

            <div class="row g-3">
              <div class="col-12">
                <div class="text-muted caption">Email</div>
                <div class="body1">{{ user?.email || '—' }}</div>
              </div>
              <div class="col-6">
                <div class="text-muted caption">Student ID</div>
                <div class="body1">{{ studentId || '—' }}</div>
              </div>
              <div class="col-6">
                <div class="text-muted caption">Year / Section</div>
                <div class="body1">{{ yearSection }}</div>
              </div>
              <div class="col-12">
                <div class="text-muted caption">Program</div>
                <div class="body1">{{ userData?.program || '—' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-12 col-lg-7">
        <div class="card h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <div class="ch6 mb-0">Enrolled Subjects</div>
              <div v-if="enrollmentLoading" class="spinner-border spinner-border-sm text-primary" />
            </div>

            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Subject Code</th>
                    <th>Subject Name</th>
                    <th>Teacher</th>
                    <th>Semester</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="en in enrollments" :key="en.id">
                    <td>{{ en.subjectCode }}</td>
                    <td>{{ en.subjectName }}</td>
                    <td>{{ en.teacherName }}</td>
                    <td>{{ en.semester }}</td>
                  </tr>
                  <tr v-if="!enrollmentLoading && enrollments.length === 0">
                    <td colspan="4" class="text-muted text-center">No enrollments found.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-3 mt-1">
      <div class="col-12 d-flex justify-content-end">
        <Button @click="openPassword">Change Password</Button>
      </div>
    </div>

    <ChangePasswordModal :visible="showPassword" @close="showPassword = false" />
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/store/authStore'
import { useEnrollmentStore } from '@/store/enrollmentStore'
import Button from '@/components/Buttons.vue'
import ChangePasswordModal from '@/components/ChangePasswordModal.vue'

const authStore = useAuthStore()
const { user, userData } = storeToRefs(authStore)

const enrollmentStore = useEnrollmentStore()
const { enrollments, loading: enrollmentLoading } = storeToRefs(enrollmentStore)

const avatarUrl = computed(() => {
  const name = encodeURIComponent(userData.value?.name || 'User')
  return authStore.user?.photoURL || `https://ui-avatars.com/api/?name=${name}`
})

const studentId = computed(() => {
  return (
    userData.value?.id ||
    userData.value?.userId ||
    userData.value?.studentId ||
    user.value?.uid ||
    ''
  )
})

const yearSection = computed(() => {
  const y = userData.value?.yearLevel || userData.value?.year || '—'
  const s = userData.value?.section || ''
  return s ? `${y} - ${s}` : `${y}`
})

onMounted(async () => {
  if (studentId.value) {
    await enrollmentStore.fetchEnrollmentsByStudentId(studentId.value)
  }
})

watch(studentId, async (v, p) => {
  if (v && v !== p) await enrollmentStore.fetchEnrollmentsByStudentId(v)
})

const showPassword = ref(false)
const openPassword = () => (showPassword.value = true)
</script>

<style lang="less" scoped>
.card,
.card .card-body {
  background-color: transparent !important;
}
/* Make enrolled subjects table match the page background (no white fills) */
.table,
.table thead th,
.table tbody td {
  background-color: transparent !important;
}
</style>
