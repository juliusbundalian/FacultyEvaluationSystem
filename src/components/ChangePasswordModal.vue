<template>
  <Modal :model-value="visible" @update:modelValue="$emit('close')">
    <template #header>
      <h5 class="modal-title mb-0">Change Password</h5>
    </template>

    <template #modal-body>
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
      </div>
    </template>

    <template #footer>
      <div class="d-flex gap-2 justify-content-end w-100">
            <Button styleType="outline" variant="secondary" @click="onCancel">Cancel</Button>
        <Button :disabled="submitting" @click="onSubmit">
          {{ submitting ? 'Updating…' : 'Update Password' }}
        </Button>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import Modal from '@/components/Modal.vue'
import { auth } from '@/firebase'
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { showLoading, closeLoading } from '@/utils/swal'

const props = defineProps({
  visible: { type: Boolean, default: false },
})

const emit = defineEmits(['close'])

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
  // Do not short-circuit; collect all field errors together
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

async function onSubmit() {
  // Reset and validate all fields together
  resetErrors()

  const user = auth.currentUser
  if (!user || !user.email) {
    error.value = 'No authenticated user.'
    return
  }

  // Start re-auth promise immediately so wrong password can be surfaced alongside other errors
  let reauthPromise = Promise.resolve('skipped')
  if (currentPassword.value) {
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword.value)
      reauthPromise = reauthenticateWithCredential(user, credential)
    } catch (e) {
      // Should be rare; map any immediate construction errors
      applyErrorFromCode(e)
    }
  }

  // Run local synchronous validation without blocking re-auth
  runLocalValidation()

  // Await the re-auth attempt and map any wrong-password errors
  try {
    await reauthPromise
  } catch (e) {
    applyErrorFromCode(e)
  }

  // If any errors exist after both checks, do not proceed to update
  if (currentError.value || newError.value || confirmError.value || error.value) {
    return
  }

  submitting.value = true
  showLoading('Updating password…')
  try {
    await updatePassword(user, newPassword.value)
    closeLoading()
    emit('close')
  } catch (e) {
    console.error('Password update failed:', e)
    applyErrorFromCode(e)
    closeLoading()
  } finally {
    submitting.value = false
    resetForm()
  }
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

function resetForm() {
  // Clear inputs, toggles, and all validation messages
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  showCurrent.value = false
  showNew.value = false
  showConfirm.value = false
  error.value = ''
  currentError.value = ''
  newError.value = ''
  confirmError.value = ''
}

function onCancel() {
  resetForm()
  emit('close')
}

// Safety: whenever modal is hidden (via Cancel, X, or outside click), reset the form
watch(
  () => props.visible,
  (v) => {
    if (!v) resetForm()
  }
)
</script>

<style scoped>
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
