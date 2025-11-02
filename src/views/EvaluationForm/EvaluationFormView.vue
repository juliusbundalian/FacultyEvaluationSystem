<template>
  <div class="d-flex flex-column gap-4">
    <div class="d-flex flex-column gap-1">
      <div class="ch4">Evaluation Forms</div>
      <div class="body1">
        Select the evaluation type to manage its form structure. You can switch
        between types at any time.
      </div>
    </div>
    <div class="d-flex flex-column flex-lg-row gap-4">
      <div
        class="flex-fill card p-3"
        :class="{
          selected: settingsStore.currentEvaluationType === 'students-to-faculty',
          disabled: switching,
        }"
        @click="!switching && handleTypeSelect('students-to-faculty')"
      >
        <div class="card-body">
          <div class="d-flex gap-4">
            <div class="gap-1 flex-column">
              <div class="ch4">Students to Faculty</div>
              <div class="body1">Feedback from students</div>
            </div>
            <button class="icon-btn--lg btn--label-warning ms-auto">
              <span class="icon">groups</span>
            </button>
          </div>
        </div>
      </div>

      <div
        class="flex-fill card p-3"
        :class="{
          selected: settingsStore.currentEvaluationType === 'faculty-to-faculty',
          disabled: switching,
        }"
        @click="!switching && handleTypeSelect('faculty-to-faculty')"
      >
        <div class="card-body">
          <div class="d-flex gap-4">
            <div class="gap-1 flex-column">
              <div class="ch4">Faculty to Faculty</div>
              <div class="body1">Peer-to-peer evaluation</div>
            </div>
            <button class="icon-btn--lg btn--label-info ms-auto">
              <span class="icon">group</span>
            </button>
          </div>
        </div>
      </div>

      <div
        class="flex-fill card p-3"
        :class="{
          selected: settingsStore.currentEvaluationType === 'faculty-to-administrator',
          disabled: switching,
        }"
        @click="!switching && handleTypeSelect('faculty-to-administrator')"
      >
        <div class="card-body">
          <div class="d-flex gap-4">
            <div class="gap-1 flex-column">
              <div class="ch4">Faculty to Administrator</div>
              <div class="body1">Feedback from Faculty</div>
            </div>
            <button class="icon-btn--lg btn--label-success ms-auto">
              <span class="icon">person</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="d-flex flex-column gap-4">
      <RouterView />
    </div>
  </div>
</template>

<script>
import { onMounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSettingsStore } from '@/store/settingsStore'

export default {
  name: 'EvaluationView',
  setup() {
    const settingsStore = useSettingsStore()
    const switching = ref(false)
    const router = useRouter()
    const route = useRoute()

    onMounted(async () => {
      try {
        await settingsStore.fetchSettings()
        console.log('Current evaluation type:', settingsStore.currentEvaluationType)
        console.log('Is hierarchical:', settingsStore.isHierarchical)

        // Navigate to appropriate component based on evaluation type
        await navigateToDefaultComponent()
      } catch (error) {
        console.error('Error loading settings:', error)
      }
    })

    // Watch for evaluation type changes and navigate accordingly
    watch(
      () => settingsStore.currentEvaluationType,
      async () => {
        await navigateToDefaultComponent()
      },
    )

    const navigateToDefaultComponent = async () => {
      console.log(
        'Navigating based on type:',
        settingsStore.currentEvaluationType,
        'Is hierarchical:',
        settingsStore.isHierarchical,
      )
      console.log('Current route:', route.path)

      if (settingsStore.isHierarchical) {
        // For hierarchical types, navigate to sections if not already there
        if (route.path !== '/main/form/sections') {
          console.log('Navigating to sections for hierarchical type')
          await router.push('/main/form/sections')
        }
      } else {
        // For simple types, navigate to criterias (base route) if not already there
        if (route.path !== '/main/form') {
          console.log('Navigating to criterias for simple type')
          await router.push('/main/form')
        }
      }
    }

    const handleTypeSelect = async (type) => {
      // Prevent selecting the same type
      if (settingsStore.currentEvaluationType === type) {
        console.log(`Already using ${type}`)
        return
      }

      // Prevent multiple clicks during switching
      if (switching.value) {
        console.log('Already switching...')
        return
      }

      console.log(`Switching to evaluation type: ${type}`)
      switching.value = true

      try {
        // Update the evaluation type in the database
        await settingsStore.setEvaluationType(type)

        console.log(`✅ Successfully switched to: ${type}`)
        console.log(`Is hierarchical: ${settingsStore.isHierarchical}`)

        // Navigation will happen automatically via the watcher
      } catch (error) {
        console.error('Failed to switch evaluation type:', error)
        // TODO: Could show error notification to user
      } finally {
        switching.value = false
      }
    }

    return {
      settingsStore,
      switching,
      handleTypeSelect,
    }
  },
}
</script>

<style scoped lang="less">
@import '@/styles/index.less';
.card {
  cursor: pointer;
  transition: all 0.1s linear;
  border: 2px solid @divider;
}

.card:hover:not(.disabled) {
  background-color: @hover;
  transform: translateY(-2px);
}

.card.selected {
  border-color: @primary;
  transform: translateY(-2px);
}

.card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.ch4 {
  color: @text-primary;
}

.body1 {
  color: @text-secondary;
}
</style>
