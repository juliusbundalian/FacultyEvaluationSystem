<template>
  <transition name="fade">
    <div v-if="visible" class="modal-backdrop">
      <div class="modal modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content shadow-lg rounded-3">
          <div class="modal-header">
            <h5 class="modal-title">{{ isEditing ? 'Edit Faculty' : 'Add Faculty' }}</h5>
            <button type="button" class="btn-close" @click="attemptClose"></button>
          </div>

          <form class="needs-validation" novalidate @submit.prevent="saveFaculty">
            <div class="modal-body">
              <!-- Faculty ID -->
              <div class="mb-3 form-group">
                <label class="form-label">Faculty ID</label>
                <input
                  type="text"
                  v-model.trim="form.id"
                  class="form-control"
                  placeholder="Enter ID"
                  required
                />
              </div>

              <!-- Name -->
              <div class="mb-3 form-group">
                <label class="form-label">Name</label>
                <input
                  type="text"
                  v-model.trim="form.name"
                  class="form-control"
                  placeholder="Enter full name"
                  required
                />
              </div>

              <!-- Email -->
              <div class="mb-3 form-group">
                <label class="form-label">Email</label>
                <input
                  type="email"
                  v-model.trim="form.email"
                  class="form-control"
                  placeholder="Enter email"
                  required
                />
              </div>

              <!-- Department -->
              <div class="mb-3 form-group">
                <label class="form-label">Department</label>
                <select v-model="form.department" class="form-select" required>
                  <option disabled value="">Select department</option>
                  <option value="CCS">College of Computer Studies</option>
                  <option value="CHTM">College of Hospitality and Tourism Management</option>
                  <option value="CHAP">College of Health and Allied Professions</option>
                </select>
              </div>

              <!-- Status -->
              <div class="mb-3 form-group">
                <label class="form-label">Status</label>
                <select v-model="form.status" class="form-select" required>
                  <option disabled value="">Select status</option>
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
                type="submit"
                variant="primary-main"
                class="w-md-auto"
                :disabled="!isFormValid"
              >
                {{ isEditing ? 'Update' : 'Save' }}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { reactive, watch, computed } from 'vue'
import { useFacultyStore } from '@/store/facultyStore'
import Button from '@/components/Buttons.vue'
import regex from '@/utils/regex'
import {
  confirmSaveChanges,
  confirmUnsavedChanges,
  showChangesSaved,
  showLoading,
  closeLoading
} from '@/utils/swal'

export default {
  name: 'FacultyModal',
  components: { Button },
  props: {
    visible: Boolean,
    editFaculty: { type: Object, default: null }
  },
  setup(props, { emit }) {
    const facultyStore = useFacultyStore()

    const form = reactive({
      id: '',
      name: '',
      email: '',
      department: '',
      status: 'active'
    })

    const isEditing = computed(() => !!props.editFaculty)

    const resetForm = () => {
      form.id = ''
      form.name = ''
      form.email = ''
      form.department = ''
      form.status = 'active'
    }

    watch(
      () => props.editFaculty,
      (newVal) => {
        if (newVal) Object.assign(form, newVal)
        else resetForm()
      },
      { immediate: true }
    )

    // ✅ Proper field-by-field validation
    const isValidId = computed(() => regex.validateAlphaNumeric(form.id, 30) && form.id.trim() !== '')
    const isValidName = computed(() => regex.validateAlphaNumeric(form.name, 100) && form.name.trim() !== '')
    const isValidEmail = computed(() => regex.validateEmail(form.email))
    const isValidDepartment = computed(() => form.department !== '')
    const isValidStatus = computed(() => form.status !== '')

    // ✅ The button will only enable if ALL are valid
    const isFormValid = computed(() => {
      return (
        isValidId.value &&
        isValidName.value &&
        isValidEmail.value &&
        isValidDepartment.value &&
        isValidStatus.value
      )
    })

    const hasUnsavedChanges = computed(() => {
      if (props.editFaculty) {
        return (
          form.id !== props.editFaculty.id ||
          form.name !== props.editFaculty.name ||
          form.email !== props.editFaculty.email ||
          form.department !== props.editFaculty.department ||
          form.status !== props.editFaculty.status
        )
      }
      return form.id || form.name || form.email || form.department || form.status !== 'active'
    })

    const attemptClose = async () => {
      if (hasUnsavedChanges.value) {
        const result = await confirmUnsavedChanges()
        if (!result.isConfirmed) return
      }
      resetForm()
      emit('close')
    }

    const saveFaculty = async () => {
      if (!isFormValid.value) return // 🚫 prevent saving if invalid

      const result = await confirmSaveChanges()
      if (!result.isConfirmed) return

      showLoading(isEditing.value ? 'Updating faculty...' : 'Saving faculty...')

      try {
        if (isEditing.value) {
          await facultyStore.updateFaculty(props.editFaculty.id, { ...form })
        } else {
          await facultyStore.addFaculty({ ...form })
        }

        closeLoading()
        await showChangesSaved()
        emit('save')
        resetForm()
        emit('close')
      } catch (err) {
        closeLoading()
        Swal.fire('Error', 'Failed to save faculty.', 'error')
      }
    }

    return {
      form,
      isEditing,
      isFormValid,
      attemptClose,
      saveFaculty
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
