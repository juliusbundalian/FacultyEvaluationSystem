<template>
  <div class="d-flex flex-column gap-4">
    <div class="card">
      <div class="card-body p-0">
        <div class="row align-items-center mx-4 mt-4 mb-2 gap-2 gap-md-0">
          <div class="col-md-6 p-0">
            <div class="ch5">Evaluations</div>
          </div>

          <div
            class="col-md-6 d-flex flex-column flex-md-row justify-content-start justify-content-md-end p-0 gap-2"
          >
            <Button variant="primary-main" iconLeft="add" @click="openAddModal" class="w-md-auto">
              New Evaluation
            </Button>
          </div>
        </div>

        <div class="table-responsive p-0 m-0">
          <DataTable
            ref="dataTableRef"
            :key="tableKey"
            :data="evaluationsArray"
            :columns="columns"
            :options="options"
            class="table table-hover w-100"
          />
        </div>
      </div>
    </div>
  </div>

  <EvaluationModal
    :visible="isModalOpen"
    :isEditing="isEditing"
    :evaluation="selectedEvaluation"
    @close="closeModal"
    @save="closeModal"
  />
</template>

<script>
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useEvaluationStore } from '@/store/evaluationStore'
import { options } from '@/constants/datatableOptions.js'
import { confirmDelete, showItemDeleted, showLoading, closeLoading } from '@/utils/swal'
import Button from '@/components/Buttons.vue'
import EvaluationModal from './components/EvaluationModal.vue'
import DataTable from 'datatables.net-vue3'
import DataTablesCore from 'datatables.net-bs5'
import 'datatables.net-bs5/css/dataTables.bootstrap5.min.css'
import { useRouter } from 'vue-router'

DataTable.use(DataTablesCore)

export default {
  name: 'EvaluationView',
  components: { Button, DataTable, EvaluationModal },

  setup() {
    const evaluationStore = useEvaluationStore()
    const { evaluations, loading } = storeToRefs(evaluationStore)
    const router = useRouter()

  const tableKey = ref(0)
    const dataTableRef = ref(null)
    const isModalOpen = ref(false)
    const isEditing = ref(false)
    const selectedEvaluation = ref(null)
  const now = ref(new Date())
  let nowInterval = null

    const columns = [
      { data: 'id', title: '#' },
      { data: 'evaluationName', title: 'Name' },
      {
        data: 'startDate',
        title: 'Start Date',
        render: (data, type, row) => {
          if (!data) return ''
          try {
            const d = new Date(data)
            return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
          } catch (e) {
            return data
          }
        },
      },
      {
        data: 'endDate',
        title: 'End Date',
        render: (data, type, row) => {
          if (!data) return ''
          try {
            const d = new Date(data)
            return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
          } catch (e) {
            return data
          }
        },
      },
      { data: 'status', title: 'Status' },
      {
        data: null,
        title: 'Actions',
        orderable: false,
        searchable: false,
        render: (data, type, row) => `
          <div class="d-flex gap-2">
            <button class="icon-btn icon-btn--md btn--edit view-btn" data-id="${row.id}">
              <span class="icon">visibility</span>
            </button>
            <button class="icon-btn icon-btn--md btn--edit edit-btn" data-id="${row.id}">
              <span class="icon">edit</span>
            </button>
            <button class="icon-btn icon-btn--md btn--delete delete-btn" data-id="${row.id}">
              <span class="icon">delete</span>
            </button>
          </div>
        `,
      },
    ]

    const computeStatus = (e) => {
      try {
        const current = new Date(now.value)
        const start = e.startDate ? new Date(e.startDate) : null
        const end = e.endDate ? new Date(e.endDate) : null

        // Normalize to day boundaries to avoid closing on the end date prematurely
        if (start) start.setHours(0, 0, 0, 0)
        if (end) end.setHours(23, 59, 59, 999)

        if (start && end) {
          if (current < start) return 'Upcoming'
          if (current >= start && current <= end) return 'Active'
          return 'Closed'
        }

        if (start && !end) {
          return current < start ? 'Upcoming' : 'Active'
        }

        if (!start && end) {
          return current <= end ? 'Active' : 'Closed'
        }

        return e.status || 'Unknown'
      } catch (err) {
        console.error('Error computing status for evaluation', e, err)
        return e.status || 'Unknown'
      }
    }

    const evaluationsArray = computed(() =>
      Array.isArray(evaluations.value)
        ? evaluations.value.map((e) => ({ ...e, status: computeStatus(e) }))
        : [],
    )

    // 🔹 Reload DataTable when data changes
    watch(evaluationsArray, () => (tableKey.value += 1), { deep: true })

    // 🔹 Handle loading state
    watch(loading, (isLoading) => {
      if (dataTableRef.value?.dt) dataTableRef.value.dt.processing(isLoading)
    })

    // 🔹 Bind events again when table re-renders
    watch(tableKey, () => {
      nextTick(() => {
        const tableEl = dataTableRef.value?.$el
        if (tableEl) {
          tableEl.removeEventListener('click', handleTableClick)
          tableEl.addEventListener('click', handleTableClick)
        }
      })
    })

    onMounted(async () => {
      // Subscribe to real-time updates so the table reflects changes immediately
      evaluationStore.subscribeEvaluations()

      // start a timer to update "now" so computed statuses refresh in real time
      nowInterval = setInterval(() => {
        now.value = new Date()
      }, 30000) // update every 30s

      const tableEl = dataTableRef.value?.$el
      if (tableEl) tableEl.addEventListener('click', handleTableClick)
    })

    onBeforeUnmount(() => {
      evaluationStore.unsubscribeEvaluations()
      const tableEl = dataTableRef.value?.$el
      if (tableEl) tableEl.removeEventListener('click', handleTableClick)
      if (nowInterval) {
        clearInterval(nowInterval)
        nowInterval = null
      }
    })

    // 🔹 Modal Handlers
    const openAddModal = () => {
      isEditing.value = false
      selectedEvaluation.value = null
      isModalOpen.value = true
    }

    const closeModal = () => {
      isModalOpen.value = false
      isEditing.value = false
      selectedEvaluation.value = null
    }

    const refreshTable = async () => {}

    // 🔹 Handle edit/delete actions
    const handleTableClick = (e) => {
      const editBtn = e.target.closest('.edit-btn')
      const deleteBtn = e.target.closest('.delete-btn')

      if (editBtn) {
        const id = editBtn.dataset.id
        const evaluation = evaluations.value.find((q) => q.id === id)
        if (evaluation) {
          selectedEvaluation.value = { ...evaluation }
          isEditing.value = true
          isModalOpen.value = true
        }
      }

      const viewBtn = e.target.closest('.view-btn')
      if (viewBtn) {
        const id = viewBtn.dataset.id
        // navigate to evaluation summary under /main
        const url = { name: 'EvaluationSummary', params: { evaluationId: id } }
        e.stopPropagation()
        router.push(url)
      }

      if (deleteBtn) {
        const id = deleteBtn.dataset.id
        confirmDelete().then(async (result) => {
          if (result.isConfirmed) {
            showLoading('Deleting evaluation...')
            try {
              await evaluationStore.deleteEvaluation(id)
              closeLoading()
              await showItemDeleted()
            } catch (error) {
              closeLoading()
              console.error('Error deleting evaluation:', error)
            }
          }
        })
      }
    }

    return {
      columns,
      options,
      dataTableRef,
      tableKey,
      evaluationsArray,
      loading,
      refreshTable,
      openAddModal,
      isModalOpen,
      isEditing,
      selectedEvaluation,
      closeModal,
    }
  },
}
</script>

<style lang="less" scoped>
.table-responsive {
  overflow-x: hidden !important;
  padding: 0 12px !important;
}
</style>
