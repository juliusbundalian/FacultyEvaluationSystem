<template>
  <header class="topbar w-100 border-bottom">
    <div class="container-fluid">
      <div class="row align-items-center justify-content-end">
        <div v-if="showMenu" class="col-6 d-sm-none ps-4">
          <div class="d-flex align-items-center gap-3">
            <div class="menu-button" @click="$emit('toggle-sidebar')">
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
                  <li class="dropdown-item d-flex align-items-center gap-2">
                    <span class="icon">person</span> Profile
                  </li>
                  <li class="dropdown-item d-flex align-items-center gap-2">
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

    return { setTheme, currentTheme, authStore, showMenu }
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
