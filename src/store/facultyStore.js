import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { COLLECTIONS } from '../constants/dbCollections'

export const useFacultyStore = defineStore('faculty', () => {
  // 🔹 STATE
  const faculties = ref([])
  const loading = ref(false)
  const error = ref(null)

  // 🔹 GETTERS
  const facultyCount = computed(() => faculties.value.length)

  // 🔹 ACTIONS
  const fetchFaculty = async () => {
    loading.value = true
    error.value = null
    try {
      const q = query(
        collection(db, COLLECTIONS.USERS),
        where('role', '==', 'teacher')
      )
      const snapshot = await getDocs(q)
      faculties.value = snapshot.docs.map((doc, index) => ({
        id: doc.id,
        ...doc.data(),
        rowNumber: index + 1,
      }))
      console.log("Faculty from Firestore:", faculties.value)
    } catch (err) {
      error.value = err.message
      console.error('Error fetching faculties:', err)
    } finally {
      loading.value = false
    }
  }

  const addFaculty = async (facultyData) => {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.USERS), {
        ...facultyData,
        role: 'teacher',
      })
      faculties.value.push({ id: docRef.id, ...facultyData, role: 'teacher' })
    } catch (err) {
      console.error('Error adding faculty:', err)
      throw err
    }
  }

  const updateFaculty = async (id, newData) => {
    try {
      const facultyRef = doc(db, COLLECTIONS.USERS, id)
      await updateDoc(facultyRef, newData)
      const index = faculties.value.findIndex((s) => s.id === id)
      if (index !== -1) {
        faculties.value[index] = { ...faculties.value[index], ...newData }
      }
    } catch (err) {
      console.error('Error updating faculty:', err)
      throw err
    }
  }

  const deleteFaculty = async (id) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.USERS, id))
      faculties.value = faculties.value.filter((s) => s.id !== id)
    } catch (err) {
      console.error('Error deleting faculty:', err)
      throw err
    }
  }

  return {
    // state
    faculties,
    loading,
    error,

    // getters
    facultyCount,

    // actions
    fetchFaculty,
    addFaculty,
    updateFaculty,
    deleteFaculty,
  }
})
