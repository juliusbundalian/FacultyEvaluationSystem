<template>
  <div class="container-fluid py-3">
    <div class="row g-3">
      <div class="col-12">
        <div class="card h-100">
          <div class="card-body">
            <div class="ch6 mb-3">Profile Information</div>
            <div class="row g-3">
              <div class="col-12 col-md-6">
                <div class="text-muted caption">Full Name</div>
                <div class="body1">{{ userData?.name || '—' }}</div>
              </div>
              <div class="col-12 col-md-6">
                <div class="text-muted caption">Email</div>
                <div class="body1">{{ user?.email || '—' }}</div>
              </div>
              <div class="col-12 col-md-6">
                <div class="text-muted caption">Role</div>
                <div class="body1">{{ userData?.role || 'Admin' }}</div>
              </div>
              <div class="col-12 col-md-6">
                <div class="text-muted caption">Date Created</div>
                <div class="body1">{{ formattedCreated }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-3 mt-1">
      <div class="col-12">
        <div class="card">
          <div class="card-body">
            <div class="ch6 mb-3">Password</div>
            <div class="d-flex flex-column gap-3">
              <div>
                <label class="form-label">Current Password</label>
                <div class="position-relative">
                  <input
                    v-model="currentPassword"
                    :type="showCurrent ? 'text' : 'password'"
                    class="form-control pe-5"
                    placeholder="Enter current password"
                    autocomplete="current-password"
                  />
                  <button type="button" class="eye-btn icon-btn--md btn--transparent" @click="showCurrent = !showCurrent" :aria-label="showCurrent ? 'Hide password' : 'Show password'">
                    <span class="icon">{{ showCurrent ? 'visibility_off' : 'visibility' }}</span>
                  </button>
                </div>
                <div v-if="currentError" class="text-danger small mt-1">{{ currentError }}</div>
              </div>
              <div>
                <label class="form-label">New Password</label>
                <div class="position-relative">
                  <input
                    v-model="newPassword"
                    :type="showNew ? 'text' : 'password'"
                    class="form-control pe-5"
                    placeholder="Enter new password"
                    autocomplete="new-password"
                  />
                  <button type="button" class="eye-btn icon-btn--md btn--transparent" @click="showNew = !showNew" :aria-label="showNew ? 'Hide password' : 'Show password'">
                    <span class="icon">{{ showNew ? 'visibility_off' : 'visibility' }}</span>
                  </button>
                </div>
                <div v-if="newError" class="text-danger small mt-1">{{ newError }}</div>
              </div>
              <div>
                <label class="form-label">Confirm New Password</label>
                <div class="position-relative">
                  <input
                    v-model="confirmPassword"
                    :type="showConfirm ? 'text' : 'password'"
                    class="form-control pe-5"
                    placeholder="Confirm new password"
                    autocomplete="new-password"
                  />
                  <button type="button" class="eye-btn icon-btn--md btn--transparent" @click="showConfirm = !showConfirm" :aria-label="showConfirm ? 'Hide password' : 'Show password'">
                    <span class="icon">{{ showConfirm ? 'visibility_off' : 'visibility' }}</span>
                  </button>
                </div>
              </div>

              <div v-if="confirmError" class="text-danger small mt-1">{{ confirmError }}</div>
              <div v-if="error" class="text-danger small mt-1">{{ error }}</div>

              <div class="d-flex gap-2 justify-content-end">
                <Button :disabled="submitting" @click="onSubmit">
                  {{ submitting ? 'Saving…' : 'Save Changes' }}
                </Button>
                <Button styleType="outline" variant="secondary" @click="onCancel">Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/store/authStore'
import Button from '@/components/Buttons.vue'
import { auth } from '@/firebase'
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { showLoading, closeLoading, showChangesSaved } from '@/utils/swal'

const authStore = useAuthStore()
const { user, userData } = storeToRefs(authStore)

const avatarUrl = computed(() => {
  const name = encodeURIComponent(userData.value?.name || 'User')
  return authStore.user?.photoURL || `https://ui-avatars.com/api/?name=${name}`
})

const formattedCreated = computed(() => {
  // Prefer Firestore userData.createdAt if present, else fallback to auth metadata
  try {
    const ts = userData.value?.createdAt
    let d
    if (ts?.toDate) d = ts.toDate()
    else if (typeof ts === 'number') d = new Date(ts)
    else if (authStore.user?.metadata?.creationTime) d = new Date(authStore.user.metadata.creationTime)
    if (!d || Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return '—'
  }
})

// Password form state
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showCurrent = ref(false)
const showNew = ref(false)
const showConfirm = ref(false)
const error = ref('')
const currentError = ref('')
const newError = ref('')
const confirmError = ref('')
const submitting = ref(false)

function resetErrors() {
  error.value = ''
  currentError.value = ''
  newError.value = ''
  confirmError.value = ''
}

function runLocalValidation() {
  // Collect all field errors in one pass (no short-circuit)
  if (!currentPassword.value) {
    currentError.value = 'Current password is required.'
  }
  if (!newPassword.value) {
    newError.value = 'New password is required.'
  } else if (newPassword.value.length < 6) {
    newError.value = 'New password must be at least 6 characters.'
  }
  if (!confirmPassword.value) {
    confirmError.value = 'Please confirm your new password.'
  } else if (newPassword.value !== confirmPassword.value) {
    confirmError.value = 'New password and confirmation do not match.'
  }
}

function resetForm() {
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  showCurrent.value = false
  showNew.value = false
  showConfirm.value = false
  // Clear all validation and general errors
  resetErrors()
}

async function onSubmit() {
  // Reset errors and validate all fields concurrently with re-auth
  resetErrors()

  const user = auth.currentUser
  if (!user || !user.email) {
    error.value = 'No authenticated user.'
    return
  }

  // Start re-auth immediately if we have a current password; run local validation in parallel
  let reauthPromise = Promise.resolve('skipped')
  if (currentPassword.value) {
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword.value)
      reauthPromise = reauthenticateWithCredential(user, credential)
    } catch (e) {
      applyErrorFromCode(e)
    }
  }

  runLocalValidation()

  try {
    await reauthPromise
  } catch (e) {
    applyErrorFromCode(e)
  }

  // Abort if any errors are present
  if (currentError.value || newError.value || confirmError.value || error.value) {
    return
  }

  submitting.value = true
  showLoading('Saving…')
  try {
    await updatePassword(user, newPassword.value)
    closeLoading()
    await showChangesSaved()
    resetForm()
  } catch (e) {
    console.error('Password update failed:', e)
    applyErrorFromCode(e)
    closeLoading()
  } finally {
    submitting.value = false
  }
}

function onCancel() {
  resetForm()
}

function applyErrorFromCode(e) {
  const code = (e?.code || '').toString()
  if (code.includes('wrong-password') || code.includes('invalid-credential')) {
    currentError.value = 'Current password is incorrect.'
    return
  }
  if (code.includes('weak-password')) {
    newError.value = 'New password is too weak.'
    return
  }
  if (code.includes('requires-recent-login')) {
    error.value = 'Please log in again and retry.'
    return
  }
  error.value = 'Failed to update password.'
}
</script>

<style scoped>
.form-control {
  background-color: transparent !important;
}
.eye-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  padding: 4px;
  border: none;
  outline: none;
  box-shadow: none;
  background: transparent;
}
.eye-btn:focus,
.eye-btn:active {
  outline: none;
  box-shadow: none;
}
</style>
