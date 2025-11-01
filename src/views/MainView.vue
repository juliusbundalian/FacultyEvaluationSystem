<template>
  <div class="d-flex flex-row flex-grow-1 h-100">
    <div class="sidebar-overlay" :class="{ show: isSidebarOpen }" @click="closeSidebar"></div>
    <SideBar :class="{ 'mobile-open': isSidebarOpen }" @collapse="handleCollapse" />
    <div class="flex-grow-1 d-flex flex-column" style="height: 100vh;">
      <TopBar @toggle-sidebar="toggleSidebar" />
      <div class="flex-grow-1 overflow-auto p-4">
        <RouterView> </RouterView>
      </div>
    </div>
  </div>
</template>

<script>
import SideBar from '@/components/SideBar.vue'
import TopBar from '@/components/TopBar.vue'

export default {
  name: 'MainView',
  components: { SideBar, TopBar },
  data() {
    return {
      isSidebarOpen: false,
    }
  },
  methods: {
    toggleSidebar() {
      this.isSidebarOpen = !this.isSidebarOpen
    },
    closeSidebar() {
      this.isSidebarOpen = false
    },
    handleCollapse() {
      this.closeSidebar()
    },
  }
}
</script>

<style scoped lang="less">
@import '@/styles';

.sidebar-overlay {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1030;
}

@media (max-width: 576px) {
  .sidebar {
    position: fixed;
    left: -256px;
    top: 0;
    bottom: 0;
    z-index: 1040;
    transition: left 0.3s ease;
    background-color: @bg-main;
  }

  .sidebar.mobile-open {
    left: 0;
  }

  .sidebar-overlay.show {
    display: block;
  }
}

</style>
