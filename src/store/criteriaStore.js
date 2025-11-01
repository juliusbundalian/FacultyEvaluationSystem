import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { collection, getDocs, query, deleteDoc, doc, updateDoc, addDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { COLLECTIONS } from '../constants/dbCollections'

export const useCriteriaStore = defineStore('criteria', () => {
  const criterias = ref([])
  const loading = ref(false)
  const error = ref(null)
  const selectedCriteria = ref(null)

  const criteriaCount = computed(() => criterias.value.length)

  const setSelectedCriteria = (criteria) => {
    selectedCriteria.value = criteria
  }

  const fetchCriterias = async () => {
    loading.value = true
    error.value = null
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.CRITERIAS))
      criterias.value = snapshot.docs.map((doc, index) => ({
        id: doc.id,
        ...doc.data(),
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
  const addCriteria = async (criteriaName, status = 'Active') => {
    try {
      const newOrder = criterias.value.length + 1
      const newId = `crit-${String(newOrder).padStart(3, '0')}`

      const newCriteria = {
        criteriaId: newId,
        criteriaName,
        criteriaOrder: newOrder,
        status,
      }

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

      const index = criterias.value.findIndex(c => c.id === id)
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
      await deleteDoc(doc(db, COLLECTIONS.CRITERIAS, id))
      criterias.value = criterias.value.filter(c => c.id !== id)

      // 🔄 Reorder remaining criterias
      criterias.value.forEach((c, idx) => {
        c.criteriaOrder = idx + 1
        updateDoc(doc(db, COLLECTIONS.CRITERIAS, c.id), { criteriaOrder: c.criteriaOrder })
      })
    } catch (err) {
      console.error('Error deleting criteria:', err)
    }
  }

  return {
    criterias,
    loading,
    error,
    criteriaCount,
    selectedCriteria,
    fetchCriterias,
    setSelectedCriteria,
    addCriteria,
    updateCriteria,
    deleteCriteria,
  }
})
