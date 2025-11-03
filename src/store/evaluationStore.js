import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { collection, getDocs, updateDoc, deleteDoc, doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { COLLECTIONS } from '../constants/dbCollections'

export const useEvaluationStore = defineStore('evaluation', () => {
  // 🔹 STATE
  const evaluations = ref([])
  const loading = ref(false)
  const error = ref(null)
  let unsubscribe = null

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

  const subscribeEvaluations = () => {
    // tear down any existing subscription first
    if (typeof unsubscribe === 'function') {
      unsubscribe()
      unsubscribe = null
    }
    loading.value = true
    error.value = null
    try {
      unsubscribe = onSnapshot(
        collection(db, COLLECTIONS.EVALUATIONS),
        (snapshot) => {
          evaluations.value = snapshot.docs.map((d, index) => ({ id: d.id, ...d.data(), rowNumber: index + 1 }))
          loading.value = false
        },
        (err) => {
          console.error('Realtime subscription error (Evaluations):', err)
          error.value = err.message
          loading.value = false
        },
      )
    } catch (err) {
      console.error('Error subscribing to Evaluations:', err)
      error.value = err.message
      loading.value = false
    }
  }

  const unsubscribeEvaluations = () => {
    if (typeof unsubscribe === 'function') {
      unsubscribe()
      unsubscribe = null
    }
  }

  const addEvaluation = async (evaluationData) => {
    try {
      // Generate a unique sequential ID and ensure we never overwrite an existing document.
      // Start from the highest observed in-memory number, then probe Firestore for collisions.
      const numbers = evaluations.value
        .map((e) => {
          const m = typeof e.id === 'string' && e.id.match(/^eval-(\d+)$/)
          return m ? parseInt(m[1], 10) : null
        })
        .filter((n) => n !== null)

      let next = numbers.length ? Math.max(...numbers) + 1 : 1
      let newId = `eval-${String(next).padStart(3, '0')}`
      let targetRef = doc(db, COLLECTIONS.EVALUATIONS, newId)

      // Probe until a free ID is found to avoid replacing existing docs
      // This is robust even if the local cache is stale or some IDs are missing our pattern
      // In practice this loop should run just once.
       
      while (true) {
        const snap = await getDoc(targetRef)
        if (!snap.exists()) break
        next += 1
        newId = `eval-${String(next).padStart(3, '0')}`
        targetRef = doc(db, COLLECTIONS.EVALUATIONS, newId)
      }

      await setDoc(targetRef, { ...evaluationData, id: newId })

      // Optimistic local update only if not using realtime subscription
      if (typeof unsubscribe !== 'function') {
        evaluations.value.push({ ...evaluationData, id: newId })
      }
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
    subscribeEvaluations,
    unsubscribeEvaluations,
    addEvaluation,
    updateEvaluation,
    deleteEvaluation,
  }
})
