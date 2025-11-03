<template>
  <header class="topbar w-100 border-bottom">
    <div class="container-fluid">
      <div class="row align-items-center justify-content-end">
        <!-- Mobile-left area: show Back on student/faculty profiles, else burger on /main -->
        <div v-if="isProfileView || showMenu" class="col-6 d-sm-none ps-4">
          <div class="d-flex align-items-center gap-3">
            <div
              v-if="isProfileView"
              class="menu-button"
              @click="goBack"
              title="Back"
              aria-label="Back"
            >
              <span class="icon">arrow_back</span>
            </div>
            <div
              v-else
              class="menu-button"
              @click="$emit('toggle-sidebar')"
              title="Menu"
              aria-label="Menu"
            >
              <span class="icon">menu</span>
            </div>
            <div class="page-title body-bold-md"></div>
          </div>
        </div>

        <div :class="showMenu ? 'col-6 col-lg-12 text-end pe-4' : 'col-12 text-end pe-4'">
          <div class="d-flex justify-content-end align-items-center gap-2">
            <div class="d-flex gap-2">
              
              <div class="dropdown" @click.stop="toggleDropdown('theme')">
                <button class="icon-btn--md btn--transparent">
                  <span class="icon">{{ currentTheme === 'light' ? 'brightness_5' : 'bedtime' }}</span>
                </button>

                <ul
                  class="dropdown-menu dropdown-menu-end border-0"
                  :class="{ show: activeDropdown === 'theme' }"
                >
                  <li class="dropdown-item" @click="setTheme('light')">
                    <span class="icon">brightness_5</span> Light
                  </li>
                  <li class="dropdown-item" @click="setTheme('dark')">
                    <span class="icon">bedtime</span> Night
                  </li>
                </ul>
              </div>

              <!-- Notifications Dropdown -->
              <!-- <div class="dropdown" @click.stop="toggleDropdown('notifications')">
                <button class="icon-btn--md btn--transparent">
                  <span class="icon">notifications</span>
                </button>

                <ul
                  class="dropdown-menu shadow-sm dropdown-menu-end border-0"
                  :class="{ show: activeDropdown === 'notifications' }"
                >
                  <li class="dropdown-item">notification here</li>
                </ul>
              </div> -->

              <!-- Account Dropdown -->
              <div class="dropdown" @click.stop="toggleDropdown('account')">
                <div class="d-flex align-items-center gap-2 pfp">
                  <img
                    :src="
                      authStore.user?.photoURL ||
                      'https://ui-avatars.com/api/?name=' + (authStore.userData?.name || 'User')
                    "
                    alt="avatar"
                    class="rounded-circle"
                    style="width: 38px; height: 38px; object-fit: cover"
                  />
                  <div class="d-none d-md-block text-start">
                    <div class="body2">{{ authStore.userData?.name || 'John Doe' }}</div>
                    <div class="caption">{{ authStore.userData?.role || 'Guest' }}</div>
                  </div>
                </div>

                <ul
                  class="dropdown-menu shadow-sm dropdown-menu-end border-0"
                  :class="{ show: activeDropdown === 'account' }"
                >
                  <li class="px-3 py-2 d-flex align-items-center gap-2">
                    <img
                      :src="
                        authStore.user?.photoURL ||
                        'https://ui-avatars.com/api/?name=' + (authStore.userData?.name || 'User')
                      "
                      alt="avatar"
                      class="rounded-circle"
                      style="width: 40px; height: 40px; object-fit: cover"
                    />
                    <div>
                      <div class="fw-semibold">{{ authStore.userData?.name || 'John Doe' }}</div>
                      <small class="text-muted">{{ authStore.userData?.role || 'Guest' }}</small>
                    </div>
                  </li>

                  <li><hr class="dropdown-divider" /></li>

                  <!-- Menu Items -->
                  <li class="dropdown-item d-flex align-items-center gap-2" @click="navTo(profileRoute)">
                    <span class="icon">person</span> Profile
                  </li>
                  <li class="dropdown-item d-flex align-items-center gap-2" @click="navTo('/main')">
                    <span class="icon">settings</span> Settings
                  </li>

                  <li><hr class="dropdown-divider" /></li>

                  <li
                    class="dropdown-item text-danger d-flex align-items-center gap-2"
                    @click="authStore.logout()"
                  >
                    <span class="icon">logout</span> Logout
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script>
import { inject, computed } from 'vue'
import { useAuthStore } from '@/store/authStore'
import { useRoute } from 'vue-router'

export default {
  name: 'TopBar',
  setup() {
    const setTheme = inject('setTheme')
    const currentTheme = inject('currentTheme')
    const authStore = useAuthStore()
    const route = useRoute()
    const showMenu = computed(() => (route.path || '').startsWith('/main'))
    const isProfileView = computed(() => {
      const p = route.path || ''
      return p === '/main/student/profile' || p === '/main/faculty/profile'
    })
    const profileRoute = computed(() => {
      const role = (authStore.userData?.role || '').toString().toLowerCase()
      if (role.includes('admin')) return '/main/admin/profile'
      if (role.includes('teacher') || role.includes('faculty')) return '/main/faculty/profile'
      if (role.includes('student')) return '/main/student/profile'
      return '/main'
    })

    return { setTheme, currentTheme, authStore, showMenu, profileRoute, isProfileView }
  },
  data() {
    return {
      activeDropdown: null,
    }
  },
  methods: {
    toggleDropdown(name) {
      this.activeDropdown = this.activeDropdown === name ? null : name
    },
    goBack() {
      // Prefer history back; if no history or returns to auth, go to /main
      try {
        if (window?.history?.length && window.history.length > 1) {
          this.$router.back()
        } else {
          this.$router.push('/main')
        }
      } catch (e) {
        this.$router.push('/main')
      }
      this.activeDropdown = null
    },
    navTo(path) {
      try {
        const target = typeof path === 'string' ? path : (path && path.value) ? path.value : path
        if (target) {
          this.$router.push(target)
        }
      } catch (e) {
        console.error('Navigation error:', e)
      } finally {
        this.activeDropdown = null
      }
    },
    handleClickOutside(e) {
      if (!this.$el.contains(e.target)) {
        this.activeDropdown = null
      }
    },
  },
  mounted() {
    document.addEventListener('click', this.handleClickOutside)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside)
  },
}
</script>

<style scoped>
.dropdown {
  position: relative; /* make this the positioning context */
}

.dropdown-menu {
  width: 220px;
  display: none;
  position: absolute;
  top: 100%;
  right: 0;
  left: auto;
  margin-top: 0.25rem;
  z-index: 1050; /* keep it above */
}

.dropdown-menu.show {
  display: block;
}

.pfp {
  cursor: pointer;
}
</style>
