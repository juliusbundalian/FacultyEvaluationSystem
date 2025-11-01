<template>
  <transition name="fade">
    <div v-if="visible" class="modal-backdrop">
      <div class="modal modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content shadow-lg rounded-3">
          <div class="modal-header">
            <h5 class="modal-title">{{ isEditing ? 'Edit Evaluation' : 'New Evaluation' }}</h5>
            <button type="button" class="btn-close" @click="attemptClose"></button>
          </div>

          <form @submit.prevent="saveEvaluation">
            <div class="modal-body">
              <!-- Evaluation Name -->
              <div class="mb-3 form-group">
                <label class="form-label">Evaluation Name</label>
                <input
                  type="text"
                  v-model.trim="form.evaluationName"
                  class="form-control"
                  placeholder="Enter evaluation name"
                  required
                />
              </div>

              <!-- Evaluation Description -->
              <div class="mb-3 form-group">
                <label class="form-label">Description (optional)</label>
                <textarea
                  v-model="form.evaluationDescription"
                  class="form-control"
                  placeholder="Enter a short description for the evaluation"
                  rows="3"
                ></textarea>
                <div class="form-text text-muted">Max 1000 characters</div>
              </div>

              <!-- Start Date -->
              <div class="mb-3 form-group">
                <label class="form-label">Start Date</label>
                <input
                  type="date"
                  v-model="form.startDate"
                  class="form-control"
                  :min="today"
                  @change="onStartDateChange"
                  required
                />
              </div>

              <!-- End Date -->
              <div class="mb-3 form-group">
                <label class="form-label">End Date</label>
                <input
                  type="date"
                  v-model="form.endDate"
                  class="form-control"
                  :min="form.startDate || today"
                  required
                />
              </div>

              <!-- Status -->
              <div class="mb-3 form-group">
                <label class="form-label">Status</label>
                <select v-model="form.status" class="form-select" required>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div class="modal-footer">
              <Button
                variant="secondary"
                styleType="label"
                @click.prevent="attemptClose"
                class="w-md-auto"
                type="button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary-main"
                class="w-md-auto"
                :disabled="!isFormValid"
              >
                Save
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { ref, watch, computed } from 'vue'
import { useEvaluationStore } from '@/store/evaluationStore'
import Button from '@/components/Buttons.vue'
import regex from '@/utils/regex'
import Swal from 'sweetalert2'
import {
  confirmSaveChanges,
  showChangesSaved,
  confirmUnsavedChanges,
  showLoading,
  closeLoading,
} from '@/utils/swal'

export default {
  name: 'EvaluationModal',
  components: { Button },
  props: {
    visible: Boolean,
    isEditing: Boolean,
    evaluation: Object,
  },
  setup(props, { emit }) {
    const evaluationStore = useEvaluationStore()

    const form = ref({
      id: null,
      evaluationName: '',
      evaluationDescription: '',
      startDate: '',
      endDate: '',
      status: 'Active',
    })

    const today = new Date().toISOString().split('T')[0]

    const resetForm = () => {
      form.value = {
        id: null,
        evaluationDescription: '',
        evaluationName: '',
        startDate: '',
        endDate: '',
        status: 'Active',
      }
    }

    // Load evaluation when editing
    watch(
      () => props.evaluation,
      (newVal) => {
        if (newVal && props.isEditing) {
          form.value = { ...newVal }
        } else {
          resetForm()
        }
      },
      { immediate: true },
    )

    // 🔹 Automatically adjust end date if start date changes
    const onStartDateChange = () => {
      if (form.value.endDate && new Date(form.value.endDate) < new Date(form.value.startDate)) {
        form.value.endDate = form.value.startDate
      }
    }

    // 🔹 Computed validation states
    const isValidName = computed(
      () =>
        regex.validateAlphaNumeric(form.value.evaluationName, 100) &&
        form.value.evaluationName.trim() !== '',
    )

    const isValidDescription = computed(() => {
      // optional, but limit length to 1000 chars
      return (form.value.evaluationDescription || '').trim().length <= 1000
    })

    const isValidStartDate = computed(
      () => form.value.startDate && new Date(form.value.startDate) >= new Date(today),
    )

    const isValidEndDate = computed(
      () => form.value.endDate && new Date(form.value.endDate) >= new Date(form.value.startDate),
    )

    const isValidStatus = computed(
      () => form.value.status === 'Active' || form.value.status === 'Inactive',
    )

    const isFormValid = computed(
      () =>
        isValidName.value &&
        isValidStartDate.value &&
        isValidEndDate.value &&
        isValidStatus.value &&
        isValidDescription.value,
    )

    // 🔹 Check for overlapping evaluations
    const hasOverlap = () => {
      const start = new Date(form.value.startDate)
      const end = new Date(form.value.endDate)

      return evaluationStore.evaluations.some((evalItem) => {
        if (props.isEditing && evalItem.id === form.value.id) return false // skip itself
        const existingStart = new Date(evalItem.startDate)
        const existingEnd = new Date(evalItem.endDate)
        return (
          (start >= existingStart && start <= existingEnd) ||
          (end >= existingStart && end <= existingEnd) ||
          (start <= existingStart && end >= existingEnd)
        )
      })
    }

    const hasUnsavedChanges = computed(() => {
      if (props.isEditing && props.evaluation) {
        return (
          form.value.evaluationName.trim() !== props.evaluation.evaluationName ||
          form.value.startDate !== props.evaluation.startDate ||
          form.value.endDate !== props.evaluation.endDate ||
          form.value.status !== props.evaluation.status
        )
      }
      return (
        form.value.evaluationName.trim() !== '' ||
        form.value.startDate !== '' ||
        form.value.endDate !== '' ||
        form.value.status !== 'Active'
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

    const saveEvaluation = async () => {
      if (!isFormValid.value) {
        Swal.fire('Invalid Form', 'Please fill in all fields correctly.', 'warning')
        return
      }

      if (hasOverlap()) {
        Swal.fire(
          'Overlap Detected',
          'The selected evaluation period overlaps with another existing evaluation.',
          'error',
        )
        return
      }

      const result = await confirmSaveChanges()
      if (!result.isConfirmed) return

      showLoading(props.isEditing ? 'Updating Evaluation...' : 'Saving Evaluation...')

      try {
        if (props.isEditing && form.value.id) {
          await evaluationStore.updateEvaluation(form.value.id, { ...form.value })
        } else {
          await evaluationStore.addEvaluation({ ...form.value })
        }

        closeLoading()
        await showChangesSaved()
        emit('save')
        resetForm()
        emit('close')
      } catch (err) {
        closeLoading()
        Swal.fire('Error', 'Failed to save evaluation. Please try again.', 'error')
      }
    }

    return {
      form,
      today,
      isFormValid,
      saveEvaluation,
      attemptClose,
      onStartDateChange,
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
  max-width: 800px;
  width: 100%;
}
</style>
