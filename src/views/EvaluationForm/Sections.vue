<template>
  <div class="d-flex justify-content-between align-items-center">
    <div class="ch4">Sections</div>

    <div class="gap-2">
      <Button variant="primary-main" iconLeft="add" class="w-md-auto" @click="openAddModal">
        New Section
      </Button>
    </div>
  </div>

  <div class="card">
    <div class="card-body p-0">
      <div class="table-responsive p-0 m-0 mt-2">
        <DataTable
          ref="dataTableRef"
          :key="tableKey"
          :data="sectionsArray"
          :columns="columns"
          :options="options"
          class="table table-hover w-100"
        />
      </div>
    </div>
  </div>

  <!-- Section Modal -->
  <SectionModal
    :visible="isModalOpen"
    :section="selectedSection"
    :isEditing="isEditing"
    @close="isModalOpen = false"
    @save="refreshTable"
  />
</template>

<script>
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSectionsStore } from '@/store/sectionsStore'
import { useSettingsStore } from '@/store/settingsStore'
import { options } from '@/constants/datatableOptions.js'
import { confirmDelete, showItemDeleted, showLoading, closeLoading } from '@/utils/swal'
import Button from '@/components/Buttons.vue'
import DataTable from 'datatables.net-vue3'
import DataTablesCore from 'datatables.net-bs5'
import SectionModal from './components/SectionModal.vue'
import 'datatables.net-bs5/css/dataTables.bootstrap5.min.css'

DataTable.use(DataTablesCore)

export default {
  name: 'Sections',
  components: { Button, DataTable, SectionModal },
  setup() {
    const sectionsStore = useSectionsStore()
    const settingsStore = useSettingsStore()
    const router = useRouter()
    const { sections, loading, error } = storeToRefs(sectionsStore)
    const { currentEvaluationType } = storeToRefs(settingsStore)
    const tableKey = ref(0)
    const dataTableRef = ref(null)

    const isModalOpen = ref(false)
    const selectedSection = ref(null)
    const isEditing = ref(false)

    const columns = [
      { data: 'sectionId', title: 'ID' },
      { data: 'sectionName', title: 'Section Name' },
      { data: 'sectionOrder', title: 'Order' },
      { data: 'status', title: 'Status' },
      {
        data: null,
        title: 'Actions',
        orderable: false,
        searchable: false,
        render: function (data, type, row) {
          return `
            <div class="d-flex gap-2">
              <button class="icon-btn icon-btn--md btn--edit edit-btn" data-id="${row.id}" title="Edit Section">
                <span class="icon">edit</span>
              </button>
              <button class="icon-btn icon-btn--md btn--delete delete-btn" data-id="${row.id}" title="Delete Section">
                <span class="icon">delete</span>
              </button>
            </div>
          `
        },
      },
    ]

    const sectionsArray = computed(() => {
      if (!Array.isArray(sections.value)) return []
      return sections.value.map((s) => ({ ...s }))
    })

    watch(
      sectionsArray,
      () => {
        nextTick(() => {
          tableKey.value++
          // Re-attach event handlers after table re-renders
          attachEventHandlers()
        })
      },
      { deep: true },
    )

    // Function to attach event handlers
    const attachEventHandlers = () => {
      nextTick(() => {
        const tableEl = dataTableRef.value?.dt?.table().node()
        if (!tableEl) return

        tableEl.addEventListener('click', async (e) => {
          const editBtn = e.target.closest('.edit-btn')
          const deleteBtn = e.target.closest('.delete-btn')
          const rowEl = e.target.closest('tr')

          if (editBtn) {
            e.stopPropagation()
            const id = editBtn.dataset.id
            const section = sections.value.find((s) => s.id === id)
            if (section) {
              selectedSection.value = { ...section }
              isEditing.value = true
              isModalOpen.value = true
            }
            return
          }

          if (deleteBtn) {
            e.stopPropagation()
            const id = deleteBtn.dataset.id
            handleDelete(e, id)
            return
          }

          if (rowEl) {
            const rowData = dataTableRef.value?.dt?.row(rowEl).data()
            if (rowData) {
              handleViewCriteria(rowData)
            }
          }
        })
      })
    }

    // Watch for evaluation type changes and refetch sections
    watch(currentEvaluationType, async (newType, oldType) => {
      if (newType && newType !== oldType) {
        console.log(
          '🔄 Evaluation type changed from',
          oldType,
          'to',
          newType,
          '- refetching sections',
        )
        await sectionsStore.fetchSections(newType)
      }
    })

    onMounted(async () => {
      try {
        // Ensure settings are loaded first
        if (!settingsStore.settings) {
          await settingsStore.fetchSettings()
        }

        await sectionsStore.fetchSections(currentEvaluationType.value)

        attachEventHandlers()
      } catch (e) {
        console.error('fetchSections failed:', e)
      }
    })

    const openAddModal = () => {
      selectedSection.value = null
      isEditing.value = false
      isModalOpen.value = true
    }

    const handleViewCriteria = (sectionData) => {
      if (sectionData) {
        // Navigate to hierarchical criterias with cleaner URL structure
        router.push({
          name: 'SectionCriterias',
          params: { sectionId: sectionData.sectionId },
          query: { sectionName: sectionData.sectionName },
        })
      }
    }

    const handleDelete = async (event, sectionId) => {
      const section = sections.value.find((s) => s.id === sectionId)

      if (!section) return

      try {
        const result = await confirmDelete()
        if (result.isConfirmed) {
          showLoading('Deleting section...')
          await sectionsStore.deleteSection(sectionId)
          await showItemDeleted()
          refreshTable()
        }
      } catch (error) {
        console.error('Delete section failed:', error)
      } finally {
        closeLoading()
      }
    }

    const refreshTable = async () => {
      try {
        await sectionsStore.fetchSections(currentEvaluationType.value)
        nextTick(() => {
          tableKey.value++
          // Re-attach event handlers after table refresh
          attachEventHandlers()
        })
      } catch (error) {
        console.error('Refresh sections failed:', error)
      }
    }

    return {
      // Data
      sectionsArray,
      loading,
      error,
      columns,
      options,
      tableKey,
      dataTableRef,

      // Modal state
      isModalOpen,
      selectedSection,
      isEditing,

      // Methods
      openAddModal,
      handleViewCriteria,
      attachEventHandlers,
      refreshTable,
    }
  },
}
</script>

<style scoped lang="less">
.table-responsive {
  overflow-x: hidden !important;
  padding: 0 12px !important;
}
</style>
