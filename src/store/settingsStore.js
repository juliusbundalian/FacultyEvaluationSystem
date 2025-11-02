import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { COLLECTIONS } from '../constants/dbCollections'
import { EVALUATION_TYPES, hasHierarchy } from '../utils/initializeSettings'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // Computed getters
  const currentEvaluationType = computed(() => {
    return settings.value?.currentEvaluationType || EVALUATION_TYPES.STUDENTS_TO_FACULTY
  })

  const evaluationTypes = computed(() => {
    return settings.value?.evaluationTypes || {}
  })

  const currentTypeConfig = computed(() => {
    const type = currentEvaluationType.value
    return evaluationTypes.value[type] || {}
  })

  const isHierarchical = computed(() => {
    return hasHierarchy(currentEvaluationType.value)
  })

  // Actions
  const fetchSettings = async () => {
    loading.value = true
    error.value = null
    try {
      const settingsRef = doc(db, COLLECTIONS.SETTINGS, 'evaluation-type')
      const settingsDoc = await getDoc(settingsRef)

      if (settingsDoc.exists()) {
        settings.value = settingsDoc.data()
      } else {
        // If settings don't exist, this means initializeDefaultSettings hasn't run yet
        console.warn('Settings not found - using defaults')
        settings.value = {
          currentEvaluationType: EVALUATION_TYPES.STUDENTS_TO_FACULTY,
          evaluationTypes: {},
        }
      }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching settings:', err)
    } finally {
      loading.value = false
    }
  }

  const setEvaluationType = async (newType) => {
    if (!Object.values(EVALUATION_TYPES).includes(newType)) {
      throw new Error(`Invalid evaluation type: ${newType}`)
    }

    loading.value = true
    error.value = null
    try {
      const settingsRef = doc(db, COLLECTIONS.SETTINGS, 'evaluation-type')

      await updateDoc(settingsRef, {
        currentEvaluationType: newType,
        lastUpdated: new Date(),
        updatedBy: 'user', // TODO: Get actual user ID from auth store
      })

      // Update local state
      if (settings.value) {
        settings.value.currentEvaluationType = newType
        settings.value.lastUpdated = new Date()
      }

      console.log(`✅ Evaluation type changed to: ${newType}`)
    } catch (err) {
      error.value = err.message
      console.error('Error updating evaluation type:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const getCurrentEvaluationType = () => {
    return currentEvaluationType.value
  }

  // Get display info for a specific evaluation type
  const getTypeDisplayInfo = (type) => {
    return (
      evaluationTypes.value[type] || {
        name: type,
        description: '',
        icon: 'help',
        color: 'secondary',
        hasHierarchy: hasHierarchy(type),
      }
    )
  }

  return {
    // State
    settings,
    loading,
    error,

    // Getters
    currentEvaluationType,
    evaluationTypes,
    currentTypeConfig,
    isHierarchical,

    // Actions
    fetchSettings,
    setEvaluationType,
    getCurrentEvaluationType,
    getTypeDisplayInfo,
  }
})
