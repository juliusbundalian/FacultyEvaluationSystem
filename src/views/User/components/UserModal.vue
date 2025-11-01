<template>
  <transition name="fade">
    <div v-if="visible" class="modal-backdrop">
      <div class="modal modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content shadow-lg rounded-3">
          <div class="modal-header">
            <h5 class="modal-title">{{ isEditing ? 'Edit User' : 'Add User' }}</h5>
            <button type="button" class="btn-close" @click="attemptClose"></button>
          </div>

          <div class="modal-body">
            <div class="mb-3 form-group">
              <label class="form-label">User ID</label>
              <input
                type="text"
                v-model="form.id"
                class="form-control"
                placeholder="Enter ID (e.g. A1001)"
              />
            </div>

            <div class="mb-3 form-group">
              <label class="form-label">Name</label>
              <input
                type="text"
                v-model="form.name"
                class="form-control"
                placeholder="Enter full name"
              />
            </div>

            <div class="mb-3 form-group">
              <label class="form-label">Email</label>
              <input
                type="email"
                v-model="form.email"
                class="form-control"
                placeholder="Enter email"
              />
            </div>

            <div class="mb-3 form-group">
              <label class="form-label">Status</label>
              <select v-model="form.status" class="form-select">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div class="modal-footer">
            <Button
              variant="secondary"
              styleType="label"
              @click="attemptClose"
              class="w-md-auto"
            >
              Cancel
            </Button>
            <Button
              variant="primary-main"
              @click="saveUser"
              class="w-md-auto"
              :disabled="!isFormValid"
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { reactive, watch, computed } from 'vue'
import { useUserStore } from '@/store/userStore'
import Button from '@/components/Buttons.vue'
import regex from '@/utils/regex.js'
import {
  confirmSaveChanges,
  confirmUnsavedChanges,
  showChangesSaved,
  showLoading,
  closeLoading
} from '@/utils/swal'

export default {
  name: 'UserModal',
  components: { Button },
  props: {
    visible: Boolean,
    editUser: { type: Object, default: null }
  },
  setup(props, { emit }) {
    const userStore = useUserStore()

    const form = reactive({
      id: '',
      name: '',
      email: '',
      role: 'Admin',
      status: 'active'
    })

    const isEditing = computed(() => !!props.editUser)

    const resetForm = () => {
      form.id = ''
      form.name = ''
      form.email = ''
      form.status = 'active'
    }

    // ✅ Computed validation
    const isFormValid = computed(() => {
      const validId = regex.validateAlphaNumeric(form.id, 10) && form.id.trim() !== ''
      const validName = regex.validateAlphaNumeric(form.name, 50) && form.name.trim() !== ''
      const validEmail = regex.validateEmail(form.email)
      return validId && validName && validEmail
    })

    watch(
      () => props.editUser,
      (newVal) => {
        if (newVal) {
          Object.assign(form, newVal)
        } else {
          resetForm()
        }
      },
      { immediate: true }
    )

    const hasUnsavedChanges = computed(() => {
      if (props.editUser) {
        return (
          form.id !== props.editUser.id ||
          form.name !== props.editUser.name ||
          form.email !== props.editUser.email ||
          form.status !== props.editUser.status
        )
      }
      return form.id || form.name || form.email || form.status !== 'active'
    })

    const attemptClose = async () => {
      if (hasUnsavedChanges.value) {
        const result = await confirmUnsavedChanges()
        if (!result.isConfirmed) return
      }
      resetForm()
      emit('close')
    }

    const saveUser = async () => {
      if (!isFormValid.value) return

      const result = await confirmSaveChanges()
      if (!result.isConfirmed) return

      showLoading(isEditing.value ? 'Updating user...' : 'Saving user...')

      try {
        if (isEditing.value) {
          await userStore.updateUser(props.editUser.id, {
            id: form.id,
            name: form.name,
            email: form.email,
            role: 'Admin',
            status: form.status
          })
        } else {
          await userStore.addUser({
            id: form.id,
            name: form.name,
            email: form.email,
            role: 'Admin',
            status: form.status
          })
        }

        closeLoading()
        await showChangesSaved()
        emit('save')
        resetForm()
        emit('close')
      } catch (err) {
        closeLoading()
        Swal.fire('Error', 'Failed to save user.', 'error')
      }
    }

    return {
      form,
      isEditing,
      attemptClose,
      saveUser,
      isFormValid
    }
  }
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1050;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.modal-dialog {
  max-width: 700px;
  width: 100%;
}
</style>
