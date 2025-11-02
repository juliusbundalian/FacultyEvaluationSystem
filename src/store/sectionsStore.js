import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  collection,
  getDocs,
  query,
  deleteDoc,
  doc,
  updateDoc,
  addDoc,
  orderBy,
  where,
} from 'firebase/firestore'
import { db } from '../firebase'
import { COLLECTIONS } from '../constants/dbCollections'

export const useSectionsStore = defineStore('sections', () => {
  const sections = ref([])
  const loading = ref(false)
  const error = ref(null)
  const selectedSection = ref(null)

  const sectionCount = computed(() => sections.value.length)

  const setSelectedSection = (section) => {
    selectedSection.value = section
  }

  const fetchSections = async (evaluationType = null) => {
    loading.value = true
    error.value = null
    try {
      let q
      if (evaluationType) {
        // Filter by evaluation type (no orderBy to avoid index requirement)
        q = query(
          collection(db, COLLECTIONS.SECTIONS),
          where('evaluationType', '==', evaluationType),
        )
      } else {
        // Get all sections (fallback)
        q = query(collection(db, COLLECTIONS.SECTIONS))
      }

      const snapshot = await getDocs(q)
      let sectionsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      // Sort client-side by sectionOrder
      sectionsData.sort((a, b) => (a.sectionOrder || 0) - (b.sectionOrder || 0))

      // Add row numbers after sorting
      sections.value = sectionsData.map((section, index) => ({
        ...section,
        rowNumber: index + 1,
      }))
    } catch (err) {
      error.value = err.message
      console.error('Error fetching sections:', err)
    } finally {
      loading.value = false
    }
  }

  // ADD section
  const addSection = async (sectionName, evaluationType, status = 'Active') => {
    try {
      // Calculate order based on sections for this evaluation type only
      const currentSectionsForType = sections.value.filter(
        (s) => s.evaluationType === evaluationType,
      )
      const newOrder = currentSectionsForType.length + 1
      const newId = `${evaluationType}-sect-${String(newOrder).padStart(3, '0')}`

      const newSection = {
        sectionId: newId,
        sectionName,
        sectionOrder: newOrder,
        evaluationType,
        status,
        createdAt: new Date(),
      }

      const docRef = await addDoc(collection(db, COLLECTIONS.SECTIONS), newSection)

      // Add to local state
      sections.value.push({
        id: docRef.id,
        ...newSection,
        rowNumber: sections.value.length + 1,
      })

      return docRef.id
    } catch (err) {
      console.error('Error adding section:', err)
      throw err
    }
  }

  // UPDATE section
  const updateSection = async (id, updatedFields) => {
    try {
      const sectionRef = doc(db, COLLECTIONS.SECTIONS, id)
      await updateDoc(sectionRef, {
        ...updatedFields,
        updatedAt: new Date(),
      })

      // Update local state
      const index = sections.value.findIndex((s) => s.id === id)
      if (index !== -1) {
        sections.value[index] = { ...sections.value[index], ...updatedFields }
      }
    } catch (err) {
      console.error('Error updating section:', err)
      throw err
    }
  }

  // DELETE section
  const deleteSection = async (id) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.SECTIONS, id))

      // Remove from local state
      sections.value = sections.value.filter((s) => s.id !== id)

      // Re-calculate row numbers
      sections.value.forEach((section, index) => {
        section.rowNumber = index + 1
      })
    } catch (err) {
      console.error('Error deleting section:', err)
      throw err
    }
  }

  // UPDATE section order
  const updateSectionOrder = async (sectionId, newOrder) => {
    try {
      const sectionRef = doc(db, COLLECTIONS.SECTIONS, sectionId)
      await updateDoc(sectionRef, {
        sectionOrder: newOrder,
        updatedAt: new Date(),
      })

      // Update local state
      const section = sections.value.find((s) => s.id === sectionId)
      if (section) {
        section.sectionOrder = newOrder
      }

      // Re-sort sections
      sections.value.sort((a, b) => a.sectionOrder - b.sectionOrder)
    } catch (err) {
      console.error('Error updating section order:', err)
      throw err
    }
  }

  // Get section by ID
  const getSectionById = (id) => {
    return sections.value.find((s) => s.id === id)
  }

  // Get section by sectionId
  const getSectionBySectionId = (sectionId) => {
    return sections.value.find((s) => s.sectionId === sectionId)
  }

  return {
    // State
    sections,
    loading,
    error,
    selectedSection,

    // Getters
    sectionCount,

    // Actions
    fetchSections,
    addSection,
    updateSection,
    deleteSection,
    updateSectionOrder,
    setSelectedSection,
    getSectionById,
    getSectionBySectionId,
  }
})
