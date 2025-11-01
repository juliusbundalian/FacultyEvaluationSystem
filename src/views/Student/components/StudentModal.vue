<template>
  <transition name="fade">
    <div v-if="visible" class="modal-backdrop">
      <div class="modal modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content shadow-lg rounded-3">
          <div class="modal-header">
            <h5 class="modal-title">{{ isEditing ? 'Edit Student' : 'Add Student' }}</h5>
            <button type="button" class="btn-close" @click="attemptClose"></button>
          </div>

          <form class="needs-validation" novalidate @submit.prevent="saveStudent">
            <div class="modal-body">
              <!-- Student ID -->
              <div class="mb-3 form-group">
                <label class="form-label">Student ID</label>
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
                  <option value="College of Computer Studies">College of Computer Studies</option>
                  <option value="College of Hospitality and Tourism Management">College of Hospitality and Tourism Management</option>
                  <option value="College of Health and Allied Professions">College of Health and Allied Professions</option>
                </select>
              </div>

              <!-- Program -->
              <div class="mb-3 form-group">
                <label class="form-label">Program</label>
                <select
                  v-model="form.program"
                  class="form-select"
                  :disabled="!form.department"
                  required
                >
                  <option disabled value="">Select program</option>
                  <option
                    v-for="p in availablePrograms"
                    :key="p.value"
                    :value="p.value"
                  >
                    {{ p.label }}
                  </option>
                </select>
              </div>

              <!-- Year Level -->
              <div class="mb-3 form-group">
                <label class="form-label">Year Level</label>
                <select v-model="form.yearLevel" class="form-select" required>
                  <option disabled value="">Select year level</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>

              <!-- Status -->
              <div class="mb-3 form-group">
                <label class="form-label">Status</label>
                <select v-model="form.status" class="form-select" required>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div class="modal-footer">
              <Button variant="secondary" styleType="label" @click="attemptClose" class="w-md-auto">
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
import { useStudentStore } from '@/store/studentStore'
import Button from '@/components/Buttons.vue'
import regex from '@/utils/regex'
import {
  confirmSaveChanges,
  confirmUnsavedChanges,
  showChangesSaved,
  showLoading,
  closeLoading,
} from '@/utils/swal'

export default {
  name: 'StudentModal',
  components: { Button },
  props: {
    visible: Boolean,
    editStudent: { type: Object, default: null },
  },
  setup(props, { emit }) {
    const studentStore = useStudentStore()

    const form = reactive({
      id: '',
      name: '',
      email: '',
      department: '',
      program: '',
      yearLevel: '',
      status: 'active',
    })

    const isEditing = computed(() => !!props.editStudent)

    // Department → Program mapping
    const programsByDepartment = {
      CCS: [
        { value: 'BSCS', label: 'BSCS (Bachelor of Science in Computer Science)' },
        { value: 'BSIS', label: 'BSIS (Bachelor of Science in Information System)' },
      ],
      CHTM: [
        { value: 'BSTM', label: 'BSTM (Bachelor of Science in Tourism Management)' },
        { value: 'BSHM', label: 'BSHM (Bachelor of Science in Hospitality Management)' },
      ],
      CHAP: [
        { value: 'BSN', label: 'BSN (Bachelor of Science in Nursing)' },
      ],
    }

    const availablePrograms = computed(() => {
      return programsByDepartment[form.department] || []
    })

    // Reset form
    const resetForm = () => {
      form.id = ''
      form.name = ''
      form.email = ''
      form.department = ''
      form.program = ''
      form.yearLevel = ''
      form.status = 'active'
    }

    watch(
      () => props.editStudent,
      (newVal) => {
        if (newVal) Object.assign(form, newVal)
        else resetForm()
      },
      { immediate: true }
    )

    // ✅ Validation using regex util
    const isValidId = computed(() => regex.validateAlphaNumeric(form.id, 30) && form.id.trim() !== '')
    const isValidName = computed(() => regex.validateAlphaNumeric(form.name, 100) && form.name.trim() !== '')
    const isValidEmail = computed(() => regex.validateEmail(form.email))
    const isValidDepartment = computed(() => form.department !== '')
    const isValidProgram = computed(() => form.program !== '')
    const isValidYearLevel = computed(() => form.yearLevel !== '')
    const isValidStatus = computed(() => form.status !== '')

    const isFormValid = computed(() =>
      isValidId.value &&
      isValidName.value &&
      isValidEmail.value &&
      isValidDepartment.value &&
      isValidProgram.value &&
      isValidYearLevel.value &&
      isValidStatus.value
    )

    // Detect unsaved changes
    const hasUnsavedChanges = computed(() => {
      if (props.editStudent) {
        return (
          form.id !== props.editStudent.id ||
          form.name !== props.editStudent.name ||
          form.email !== props.editStudent.email ||
          form.department !== props.editStudent.department ||
          form.program !== props.editStudent.program ||
          form.yearLevel !== props.editStudent.yearLevel ||
          form.status !== props.editStudent.status
        )
      }
      return (
        form.id ||
        form.name ||
        form.email ||
        form.department ||
        form.program ||
        form.yearLevel ||
        form.status !== 'active'
      )
    })

    const attemptClose = async () => {
      if (hasUnsavedChanges.value) {
        const result = await confirmUnsavedChanges()
        if (!result.isConfirmed) return
      }
      resetForm()
      emit('close')
    }

    const saveStudent = async () => {
      if (!isFormValid.value) return

      const result = await confirmSaveChanges()
      if (!result.isConfirmed) return

      showLoading(isEditing.value ? 'Updating student...' : 'Saving student...')

      try {
        if (isEditing.value) {
          await studentStore.updateStudent(props.editStudent.id, { ...form })
        } else {
          await studentStore.addStudent({ ...form })
        }

        closeLoading()
        await showChangesSaved()
        emit('save')
        resetForm()
        emit('close')
      } catch (err) {
        closeLoading()
        Swal.fire('Error', 'Failed to save student.', 'error')
      }
    }

    return {
      form,
      isEditing,
      isFormValid,
      attemptClose,
      saveStudent,
      availablePrograms,
    }
  },
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
