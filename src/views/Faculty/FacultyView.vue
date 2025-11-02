<template>
  <div class="d-flex flex-column gap-4">
    <div class="card">
      <div class="card-body p-0">
        <div class="row align-items-center mx-4 mt-4 mb-2 gap-2 gap-md-0">
          <div class="col-md-6 p-0">
            <div class="ch5">Faculty</div>
          </div>

          <div
            class="col-md-6 d-flex flex-column flex-md-row justify-content-start justify-content-md-end p-0 gap-2"
          >
            <Button
              styleType="outline"
              variant="primary"
              iconLeft="upload"
              class="w-md-auto"
              @click="triggerImport"
            >
              Import
            </Button>
            <!-- hidden file input for CSV import -->
            <input
              ref="fileInputRef"
              type="file"
              accept=".csv,text/csv"
              style="display: none"
              @change="onFileChange"
            />
            <Button variant="primary-main" iconLeft="add" @click="openAddModal" class="w-md-auto">
              New Faculty
            </Button>
          </div>
        </div>

        <div class="table-responsive p-0 m-0">
          <DataTable
            ref="dataTableRef"
            :key="tableKey"
            :data="facultiesArray"
            :columns="columns"
            :options="options"
            class="table table-hover w-100"
          />
        </div>
      </div>
    </div>
  </div>

  <FacultyModal
    :visible="isModalOpen"
    :editFaculty="selectedFaculty"
    @close="isModalOpen = false"
    @save="refreshTable"
  />
</template>

<script>
import { ref, onMounted, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useFacultyStore } from '@/store/facultyStore'
import { options } from '@/constants/datatableOptions.js'
import Button from '@/components/Buttons.vue'
import FacultyModal from './components/FacultyModal.vue'
import { parseCSV } from '@/utils/csv'
import DataTable from 'datatables.net-vue3'
import DataTablesCore from 'datatables.net-bs5'
import 'datatables.net-bs5/css/dataTables.bootstrap5.min.css'

DataTable.use(DataTablesCore)

export default {
  name: 'FacultyView',
  components: { Button, DataTable, FacultyModal },
  setup() {
    const facultyStore = useFacultyStore()
    const { faculties, loading, error, facultyCount } = storeToRefs(facultyStore)
    const tableKey = ref(0)
    const dataTableRef = ref(null)

    const isModalOpen = ref(false)
    const selectedFaculty = ref(null)
    const fileInputRef = ref(null)

    const columns = [
      { data: 'id', title: 'ID' },
      { data: 'name', title: 'Name' },
      { data: 'email', title: 'Email' },
      { data: 'department', title: 'Department' },
      { data: 'status', title: 'Status' },
    ]

    const facultiesArray = computed(() => {
      if (!Array.isArray(faculties.value)) return []
      return faculties.value.map((u) => ({ ...u }))
    })

    watch(
      facultiesArray,
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

    onMounted(async () => {
      try {
        await refreshTable()
      } catch (e) {
        console.error('fetchFaculty failed:', e)
      }
    })

    const openAddModal = () => {
      selectedFaculty.value = null
      isModalOpen.value = true
    }

    const triggerImport = () => {
      if (fileInputRef.value) fileInputRef.value.value = null
      fileInputRef.value?.click()
    }

    // CSV parsing delegated to src/utils/csv.parseCSV

    const onFileChange = async (e) => {
      const file = e.target.files && e.target.files[0]
      if (!file) return
      const text = await file.text()
      const { headers, rows } = parseCSV(text)
      if (!headers.length || !rows.length) {
        alert('CSV appears empty or invalid')
        return
      }

      // expected headers: id, name, email, department, status (case-insensitive)
      const required = ['id', 'name', 'email', 'department']
      const invalidRows = []
      const validRows = []
      const { default: regex } = await import('@/utils/regex')

      for (let idx = 0; idx < rows.length; idx++) {
        const r = rows[idx]
        const faculty = {
          id: (r.id || r.facultyid || r.faculty_id || '').trim(),
          name: (r.name || r.fullname || '').trim(),
          email: (r.email || r.mail || '').trim(),
          department: (r.department || r.dept || '').trim(),
          status: (r.status || 'active').trim() || 'active',
        }

        const errors = []
        for (const key of required) {
          if (!faculty[key] || faculty[key] === '') errors.push(`${key} is required`)
        }
        if (faculty.email && !regex.validateEmail(faculty.email)) errors.push('invalid email')

        if (errors.length) {
          invalidRows.push({ line: idx + 2, errors, raw: rows[idx] })
        } else {
          validRows.push(faculty)
        }
      }

      if (!validRows.length) {
        let msg = 'No valid rows found.\n'
        if (invalidRows.length) {
          msg += invalidRows
            .slice(0, 10)
            .map((r) => `Line ${r.line}: ${r.errors.join('; ')}`)
            .join('\n')
        }
        alert(msg)
        return
      }

      // confirm import
      if (
        !confirm(
          `Import ${validRows.length} faculty records?${invalidRows.length ? `\n${invalidRows.length} rows will be skipped.` : ''}`,
        )
      )
        return

      // call backend Cloud Function to create Auth accounts + Firestore docs
      try {
        // Check if user is authenticated and get fresh token
        const { auth } = await import('@/firebase')

        const currentUser = auth.currentUser
        if (!currentUser) {
          alert('You must be signed in to import faculty. Please sign in and try again.')
          return
        }

        // Get fresh ID token to ensure auth context is valid
        const idToken = await currentUser.getIdToken(true)
        console.log('User authenticated:', currentUser.email, 'Token length:', idToken.length)

        const { showLoading, closeLoading, showChangesSaved } = await import('@/utils/swal')
        showLoading(`Creating ${validRows.length} faculty accounts...`)

        // prepare payload
        const payloadUsers = validRows.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          department: r.department,
          status: r.status,
        }))

        // call Cloud Function
        const { getFunctions, httpsCallable } = await import('firebase/functions')
        const { app } = await import('@/firebase')
        // Ensure we target the same region the function is deployed to
        const functions = getFunctions(app, 'us-central1')
        const bulkCreate = httpsCallable(functions, 'bulkCreateFaculty')

        const result = await bulkCreate({ users: payloadUsers, passwordLength: 12 })
        const data = result.data || {}

        // Log results and credentials
        if (Array.isArray(data.successes)) {
          data.successes.forEach((s) => {
            if (s.emailSent) {
              console.log(
                `✅ Account created & email sent: userID=${s.id} email=${s.email} password=${s.tempPassword}`,
              )
            } else {
              console.log(
                `⚠️ Account created but email failed: userID=${s.id} email=${s.email} password=${s.tempPassword} error=${s.emailError}`,
              )
            }
          })

          const emailsSent = data.successes.filter((s) => s.emailSent).length
          const emailsFailed = data.successes.filter((s) => !s.emailSent).length

          console.log(`📧 Email Summary: ${emailsSent} sent, ${emailsFailed} failed`)
          console.log(`🔐 Login URL: https://lcc-daet-fes.web.app/`)
        }
        if (Array.isArray(data.failures) && data.failures.length) {
          console.warn('❌ Account creation failures:', data.failures.slice(0, 10))
        }

        closeLoading()
        await showChangesSaved()
        await refreshTable()
      } catch (err) {
        console.error('Import failed', err)
        alert('Import failed. See console for details.')
      }
    }

    const refreshTable = async () => {
      await facultyStore.fetchFaculty()
    }

    return {
      facultiesArray,
      loading,
      error,
      tableKey,
      dataTableRef,
      columns,
      options,
      openAddModal,
      refreshTable,
      isModalOpen,
      selectedFaculty,
      fileInputRef,
      triggerImport,
      onFileChange,
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
