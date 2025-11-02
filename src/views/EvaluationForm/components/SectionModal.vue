<template>
  <transition name="fade">
    <div v-if="visible" class="modal-backdrop">
      <div class="modal modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content shadow-lg rounded-3">
          <div class="modal-header">
            <h5 class="modal-title">{{ isEditing ? 'Edit Section' : 'New Section' }}</h5>
            <button type="button" class="btn-close" @click="attemptClose"></button>
          </div>

          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label fw-bold">Section Name</label>
              <input
                type="text"
                v-model="form.sectionName"
                class="form-control"
                placeholder="Enter section name"
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
            <Button variant="primary-main" @click="saveSection" class="w-md-auto"> Save </Button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { ref, watch, computed } from 'vue'
import { useSectionsStore } from '@/store/sectionsStore'
import { useSettingsStore } from '@/store/settingsStore'
import { storeToRefs } from 'pinia'
import Button from '@/components/Buttons.vue'
import {
  confirmSaveChanges,
  confirmUnsavedChanges,
  showChangesSaved,
  showDuplicateEntry,
  showLoading,
  closeLoading,
} from '@/utils/swal'

export default {
  name: 'SectionModal',
  components: { Button },
  props: {
    visible: { type: Boolean, default: false },
    section: { type: Object, default: null },
    isEditing: { type: Boolean, default: false },
  },
  emits: ['close', 'save'],
  setup(props, { emit }) {
    const sectionsStore = useSectionsStore()
    const settingsStore = useSettingsStore()
    const { currentEvaluationType } = storeToRefs(settingsStore)

    const form = ref({
      sectionName: '',
      status: 'Active',
    })

    const originalData = ref({})

    const hasChanges = computed(() => {
      if (!props.isEditing) {
        return form.value.sectionName.trim() !== '' || form.value.status !== 'Active'
      }
      return (
        form.value.sectionName !== originalData.value.sectionName ||
        form.value.status !== originalData.value.status
      )
    })

    // Watch for section prop changes
    watch(
      () => props.section,
      (newSection) => {
        if (newSection && props.isEditing) {
          form.value = {
            sectionName: newSection.sectionName || '',
            status: newSection.status || 'Active',
          }
          originalData.value = { ...form.value }
        } else {
          // Reset form for new section
          form.value = {
            sectionName: '',
            status: 'Active',
          }
          originalData.value = {}
        }
      },
      { immediate: true },
    )

    // Watch for modal visibility changes to reset form when opening for new section
    watch(
      () => props.visible,
      (isVisible) => {
        if (isVisible && !props.isEditing) {
          // Reset form when modal opens for a new section
          form.value = {
            sectionName: '',
            status: 'Active',
          }
          originalData.value = {}
        }
      },
    )

    const attemptClose = async () => {
      if (hasChanges.value) {
        const result = await confirmUnsavedChanges()
        if (result.isConfirmed) {
          emit('close')
        }
      } else {
        emit('close')
      }
    }

    const saveSection = async () => {
      if (!form.value.sectionName.trim()) {
        console.warn('Section name is required')
        return
      }

      try {
        showLoading(props.isEditing ? 'Updating section...' : 'Creating section...')

        if (props.isEditing) {
          // Update existing section
          await sectionsStore.updateSection(props.section.id, {
            sectionName: form.value.sectionName.trim(),
            status: form.value.status,
          })
        } else {
          // Create new section
          await sectionsStore.addSection(
            form.value.sectionName.trim(),
            currentEvaluationType.value,
            form.value.status,
          )
        }

        await showChangesSaved()
        emit('save')
        emit('close')
      } catch (error) {
        console.error('Save section failed:', error)
        if (error.message.includes('duplicate') || error.message.includes('already exists')) {
          await showDuplicateEntry()
        }
      } finally {
        closeLoading()
      }
    }

    return {
      form,
      hasChanges,
      attemptClose,
      saveSection,
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
