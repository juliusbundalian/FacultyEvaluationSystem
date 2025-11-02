<template>
  <div class="d-flex flex-column gap-4">
    <div class="card">
      <div class="card-body p-0">
        <div class="row align-items-center mx-4 mt-4 mb-2 gap-2 gap-md-0">
          <div class="col-md-6 p-0">
            <div class="ch5">Students</div>
          </div>

          <div
            class="col-md-6 d-flex flex-column flex-md-row justify-content-start justify-content-md-end p-0 gap-2"
          >
            <Button
              styleType="outline"
              variant="primary"
              iconLeft="upload"
              class="w-md-auto"
              @click="triggerFileInput"
            >
              Import
            </Button>
            <input
              ref="fileInput"
              type="file"
              accept=".csv"
              style="display: none"
              @change="handleFileUpload"
            />
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
    const fileInput = ref(null)
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

    watch(
      studentsArray,
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

    // 🔹 CSV Import functionality
    const triggerFileInput = () => {
      fileInput.value?.click()
    }

    const handleFileUpload = async (event) => {
      const file = event.target.files[0]
      if (!file) return

      if (!file.name.toLowerCase().endsWith('.csv')) {
        alert('Please select a CSV file')
        return
      }

      try {
        const csvText = await readFileAsText(file)
        const parsedData = parseCSV(csvText)

        if (parsedData.length === 0) {
          alert('No valid data found in CSV file')
          return
        }

        await importStudents(parsedData)
      } catch (error) {
        console.error('File upload error:', error)
        alert('Error processing file: ' + error.message)
      } finally {
        // Reset file input
        event.target.value = ''
      }
    }

    const readFileAsText = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsText(file)
      })
    }

    const parseCSV = (csvText) => {
      const lines = csvText.trim().split('\n')
      if (lines.length < 2) return []

      const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''))
      const data = []

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim().replace(/"/g, ''))
        if (values.length !== headers.length) continue

        const row = {}
        headers.forEach((header, index) => {
          row[header] = values[index]
        })

        // Validate required fields
        if (row.studentId && row.studentName && row.email) {
          data.push(row)
        }
      }

      return data
    }

    const showLoading = () => {
      // You can implement a loading state here
      console.log('Loading...')
    }

    const closeLoading = () => {
      // Close loading state
      console.log('Loading complete')
    }

    const showChangesSaved = async () => {
      // You can implement success notification here
      console.log('Changes saved successfully!')
    }

    const importStudents = async (studentData) => {
      if (!Array.isArray(studentData) || studentData.length === 0) {
        alert('No valid student data to import')
        return
      }

      console.log('📋 Importing students:', studentData.length, 'enrollments')

      showLoading()

      try {
        const { getFunctions, httpsCallable } = await import('firebase/functions')
        const { app } = await import('@/firebase')
        // Ensure we target the same region the function is deployed to
        const functions = getFunctions(app, 'us-central1')
        const bulkCreate = httpsCallable(functions, 'bulkCreateStudents')

        const result = await bulkCreate({ students: studentData, passwordLength: 12 })
        const data = result.data || {}

        // Log results and credentials
        if (Array.isArray(data.successes)) {
          data.successes.forEach((s) => {
            if (s.isNewStudent) {
              if (s.emailSent) {
                console.log(
                  `✅ New student created & email sent: studentID=${s.studentId} email=${s.email} password=${s.tempPassword} enrollments=${s.enrollmentsCreated}`,
                )
              } else {
                console.log(
                  `⚠️ New student created but email failed: studentID=${s.studentId} email=${s.email} password=${s.tempPassword} enrollments=${s.enrollmentsCreated} error=${s.emailError}`,
                )
              }
            } else {
              console.log(
                `📝 Existing student updated: studentID=${s.studentId} enrollments=${s.enrollmentsCreated}`,
              )
            }
          })

          const newStudents = data.successes.filter((s) => s.isNewStudent).length
          const existingStudents = data.successes.filter((s) => !s.isNewStudent).length
          const emailsSent = data.successes.filter((s) => s.emailSent).length
          const emailsFailed = data.successes.filter((s) => s.isNewStudent && !s.emailSent).length
          const totalEnrollments = data.successes.reduce((sum, s) => sum + s.enrollmentsCreated, 0)

          console.log(
            `📊 Import Summary: ${newStudents} new students, ${existingStudents} existing students updated`,
          )
          console.log(`📧 Email Summary: ${emailsSent} sent, ${emailsFailed} failed`)
          console.log(`📚 Enrollments Created: ${totalEnrollments}`)
          console.log(`🔐 Login URL: https://lcc-daet-fes.web.app/`)
        }
        if (Array.isArray(data.failures) && data.failures.length) {
          console.warn('❌ Import failures:', data.failures.slice(0, 10))
        }

        closeLoading()
        await showChangesSaved()
        await refreshTable()
      } catch (err) {
        closeLoading()
        console.error('Import error:', err)
        alert('Import failed: ' + (err.message || 'Unknown error'))
      }
    }

    return {
      studentsArray,
      loading,
      error,
      tableKey,
      dataTableRef,
      fileInput,
      columns,
      options,
      openAddModal,
      refreshTable,
      isModalOpen,
      selectedStudent,
      isEnrollmentModalOpen,
      triggerFileInput,
      handleFileUpload,
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
