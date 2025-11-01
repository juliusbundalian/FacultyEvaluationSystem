<template>
  <div class="d-flex flex-column gap-4 ">
    <div class="card">
      <div class="card-body p-0">
        <div class="row align-items-center mx-4 mt-4 mb-2 gap-2 gap-md-0">
          <div class="col-md-6 p-0">
            <div class="ch5">Students</div>
          </div>

          <div
            class="col-md-6 d-flex flex-column flex-md-row justify-content-start justify-content-md-end p-0 gap-2"
          >
            <Button styleType="outline" variant="primary" iconLeft="upload" class="w-md-auto">
              Import
            </Button>
            <Button variant="primary-main" iconLeft="add" @click="openAddModal" class="w-md-auto">
              New Student
            </Button>
          </div>
        </div>

        <div class="table-responsive p-0 m-0">
          <DataTable
            ref="dataTableRef"
            :key="tableKey"
            :data="studentsArray"
            :columns="columns"
            :options="options"
            class="table table-hover w-100"
          />
        </div>
      </div>
    </div>
  </div>

  <!-- ✅ Enrollment Modal -->
  <EnrollmentModal
    :visible="isEnrollmentModalOpen"
    :student="selectedStudent"
    @close="isEnrollmentModalOpen = false"
  />

  <!-- Existing Student Modal -->
  <StudentModal
    :visible="isModalOpen"
    :editStudent="selectedStudent"
    @close="isModalOpen = false"
    @save="refreshTable"
  />
</template>

<script>
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useStudentStore } from '@/store/studentStore'
import { options } from '@/constants/datatableOptions.js'
import Button from '@/components/Buttons.vue'
import StudentModal from './components/StudentModal.vue'
import EnrollmentModal from './components/EnrollmentModal.vue' // ✅ new modal
import DataTable from 'datatables.net-vue3'
import DataTablesCore from 'datatables.net-bs5'
import 'datatables.net-bs5/css/dataTables.bootstrap5.min.css'

DataTable.use(DataTablesCore)

export default {
  name: 'StudentView',
  components: { Button, DataTable, StudentModal, EnrollmentModal },
  setup() {
    const studentStore = useStudentStore()
    const { students, loading, error } = storeToRefs(studentStore)

    const tableKey = ref(0)
    const dataTableRef = ref(null)
    const isModalOpen = ref(false)
    const isEnrollmentModalOpen = ref(false)
    const selectedStudent = ref(null)

    const columns = [
      { data: 'id', title: 'ID' },
      { data: 'name', title: 'Name' },
      { data: 'email', title: 'Email' },
      { data: 'program', title: 'Program' },
      { data: 'yearLevel', title: 'Year Level' },
      { data: 'status', title: 'Status' },
    ]

    const studentsArray = computed(() => {
      if (!Array.isArray(students.value)) return []
      return students.value.map((u) => ({ ...u }))
    })

    watch(studentsArray, () => {
      tableKey.value += 1
    }, { deep: true })

    watch(loading, (isLoading) => {
      if (dataTableRef.value?.dt) {
        dataTableRef.value.dt.processing(isLoading)
      }
    })

    // 🔹 Fetch students on mount
    onMounted(async () => {
      try {
        await refreshTable()
        nextTick(() => attachRowClickHandler())
      } catch (e) {
        console.error('fetchStudents failed:', e)
      }
    })

    // 🔹 Re-attach row click after re-render
    watch(tableKey, () => {
      nextTick(() => attachRowClickHandler())
    })

    const openAddModal = () => {
      selectedStudent.value = null
      isModalOpen.value = true
    }

    const refreshTable = async () => {
      await studentStore.fetchStudents()
    }

    // 🔹 Row click handler
    const attachRowClickHandler = () => {
      const tableEl = dataTableRef.value?.dt?.table().node()
      if (!tableEl) return

      // Remove previous listeners to avoid duplicates
      tableEl.removeEventListener('click', handleRowClick)
      tableEl.addEventListener('click', handleRowClick)
    }

    const handleRowClick = (e) => {
      const rowEl = e.target.closest('tr')
      if (!rowEl) return

      const rowData = dataTableRef.value?.dt?.row(rowEl).data()
      if (rowData) {
        selectedStudent.value = { ...rowData }
        isEnrollmentModalOpen.value = true
      }
    }

    return {
      studentsArray,
      loading,
      error,
      tableKey,
      dataTableRef,
      columns,
      options,
      openAddModal,
      refreshTable,
      isModalOpen,
      selectedStudent,
      isEnrollmentModalOpen,
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
