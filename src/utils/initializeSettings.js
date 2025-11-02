// This is a one-time setup script to initialize default evaluation settings
// Run this once to create the initial settings document

import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { COLLECTIONS } from '../constants/dbCollections'

export const initializeDefaultSettings = async () => {
  try {
    const settingsRef = doc(db, COLLECTIONS.SETTINGS, 'evaluation-type')

    // Check if settings already exist
    const settingsDoc = await getDoc(settingsRef)

    if (!settingsDoc.exists()) {
      // Create default settings
      const defaultSettings = {
        currentEvaluationType: 'students-to-faculty',
        lastUpdated: new Date(),
        updatedBy: 'system-init',
        evaluationTypes: {
          'students-to-faculty': {
            name: 'Students to Faculty',
            description: 'Feedback from students',
            icon: 'groups',
            color: 'warning',
            hasHierarchy: false,
          },
          'faculty-to-faculty': {
            name: 'Faculty to Faculty',
            description: 'Peer-to-peer evaluation',
            icon: 'group',
            color: 'info',
            hasHierarchy: true,
          },
          'faculty-to-administrator': {
            name: 'Faculty to Administrator',
            description: 'Feedback from Faculty',
            icon: 'person',
            color: 'success',
            hasHierarchy: true,
          },
        },
      }

      await setDoc(settingsRef, defaultSettings)
      console.log('✅ Default evaluation settings initialized')
      return true
    } else {
      console.log('ℹ️ Settings already exist, skipping initialization')
      return false
    }
  } catch (error) {
    console.error('❌ Error initializing settings:', error)
    throw error
  }
}

// Evaluation type constants for use throughout the app
export const EVALUATION_TYPES = {
  STUDENTS_TO_FACULTY: 'students-to-faculty',
  FACULTY_TO_FACULTY: 'faculty-to-faculty',
  FACULTY_TO_ADMINISTRATOR: 'faculty-to-administrator',
}

// Helper to check if evaluation type requires hierarchy (sections)
export const hasHierarchy = (evaluationType) => {
  return (
    evaluationType === EVALUATION_TYPES.FACULTY_TO_FACULTY ||
    evaluationType === EVALUATION_TYPES.FACULTY_TO_ADMINISTRATOR
  )
}
