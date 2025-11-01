<template>
  <div class="d-flex flex-column gap-4 ">
    <div class="card">
      <div class="card-body p-0">
        <div class="row align-items-center mx-4 mt-4 mb-2 gap-2 gap-md-0">
          <div class="col-md-6 p-0">
            <div class="ch5">Users</div>
          </div>

          <div class="col-md-6 d-flex flex-column flex-md-row justify-content-start justify-content-md-end p-0 gap-2">
            <Button variant="primary-main" iconLeft="add" @click="openAddModal" class="w-md-auto">
              New User
            </Button>
          </div>
        </div>

        <div class="table-responsive p-0 m-0">
          <DataTable
            ref="dataTableRef"
            :key="tableKey"
            :data="usersArray"
            :columns="columns"
            :options="options"
            class="table table-hover w-100"
          />
        </div>
      </div>
    </div>
  </div>

  <!-- User Modal -->
  <UserModal
    :visible="isModalOpen"
    :editUser="selectedUser"
    @close="isModalOpen = false"
    @save="refreshTable"
  />
</template>

<script>
import { ref, onMounted, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/store/userStore'
import { options } from '@/constants/datatableOptions.js'
import Button from '@/components/Buttons.vue'
import UserModal from './components/UserModal.vue'
import DataTable from 'datatables.net-vue3'
import DataTablesCore from 'datatables.net-bs5'
import 'datatables.net-bs5/css/dataTables.bootstrap5.min.css'

DataTable.use(DataTablesCore)

export default {
  name: 'UserView',
  components: { Button, DataTable, UserModal },
  setup() {
    const userStore = useUserStore()
    const { users, loading, error, userCount } = storeToRefs(userStore)

    const tableKey = ref(0)
    const dataTableRef = ref(null)
    const isModalOpen = ref(false)
    const selectedUser = ref(null)

    const columns = [
      { data: 'id', title: 'ID' },
      { data: 'name', title: 'Name' },
      { data: 'email', title: 'Email' },
      { data: 'role', title: 'Role' },
      { data: 'status', title: 'Status' },
    ]

    const usersArray = computed(() => {
      if (!Array.isArray(users.value)) return []
      return users.value.map(u => ({ ...u }))
    })

    watch(usersArray, () => {
      tableKey.value += 1
    }, { deep: true })

    watch(loading, (isLoading) => {
      if (dataTableRef.value?.dt) {
        dataTableRef.value.dt.processing(isLoading)
      }
    })

    onMounted(async () => {
      try {
        await refreshTable()
      } catch (e) {
        console.error('fetchUsers failed:', e)
      }
    })

    const openAddModal = () => {
      selectedUser.value = null
      isModalOpen.value = true
    }

    const refreshTable = async () => {
      await userStore.fetchUsers()
    }

    return {
      usersArray,
      loading,
      error,
      tableKey,
      dataTableRef,
      columns,
      options,
      openAddModal,
      refreshTable,
      isModalOpen,
      selectedUser,
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
