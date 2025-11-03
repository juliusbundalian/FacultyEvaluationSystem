<template>
  <div class="sidebar" :class="{ collapsed: isCollapsed }">
    <nav class="pb-3 d-flex flex-column h-100">
      <div class="d-flex align-items-center py-3 px-4">
        <img src="../assets/images/logo.png" alt="HeroApps Logo" height="42px" />
        <img
          src="../assets/images/logo2.png"
          class="sidebar-brand-text"
          alt="HeroApps Logo"
          height="32px"
        />
      </div>

      <div class="sidebar-section">
        <span class="sidebar-section-line"> </span>
        <span class="sidebar-section-title">MAIN</span>
        <span class="sidebar-section-line-extended"> </span>
      </div>

      <ul class="nav flex-column gap-2 pe-3">
        <!-- <li class="nav-item">
          <router-link
            to="/main"
            class="nav-link sidebar-link"
            ref="dashboardLink"
            v-bind="
              isCollapsed
                ? {
                    'data-bs-toggle': 'tooltip',
                    'data-bs-placement': 'right',
                    'data-bs-title': 'Dashboard',
                  }
                : {}
            "
            :class="{ active: $route.path === '/main' }"
          >
            <span class="icon">home</span>
            <span class="label" v-if="!isCollapsed">Dashboard</span>
          </router-link>
        </li> -->

        <li class="nav-item">
          <router-link
            to="/main/evaluation"
            class="nav-link sidebar-link"
            ref="evaluationLink"
            v-bind="
              isCollapsed
                ? {
                    'data-bs-toggle': 'tooltip',
                    'data-bs-placement': 'right',
                    'data-bs-title': 'Evaluations',
                  }
                : {}
            "
            :class="{ active: $route.path.startsWith('/main/evaluation') }"
          >
            <span class="icon">home</span>
            <span class="label" v-if="!isCollapsed">Evaluations</span>
          </router-link>
        </li>
      </ul>

      <div class="sidebar-section">
        <span class="sidebar-section-line"> </span>
        <span class="sidebar-section-title">MANAGE</span>
        <span class="sidebar-section-line-extended"> </span>
      </div>

      <ul class="nav flex-column gap-2 pe-3">
        <li class="nav-item">
          <router-link
            to="/main/form"
            class="nav-link sidebar-link"
            ref="evaluationFormLink"
            v-bind="
              isCollapsed
                ? {
                    'data-bs-toggle': 'tooltip',
                    'data-bs-placement': 'right',
                    'data-bs-title': 'Evaluation Form',
                  }
                : {}
            "
            :class="{ active: $route.path.startsWith('/main/form') }"
          >
            <span class="icon">ballot</span>
            <span class="label" v-if="!isCollapsed">Evaluation Form</span>
          </router-link>
        </li>

        <li class="nav-item">
          <router-link
            to="/main/faculty"
            class="nav-link sidebar-link"
            ref="facultyLink"
            v-bind="
              isCollapsed
                ? {
                    'data-bs-toggle': 'tooltip',
                    'data-bs-placement': 'right',
                    'data-bs-title': 'Faculty',
                  }
                : {}
            "
            :class="{ active: $route.path === '/main/faculty' }"
          >
            <span class="icon">group</span>
            <span class="label" v-if="!isCollapsed">Faculty</span>
          </router-link>
        </li>
        <li class="nav-item">
          <router-link
            to="/main/students"
            class="nav-link sidebar-link"
            ref="studentsLink"
            v-bind="
              isCollapsed
                ? {
                    'data-bs-toggle': 'tooltip',
                    'data-bs-placement': 'right',
                    'data-bs-title': 'Students',
                  }
                : {}
            "
            :class="{ active: $route.path.startsWith('/main/students') }"
          >
            <span class="icon">groups</span>
            <span class="label" v-if="!isCollapsed">Students</span>
          </router-link>
        </li>
        <li class="nav-item">
          <router-link
            to="/main/users"
            class="nav-link sidebar-link"
            ref="usersLink"
            v-bind="
              isCollapsed
                ? {
                    'data-bs-toggle': 'tooltip',
                    'data-bs-placement': 'right',
                    'data-bs-title': 'Users',
                  }
                : {}
            "
            :class="{ active: $route.path === '/main/users' }"
          >
            <span class="icon">supervisor_account</span>
            <span class="label" v-if="!isCollapsed">Users</span>
          </router-link>
        </li>
      </ul>

      <ul class="nav gap-2 pe-3 mt-auto flex-column h-100">
        <li class="nav-item mt-auto">
          <div
            class="collapse-button nav-link sidebar-link"
            @click="handleClick"
            ref="collapseBtn"
            v-bind="
              isCollapsed
                ? {
                    'data-bs-toggle': 'tooltip',
                    'data-bs-placement': 'right',
                    'data-bs-title': 'Expand sidebar',
                  }
                : {}
            "
          >
            <span class="icon" style="font-variation-settings: 'FILL' 1">expand_circle_right</span>
            <span class="label" v-if="!isCollapsed">Collapse</span>
          </div>
        </li>
      </ul>
    </nav>
  </div>
</template>

<script>
import { Tooltip } from 'bootstrap'

export default {
  name: 'SideBar',
  data() {
    return { isCollapsed: false }
  },
  methods: {
    handleClick() {
      if (window.innerWidth <= 576) {
        this.$emit('collapse')
      } else {
        this.toggleSidebar()
      }
    },
    toggleSidebar() {
      this.isCollapsed = !this.isCollapsed
      this.$nextTick(() => {
        if (this.isCollapsed) {
          this.initTooltips()
        } else {
          this.destroyTooltips()
        }
      })
    },
    initTooltips() {
      this.destroyTooltips()
      const refs = [
        'dashboardLink',
        'evaluationLink',
        'facultyLink',
        'studentsLink',
        'usersLink',
        'collapseBtn',
      ]
      refs.forEach((ref) => {
        let el = this.$refs[ref]
        // For router-link, use $el
        if (el && el.$el) el = el.$el
        if (el && this.isCollapsed) {
          el._tooltip = new Tooltip(el)
        }
      })
    },
    destroyTooltips() {
      const refs = [
        'dashboardLink',
        'evaluationLink',
        'facultyLink',
        'studentsLink',
        'usersLink',
        'collapseBtn',
      ]
      refs.forEach((ref) => {
        let el = this.$refs[ref]
        if (el && el.$el) el = el.$el
        if (el && el._tooltip) {
          el._tooltip.dispose()
          el._tooltip = null
        }
      })
    },
    isMobile() {
      return window.innerWidth <= 576
    },
    handleResize() {
      if (this.isMobile() && this.isCollapsed) {
        this.isCollapsed = false
        this.destroyTooltips()
      }
    },
  },
  mounted() {
    if (this.isCollapsed) {
      this.initTooltips()
    }
    // Add resize listener
    window.addEventListener('resize', this.handleResize)
  },
  beforeUnmount() {
    this.destroyTooltips()
    // Remove resize listener
    window.removeEventListener('resize', this.handleResize)
  },
}
</script>

<style scoped>
.sidebar {
  height: 100vh;
  position: relative;
  z-index: 1040;
}

@media (max-width: 576px) {
  .sidebar {
    position: fixed;
    left: -240px;
    top: 0;
    bottom: 0;
    transition: left 0.3s ease;
  }

  .sidebar.mobile-open {
    left: 0;
  }
}
</style>
