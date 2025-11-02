<template>
  <transition name="fade">
    <div v-if="visible" class="modal-backdrop">
      <div class="modal modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content shadow-lg rounded-3">
          <div class="modal-header">
            <h5 class="modal-title">{{ isEditMode ? 'Edit Question' : 'Add Question' }}</h5>
            <button type="button" class="btn-close" @click="attemptClose"></button>
          </div>

          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label fw-bold">Question Text</label>
              <textarea
                v-model="form.questionText"
                class="form-control"
                rows="4"
                placeholder="Enter the question here..."
              ></textarea>
            </div>

            <div class="mb-3">
              <label class="form-label fw-bold">Status</label>
              <select v-model="form.status" class="form-select">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div class="modal-footer">
            <Button variant="secondary" styleType="label" @click="attemptClose" class="w-md-auto">
              Cancel
            </Button>
            <Button variant="primary-main" @click="saveQuestion" class="w-md-auto"> Save </Button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { computed, reactive, watch } from 'vue'
import { useQuestionStore } from '@/store/questionsStore'
import Button from '@/components/Buttons.vue'
import {
  confirmSaveChanges,
  showChangesSaved,
  confirmUnsavedChanges,
  showLoading,
  closeLoading,
} from '@/utils/swal'

export default {
  name: 'QuestionModal',
  components: { Button },
  props: {
    visible: Boolean,
    criteriaId: String,
    editQuestion: { type: Object, default: null },
  },
  setup(props, { emit }) {
    const questionStore = useQuestionStore()

    const form = reactive({
      questionText: '',
      status: 'active',
    })

    const isEditMode = computed(() => !!props.editQuestion)

    watch(
      () => props.editQuestion,
      (newQ) => {
        if (newQ) {
          form.questionText = newQ.questionText
          form.status = newQ.statuts
        } else {
          form.questionText = ''
          form.status = 'active'
        }
      },
      { immediate: true },
    )

    const hasUnsavedChanges = computed(() => {
      if (props.editQuestion) {
        return (
          form.questionText.trim() !== props.editQuestion.questionText ||
          form.status !== props.editQuestion.statuts
        )
      }
      return form.questionText.trim() !== '' || form.status !== 'active'
    })

    const attemptClose = async () => {
      if (hasUnsavedChanges.value) {
        const result = await confirmUnsavedChanges()
        if (!result.isConfirmed) return
      }
      emit('close')
    }

    const saveQuestion = async () => {
      if (!form.questionText.trim()) return

      const result = await confirmSaveChanges()
      if (result.isConfirmed) {
        showLoading('Saving question...')
        try {
          if (isEditMode.value) {
            await questionStore.updateQuestion(props.editQuestion.id, {
              questionText: form.questionText.trim(),
              statuts: form.status,
            })
          } else {
            // Create new question - let the store handle ID generation
            const payload = {
              criteriaId: props.criteriaId,
              questionText: form.questionText.trim(),
              statuts: form.status,
            }
            await questionStore.addQuestion(payload)
          }

          closeLoading()
          await showChangesSaved()
          emit('save')
          emit('close')
        } catch (err) {
          closeLoading()
          Swal.fire('Error', 'Failed to save question. Please try again.', 'error')
        }
      }
    }

    return { form, isEditMode, saveQuestion, attemptClose }
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
