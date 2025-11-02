<template>
  <div class="container-fluid py-3">
    <div class="row g-3">
      <div class="col-12">
        <div class="card h-100">
          <div class="card-body">
            <div class="d-flex align-items-center gap-3 mb-3">
              <img :src="avatarUrl" class="rounded-circle" style="width:64px;height:64px;object-fit:cover" />
              <div>
                <div class="ch5 mb-0">{{ userData?.name || 'Faculty' }}</div>
                <div class="text-muted">{{ roleDisplay }}</div>
              </div>
            </div>

            <div class="row g-3">
              <div class="col-12 col-md-6">
                <div class="text-muted caption">Email</div>
                <div class="body1">{{ user?.email || '—' }}</div>
              </div>
              <div class="col-12 col-md-6">
                <div class="text-muted caption">Faculty ID</div>
                <div class="body1">{{ facultyId || '—' }}</div>
              </div>
              <div class="col-12 col-md-6">
                <div class="text-muted caption">Department</div>
                <div class="body1">{{ userData?.department || '—' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <div class="row g-3 mt-1">
      <div class="col-12">
        <div class="card">
          <div class="card-body d-flex justify-content-end">
            <Button iconLeft="lock" @click="openPassword">Change Password</Button>
          </div>
        </div>
      </div>
    </div>

    <ChangePasswordModal :visible="showPassword" @close="showPassword = false" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/store/authStore'
import Button from '@/components/Buttons.vue'
import ChangePasswordModal from '@/components/ChangePasswordModal.vue'

const authStore = useAuthStore()
const { user, userData } = storeToRefs(authStore)

const avatarUrl = computed(() => {
  const name = encodeURIComponent(userData.value?.name || 'User')
  return authStore.user?.photoURL || `https://ui-avatars.com/api/?name=${name}`
})

const roleDisplay = computed(() => {
  const r = (userData.value?.role || 'Faculty').toString()
  if (/teacher/i.test(r)) return 'Teacher'
  if (/faculty/i.test(r)) return 'Faculty'
  return r
})

const facultyId = computed(() => userData.value?.facultyId || userData.value?.employeeId || user.value?.uid || '')

const showPassword = ref(false)
const openPassword = () => (showPassword.value = true)
</script>
