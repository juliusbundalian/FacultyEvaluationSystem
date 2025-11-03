import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  updateDoc,
  addDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { COLLECTIONS } from '../constants/dbCollections'

export const useCriteriaStore = defineStore('criteria', () => {
  const criterias = ref([])
  const loading = ref(false)
  const error = ref(null)
  const selectedCriteria = ref(null)

  const criteriaCount = computed(() => criterias.value.length)

  // Helper to get criterias for a specific section
  const getCriteriasBySection = computed(() => (sectionId) => {
    return criterias.value.filter((c) => c.sectionId === sectionId)
  })

  // Helper to get criterias without section (Students-to-Faculty)
  const getLegacyCriterias = computed(() => {
    return criterias.value.filter((c) => !c.sectionId)
  })

  const setSelectedCriteria = (criteria) => {
    selectedCriteria.value = criteria
  }

  const fetchCriterias = async (sectionId = null) => {
    loading.value = true
    error.value = null
    try {
      let q
      if (sectionId) {
        // Filter by sectionId for hierarchical types
        q = query(collection(db, COLLECTIONS.CRITERIAS), where('sectionId', '==', sectionId))
      } else {
        // Get all criterias without sectionId (legacy Students-to-Faculty)
        // For backward compatibility, get all docs and filter client-side
        q = collection(db, COLLECTIONS.CRITERIAS)
      }

      const snapshot = await getDocs(q)
      let criteriasData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      // If sectionId is null, filter client-side for criterias without sectionId
      if (!sectionId) {
        criteriasData = criteriasData.filter((criteria) => !criteria.sectionId)
      }

      // Sort client-side by criteriaOrder
      criteriasData.sort((a, b) => (a.criteriaOrder || 0) - (b.criteriaOrder || 0))

      // Add row numbers after sorting
      criterias.value = criteriasData.map((criteria, index) => ({
        ...criteria,
        rowNumber: index + 1,
      }))
    } catch (err) {
      error.value = err.message
      console.error('Error fetching criterias:', err)
    } finally {
      loading.value = false
    }
  }

  // ADD criteria
  const addCriteria = async (criteriaName, sectionId = null, status = 'Active') => {
    try {
      console.log('🔍 addCriteria called with:', { criteriaName, sectionId, status })
      console.log('🔍 Current criterias.value:', criterias.value)

      // Calculate order based on criterias for this section (or global if no section)
      const currentCriteriasForContext = criterias.value.filter((c) => {
        if (sectionId) {
          return c.sectionId === sectionId
        } else {
          return !c.sectionId || c.sectionId === null
        }
      })

      console.log('🔍 Filtered criterias for context:', currentCriteriasForContext)
      const newOrder = currentCriteriasForContext.length + 1

      // Generate ID based on context
      let newId
      if (sectionId) {
        newId = `${sectionId}-crit-${String(newOrder).padStart(3, '0')}`
      } else {
        // For global criterias, check all non-sectioned criterias
        const globalCriterias = criterias.value.filter((c) => !c.sectionId || c.sectionId === null)
        const globalOrder = globalCriterias.length + 1
        newId = `crit-${String(globalOrder).padStart(3, '0')}`
      }

      console.log('🔍 Generated criteriaId:', newId)

      const newCriteria = {
        criteriaId: newId,
        criteriaName,
        criteriaOrder: newOrder,
        sectionId, // null for Students-to-Faculty, sectionId for hierarchical types
        status,
        createdAt: new Date(),
      }

      console.log('🔍 New criteria object:', newCriteria)

      const docRef = await addDoc(collection(db, COLLECTIONS.CRITERIAS), newCriteria)
      criterias.value.push({ id: docRef.id, ...newCriteria })
    } catch (err) {
      console.error('Error adding criteria:', err)
    }
  }

  // UPDATE criteria
  const updateCriteria = async (id, updates) => {
    try {
      const criteriaRef = doc(db, COLLECTIONS.CRITERIAS, id)
      await updateDoc(criteriaRef, updates)

      const index = criterias.value.findIndex((c) => c.id === id)
      if (index !== -1) {
        criterias.value[index] = { ...criterias.value[index], ...updates }
      }
    } catch (err) {
      console.error('Error updating criteria:', err)
    }
  }

  // DELETE criteria
  const deleteCriteria = async (id) => {
    try {
      const criteriaToDelete = criterias.value.find((c) => c.id === id)
      const sectionId = criteriaToDelete?.sectionId || null

      await deleteDoc(doc(db, COLLECTIONS.CRITERIAS, id))
      criterias.value = criterias.value.filter((c) => c.id !== id)

      // 🔄 Reorder remaining criterias within the same context (section or global)
      const contextCriterias = criterias.value.filter(
        (c) => (sectionId && c.sectionId === sectionId) || (!sectionId && !c.sectionId),
      )

      contextCriterias.forEach((c, idx) => {
        c.criteriaOrder = idx + 1
        updateDoc(doc(db, COLLECTIONS.CRITERIAS, c.id), { criteriaOrder: c.criteriaOrder })
      })
    } catch (err) {
      console.error('Error deleting criteria:', err)
    }
  }

  // Fetch ALL criterias including those with sectionIds (for faculty evaluations)
  const fetchAllCriterias = async () => {
    loading.value = true
    error.value = null
    try {
      const q = collection(db, COLLECTIONS.CRITERIAS)
      const snapshot = await getDocs(q)
      let criteriasData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      // Sort client-side by criteriaOrder
      criteriasData.sort((a, b) => (a.criteriaOrder || 0) - (b.criteriaOrder || 0))

      // Add row numbers after sorting
      criterias.value = criteriasData.map((criteria, index) => ({
        ...criteria,
        rowNumber: index + 1,
      }))

      console.log('📋 Fetched all criterias:', criterias.value)
    } catch (err) {
      error.value = err.message
      console.error('Error fetching all criterias:', err)
    } finally {
      loading.value = false
    }
  }

  return {
    criterias,
    loading,
    error,
    criteriaCount,
    getCriteriasBySection,
    getLegacyCriterias,
    selectedCriteria,
    fetchCriterias,
    fetchAllCriterias,
    setSelectedCriteria,
    addCriteria,
    updateCriteria,
    deleteCriteria,
  }
})
