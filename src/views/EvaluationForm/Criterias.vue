<template>
  <!-- Hierarchical layout (Faculty-to-Faculty & Faculty-to-Administrator) -->
  <div v-if="isInSectionContext" class="d-flex justify-content-between align-items-center">
    <div>
      <!-- Enhanced breadcrumbs for hierarchical mode -->
      <nav aria-label="breadcrumb" class="m-0 p-0">
        <ol class="breadcrumb m-0 p-0">
          <li class="breadcrumb-item">
            <button
              type="button"
              class="btn btn-link p-0 text-decoration-none body1"
              @click="goBackToSections"
            >
              Sections
            </button>
          </li>
          <li class="breadcrumb-item active body1" aria-current="page">
            {{ currentSectionName }}
          </li>
        </ol>
      </nav>

      <div class="ch4">
        {{ currentSectionName }}
      </div>
    </div>

    <div class="gap-2">
      <Button
        variant="secondary"
        iconLeft="arrow_back"
        class="w-md-auto me-2"
        @click="goBackToSections"
      >
        Back
      </Button>
    </div>
  </div>

  <!-- Simple layout (Students-to-Faculty) -->
  <div v-else class="d-flex justify-content-between align-items-center">
    <div class="ch4">Criteria</div>

    <div class="gap-2">
      <Button variant="primary-main" iconLeft="add" class="w-md-auto" @click="openAddModal">
        New Criteria
      </Button>
    </div>
  </div>

  <div class="card">
    <div class="card-body p-0">
      <!-- Table header with title and button - only for hierarchical modes -->
      <div v-if="isInSectionContext" class="row align-items-center mx-4 mt-4 mb-2 gap-2 gap-md-0">
        <div class="col-md-6 p-0">
          <div class="ch5">Criterias</div>
        </div>

        <div
          class="col-md-6 d-flex flex-column flex-md-row justify-content-start justify-content-md-end p-0 gap-2"
        >
          <Button variant="primary-main" iconLeft="add" class="w-md-auto" @click="openAddModal">
            New Criteria
          </Button>
        </div>
      </div>

      <div class="table-responsive p-0 m-0" :class="{ 'mt-2': !isInSectionContext }">
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
    :sectionId="currentSectionId"
    @close="isModalOpen = false"
    @save="refreshTable"
  />
</template>

<script>
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter, useRoute } from 'vue-router'
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
    const route = useRoute()

    // Section context from route parameters (hierarchical) or query (legacy)
    const currentSectionId = computed(() => route.params.sectionId || route.query.sectionId || null)
    const currentSectionName = computed(() => route.query.sectionName || '')
    const isInSectionContext = computed(() => !!currentSectionId.value)

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
              <button class="icon-btn icon-btn--md btn--edit edit-btn" data-id="${row.id}" title="Edit Criteria">
                <span class="icon">edit</span>
              </button>
              <button class="icon-btn icon-btn--md btn--delete delete-btn" data-id="${row.id}" title="Delete Criteria">
                <span class="icon">delete</span>
              </button>
            </div>
          `
        },
      },
    ]

    const criteriasArray = computed(() => {
      if (!Array.isArray(criterias.value)) return []
      return criterias.value.map((u) => ({ ...u }))
    })

    watch(
      criteriasArray,
      () => {
        tableKey.value += 1
      },
      { deep: true },
    )

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
      console.log('🔍 Opening add modal - currentSectionId:', currentSectionId.value)
      isEditing.value = false
      selectedCriteria.value = null
      isModalOpen.value = true
    }

    const refreshTable = async () => {
      await criteriaStore.fetchCriterias(currentSectionId.value)
    }

    const handleViewQuestions = (criteria) => {
      if (isInSectionContext.value) {
        // Navigate to hierarchical questions
        router.push({
          name: 'HierarchicalQuestions',
          params: {
            sectionId: currentSectionId.value,
            criteriaId: criteria.criteriaId,
          },
          query: {
            sectionName: currentSectionName.value,
            criteriaName: criteria.criteriaName,
          },
        })
      } else {
        // Navigate to simple questions (Students-to-Faculty)
        router.push({
          name: 'CriteriaQuestions',
          params: { criteriaId: criteria.criteriaId },
          query: { criteriaName: criteria.criteriaName },
        })
      }
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
          const rowData = criterias.value.find((c) => c.id === id)
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
            handleViewQuestions(rowData)
          }
        }
      })
    }

    const goBackToSections = () => {
      router.push({ name: 'Sections' })
    }

    onMounted(async () => {
      try {
        console.log('🔍 Criterias onMounted - currentSectionId:', currentSectionId.value)
        console.log('🔍 Criterias onMounted - route.query:', route.query)

        // Fetch criterias based on section context
        await criteriaStore.fetchCriterias(currentSectionId.value)
        nextTick(() => {
          attachEventDelegation()
        })
      } catch (e) {
        console.error('fetchCriterias failed:', e)
      }
    })

    // Watch for route changes to refetch criteria
    watch(
      () => route.query.sectionId,
      async (newSectionId) => {
        if (newSectionId !== currentSectionId.value) {
          await criteriaStore.fetchCriterias(newSectionId)
        }
      },
    )

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

      // Section context
      isInSectionContext,
      currentSectionId,
      currentSectionName,
      goBackToSections,

      // Methods
      openAddModal,
      handleViewQuestions,
      refreshTable,
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
