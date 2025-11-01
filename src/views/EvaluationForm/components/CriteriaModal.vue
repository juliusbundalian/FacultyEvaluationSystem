<template>
  <transition name="fade">
    <div v-if="visible" class="modal-backdrop">
      <div class="modal modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content shadow-lg rounded-3">
          <div class="modal-header">
            <h5 class="modal-title">{{ isEditing ? 'Edit Criteria' : 'New Criteria' }}</h5>
            <button type="button" class="btn-close" @click="attemptClose"></button>
          </div>

          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label fw-bold">Criteria Name</label>
              <input
                type="text"
                v-model="form.criteriaName"
                class="form-control"
                placeholder="Enter criteria name"
              />
            </div>

            <div class="mb-3">
              <label class="form-label fw-bold">Status</label>
              <select v-model="form.status" class="form-select">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div class="modal-footer">
            <Button variant="secondary" styleType="label" @click="attemptClose" class="w-md-auto">
              Cancel
            </Button>
            <Button variant="primary-main" @click="saveCriteria" class="w-md-auto">
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { ref, watch, computed } from 'vue'
import { useCriteriaStore } from '@/store/criteriaStore'
import Button from '@/components/Buttons.vue'
import {
  confirmSaveChanges,
  showChangesSaved,
  confirmUnsavedChanges,
  showLoading,
  closeLoading,
} from '@/utils/swal'

export default {
  name: 'CriteriaModal',
  components: { Button },
  props: {
    visible: Boolean,
    isEditing: Boolean,
    criteria: Object,
  },
  setup(props, { emit }) {
    const criteriaStore = useCriteriaStore()
    const form = ref({ id: null, criteriaName: '', status: 'Active' })

    const resetForm = () => {
      form.value = { id: null, criteriaName: '', status: 'Active' }
    }

    // ✅ Load criteria when editing
    watch(
      () => props.criteria,
      (newVal) => {
        if (newVal) {
          form.value = { ...newVal }
        } else {
          resetForm()
        }
      },
      { immediate: true }
    )

    const hasUnsavedChanges = computed(() => {
      if (props.isEditing && props.criteria) {
        return (
          form.value.criteriaName.trim() !== props.criteria.criteriaName ||
          form.value.status !== props.criteria.status
        )
      }
      return form.value.criteriaName.trim() !== '' || form.value.status !== 'Active'
    })

    const attemptClose = async () => {
      if (hasUnsavedChanges.value) {
        const result = await confirmUnsavedChanges()
        if (!result.isConfirmed) 
        return
      }
      resetForm()
      emit('close')
    }

    const saveCriteria = async () => {
      if (!form.value.criteriaName.trim()) return

      const result = await confirmSaveChanges()
      if (!result.isConfirmed) return

      showLoading('Saving criteria...')
      try {
        if (props.isEditing && form.value.id) {
          await criteriaStore.updateCriteria(form.value.id, {
            criteriaName: form.value.criteriaName.trim(),
            status: form.value.status,
          })
        } else {
          await criteriaStore.addCriteria(
            form.value.criteriaName.trim(),
            form.value.status
          )
        }

        closeLoading()
        await showChangesSaved()
        emit('save')
        resetForm()
        emit('close')
      } catch (err) {
        closeLoading()
        Swal.fire('Error', 'Failed to save criteria. Please try again.', 'error')
      }
    }

    return { form, saveCriteria, attemptClose }
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
