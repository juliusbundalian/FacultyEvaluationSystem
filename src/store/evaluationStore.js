import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { collection, getDocs, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { COLLECTIONS } from '../constants/dbCollections'

export const useEvaluationStore = defineStore('evaluation', () => {
  // 🔹 STATE
  const evaluations = ref([])
  const loading = ref(false)
  const error = ref(null)

  // 🔹 GETTERS
  const evaluationCount = computed(() => evaluations.value.length)

  // 🔹 ACTIONS
  const fetchEvaluations = async () => {
    loading.value = true
    error.value = null
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.EVALUATIONS))
      evaluations.value = snapshot.docs.map((doc, index) => ({
        id: doc.id,
        ...doc.data(),
        rowNumber: index + 1,
      }))
      console.log("Evaluations from Firestore:", evaluations.value)
    } catch (err) {
      error.value = err.message
      console.error('Error fetching Evaluations:', err)
    } finally {
      loading.value = false
    }
  }

  const addEvaluation = async (evaluationData) => {
    try {
      // Ensure we have the latest evaluations so we can compute the next sequential ID
      await fetchEvaluations()

      // Extract numeric suffixes from existing ids like 'eval-001'
      const numbers = evaluations.value
        .map((e) => {
          const m = typeof e.id === 'string' && e.id.match(/^eval-(\d+)$/)
          return m ? parseInt(m[1], 10) : null
        })
        .filter((n) => n !== null)

      const max = numbers.length ? Math.max(...numbers) : 0
      const next = max + 1
      const newId = `eval-${String(next).padStart(3, '0')}`

      // Create the document with the new sequential ID
      const docRef = doc(db, COLLECTIONS.EVALUATIONS, newId)
      await setDoc(docRef, { ...evaluationData, id: newId })

      // Append locally so UI updates immediately
      evaluations.value.push({ ...evaluationData, id: newId })
    } catch (err) {
      console.error('Error adding Evaluation:', err)
      throw err
    }
  }


  const updateEvaluation = async (id, newData) => {
    try {
      const evaluationRef = doc(db, COLLECTIONS.EVALUATIONS, id)
      await updateDoc(evaluationRef, newData)
      const index = evaluations.value.findIndex((s) => s.id === id)
      if (index !== -1) {
        evaluations.value[index] = { ...evaluations.value[index], ...newData }
      }
    } catch (err) {
      console.error('Error updating Evaluation:', err)
      throw err
    }
  }

  const deleteEvaluation = async (id) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.EVALUATIONS, id))
      evaluations.value = evaluations.value.filter((s) => s.id !== id)
    } catch (err) {
      console.error('Error deleting Evaluation:', err)
      throw err
    }
  }

  return {
    // state
    evaluations,
    loading,
    error,

    // getters
    evaluationCount,

    // actions
    fetchEvaluations,
    addEvaluation,
    updateEvaluation,
    deleteEvaluation,
  }
})
