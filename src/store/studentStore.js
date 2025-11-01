import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { COLLECTIONS } from '../constants/dbCollections'

export const useStudentStore = defineStore('student', () => {
  // 🔹 STATE
  const students = ref([])
  const loading = ref(false)
  const error = ref(null)

  // 🔹 GETTERS
  const studentCount = computed(() => students.value.length)

  // 🔹 ACTIONS
  const fetchStudents = async () => {
    loading.value = true
    error.value = null
    try {
      const q = query(
        collection(db, COLLECTIONS.USERS),
        where('role', '==', 'student')
      )
      const snapshot = await getDocs(q)
      students.value = snapshot.docs.map((doc, index) => ({
        id: doc.id,
        ...doc.data(),
        rowNumber: index + 1,
      }))
      console.log("Students from Firestore:", students.value)
    } catch (err) {
      error.value = err.message
      console.error('Error fetching students:', err)
    } finally {
      loading.value = false
    }
  }

  const addStudent = async (studentData) => {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.USERS), {
        ...studentData,
        role: 'student',
      })
      students.value.push({ id: docRef.id, ...studentData, role: 'student' })
    } catch (err) {
      console.error('Error adding student:', err)
      throw err
    }
  }

  const updateStudent = async (id, newData) => {
    try {
      const studentRef = doc(db, COLLECTIONS.USERS, id)
      await updateDoc(studentRef, newData)
      const index = students.value.findIndex((s) => s.id === id)
      if (index !== -1) {
        students.value[index] = { ...students.value[index], ...newData }
      }
    } catch (err) {
      console.error('Error updating student:', err)
      throw err
    }
  }

  const deleteStudent = async (id) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.USERS, id))
      students.value = students.value.filter((s) => s.id !== id)
    } catch (err) {
      console.error('Error deleting student:', err)
      throw err
    }
  }

  return {
    // state
    students,
    loading,
    error,

    // getters
    studentCount,

    // actions
    fetchStudents,
    addStudent,
    updateStudent,
    deleteStudent,
  }
})
