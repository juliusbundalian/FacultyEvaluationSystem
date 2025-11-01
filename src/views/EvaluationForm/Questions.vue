<template>
  <div class="d-flex justify-content-between align-items-center">
    <div>
      <nav aria-label="breadcrumb" class="m-0 p-0">
        <ol class="breadcrumb m-0 p-0">
          <li class="breadcrumb-item body1">Criterias</li>
          <li class="breadcrumb-item active body1" aria-current="page">{{ currentCriteriaId }}</li>
        </ol>
      </nav>
      <div class="ch4">{{ currentCriteriaName }}</div>
    </div>

    <div class="gap-2">
      <Button variant="secondary" styleType="label" class="w-md-auto" goBack>
        Back
      </Button>
    </div>
  </div>

  <div class="card">
    <div class="card-body p-0">
      <div class="row align-items-center mx-4 mt-4 mb-2 gap-2 gap-md-0">
        <div class="col-md-6 p-0">
          <div class="ch5">Questions</div>
        </div>

        <div class="col-md-6 d-flex flex-column flex-md-row justify-content-start justify-content-md-end p-0 gap-2">
          <Button variant="primary-main" iconLeft="add" class="w-md-auto" @click="openAddModal">
            New Question
          </Button>
        </div>
      </div>

      <div class="table-responsive p-0 m-0">
        <DataTable
          ref="dataTableRef"
          :key="tableKey"
          :data="questionsArray"
          :columns="columns"
          :options="options"
          class="table table-hover w-100"
        />
      </div>
    </div>

    <QuestionModal
      :visible="isModalOpen"
      :criteriaId="currentCriteriaId"
      :editQuestion="editingQuestion"
      @close="closeModal"
      @save="refreshTable"
    />
  </div>
</template>

<script>
import { ref, nextTick, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useCriteriaStore } from '@/store/criteriaStore'
import { useQuestionStore } from '@/store/questionsStore'
import { options } from '@/constants/datatableOptions.js'
import { confirmDelete, showItemDeleted, showLoading, closeLoading } from '@/utils/swal'
import Button from '@/components/Buttons.vue'
import QuestionModal from './components/QuestionModal.vue'
import DataTable from 'datatables.net-vue3'
import DataTablesCore from 'datatables.net-bs5'
import 'datatables.net-bs5/css/dataTables.bootstrap5.min.css'

DataTable.use(DataTablesCore)

export default {
  name: 'Questions',
  components: { Button, DataTable, QuestionModal },
  setup() {
    const criteriaStore = useCriteriaStore()
    const questionStore = useQuestionStore()
    const { selectedCriteria } = storeToRefs(criteriaStore)
    const { questions, loading } = storeToRefs(questionStore)

    const tableKey = ref(0)
    const dataTableRef = ref(null)
    const isModalOpen = ref(false)
    const editingQuestion = ref(null)

    const columns = [
      { data: 'questionId', title: '#' },
      { data: 'questionText', title: 'Text' },
      { data: 'questionOrder', title: 'Order' },
      { data: 'statuts', title: 'Status' },
      {
        data: null,
        title: 'Actions',
        orderable: false,
        searchable: false,
        render: (data, type, row) => `
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
    ]

    const questionsArray = computed(() => {
      if (!Array.isArray(questions.value)) return []
      return questions.value.map(u => ({ ...u }))
    })

    watch(questionsArray, () => {
      tableKey.value += 1
    }, { deep: true })

    watch(loading, (isLoading) => {
      if (dataTableRef.value?.dt) {
        dataTableRef.value.dt.processing(isLoading)
      }
    })

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
      if (selectedCriteria.value) {
        await questionStore.fetchQuestionsByCriteria(selectedCriteria.value.id)
      }
      const tableEl = dataTableRef.value?.$el
      if (tableEl) {
        tableEl.addEventListener('click', handleTableClick)
      }
    })

    onBeforeUnmount(() => {
      const tableEl = dataTableRef.value?.$el
      if (tableEl) {
        tableEl.removeEventListener('click', handleTableClick)
      }
    })

    const handleTableClick = (e) => {
      const editBtn = e.target.closest('.edit-btn')
      const deleteBtn = e.target.closest('.delete-btn')

      if (editBtn) {
        const id = editBtn.dataset.id
        const question = questions.value.find(q => q.id === id)
        if (question) {
          editingQuestion.value = { ...question }
          isModalOpen.value = true
        }
      }

      if (deleteBtn) {
        const id = deleteBtn.dataset.id
        confirmDelete().then(async (result) => {
          if (result.isConfirmed) {
            showLoading('Deleting question...')
            try {
              await questionStore.deleteQuestion(id)
              closeLoading()
              await showItemDeleted()
            } catch (error) {
              closeLoading()
              console.error('Error deleting question:', error)
            }
          }
        })
      }
    }

    const refreshTable = async () => {
      await questionStore.fetchQuestionsByCriteria(selectedCriteria.value.id)
    }

    const openAddModal = () => {
      editingQuestion.value = null
      isModalOpen.value = true
    }

    const closeModal = () => {
      isModalOpen.value = false
      editingQuestion.value = null
    }

    return {
      currentCriteriaName: selectedCriteria.value.criteriaName,
      currentCriteriaId: selectedCriteria.value.id,
      questionsArray,
      loading,
      dataTableRef,
      tableKey,
      columns,
      options,
      isModalOpen,
      editingQuestion,
      refreshTable,
      openAddModal,
      closeModal,
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
