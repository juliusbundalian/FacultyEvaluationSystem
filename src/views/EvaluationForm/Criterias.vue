<template>
  <div class="d-flex justify-content-between align-items-center">
    <div class="ch4">Criteria</div>

    <div class="gap-2">
      <Button 
        variant="primary-main" 
        iconLeft="add" 
        class="w-md-auto"
        @click="openAddModal"
      >
        New Criteria
      </Button>
    </div>
  </div>

  <div class="card">
    <div class="card-body p-0">
      <div class="table-responsive p-0 m-0 mt-2">
        <DataTable
          ref="dataTableRef"
          :key="tableKey"
          :data="criteriasArray"
          :columns="columns"
          :options="options"
          class="table table-hover w-100"
        />
      </div>
    </div>
  </div>

  <!-- Criteria Modal -->
  <CriteriaModal
    :visible="isModalOpen"
    :criteria="selectedCriteria"
    :isEditing="isEditing"
    @close="isModalOpen = false"
    @save="refreshTable"
  />
</template>

<script>
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'   // ✅ import router
import { useCriteriaStore } from '@/store/criteriaStore'
import { options } from '@/constants/datatableOptions.js'
import { confirmDelete, showItemDeleted, showLoading, closeLoading } from '@/utils/swal'
import Button from '@/components/Buttons.vue'
import DataTable from 'datatables.net-vue3'
import DataTablesCore from 'datatables.net-bs5'
import 'datatables.net-bs5/css/dataTables.bootstrap5.min.css'
import CriteriaModal from './components/CriteriaModal.vue'

DataTable.use(DataTablesCore)

export default {
  name: 'Criterias',
  components: { Button, DataTable, CriteriaModal },
  setup() {
    const criteriaStore = useCriteriaStore()
    const { criterias, loading, error } = storeToRefs(criteriaStore)
    const router = useRouter()

    const tableKey = ref(0)
    const dataTableRef = ref(null)

    const isModalOpen = ref(false)
    const isEditing = ref(false)
    const selectedCriteria = ref(null)

    const columns = [
      { data: 'criteriaId', title: '#' },
      { data: 'criteriaName', title: 'Name' },
      { data: 'criteriaOrder', title: 'Order' },
      { data: 'status', title: 'Status' },
      {
        data: null,
        title: 'Actions',
        orderable: false,
        searchable: false,
        render: (data, type, row) => {
          return `
            <div class="d-flex gap-2">
              <button class="icon-btn icon-btn--md btn--edit edit-btn" data-id="${row.id}">
                <span class="icon">edit</span>
              </button>
              <button class="icon-btn icon-btn--md btn--delete delete-btn" data-id="${row.id}">
                <span class="icon">delete</span>
              </button>
            </div>
          `
        }
      }
    ]

    const criteriasArray = computed(() => {
      if (!Array.isArray(criterias.value)) return []
      return criterias.value.map(u => ({ ...u }))
    })

    watch(criteriasArray, () => {
      tableKey.value += 1
    }, { deep: true })

    watch(loading, (isLoading) => {
      if (dataTableRef.value?.dt) {
        dataTableRef.value.dt.processing(isLoading)
      }
    })

    watch(tableKey, () => {
      nextTick(() => {
        attachEventDelegation()
      })
    })

    const openAddModal = () => {
      isEditing.value = false
      selectedCriteria.value = null
      isModalOpen.value = true
    }

    const refreshTable = async () => {
      await criteriaStore.fetchCriterias()
    }

    const attachEventDelegation = () => {
      const tableEl = dataTableRef.value?.dt?.table().node()
      if (!tableEl) return

      tableEl.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-btn')
        const deleteBtn = e.target.closest('.delete-btn')
        const rowEl = e.target.closest('tr')

        if (editBtn) {
          e.stopPropagation()
          const id = editBtn.dataset.id
          const rowData = criterias.value.find(c => c.id === id)
          if (rowData) {
            isEditing.value = true
            selectedCriteria.value = { ...rowData }
            isModalOpen.value = true
          }
          return
        }

        if (deleteBtn) {
          e.stopPropagation()
          const id = deleteBtn.dataset.id
          confirmDelete().then(async (result) => {
            if (result.isConfirmed) {
              showLoading('Deleting criteria...')
              try {
                await criteriaStore.deleteCriteria(id)
                closeLoading()
                await showItemDeleted()
                await refreshTable()
              } catch (error) {
                closeLoading()
                console.error('Error deleting question:', error)
              }
            }
          })
          return
        }

        if (rowEl) {
          const rowData = dataTableRef.value?.dt?.row(rowEl).data()
          if (rowData) {
            criteriaStore.setSelectedCriteria(rowData)
            router.push('/main/form/questions')
          }
        }
      })
    }

    onMounted(async () => {
      try {
        await criteriaStore.fetchCriterias()
        nextTick(() => {
          attachEventDelegation()
        })
      } catch (e) {
        console.error('fetchCriterias failed:', e)
      }
    })

    return {
      criteriasArray,
      loading,
      error,
      tableKey,
      dataTableRef,
      columns,
      options,
      isModalOpen,
      isEditing,
      selectedCriteria,
      openAddModal,
      refreshTable,
    }
  }
}
</script>

<style lang="less" scoped>
.table-responsive {
  overflow-x: hidden !important;
  padding: 0 12px !important;
}
</style>
