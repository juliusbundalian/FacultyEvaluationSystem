import { defineStore } from 'pinia'
import { ref } from 'vue'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/firebase'
import { COLLECTIONS } from '@/constants/dbCollections'

export const useEnrollmentStore = defineStore('enrollment', () => {
  const enrollments = ref([])
  const loading = ref(false)
  const error = ref(null)

  const fetchEnrollmentsByStudentId = async (studentId) => {
    loading.value = true
    error.value = null
    try {
      const q = query(
        collection(db, COLLECTIONS.ENROLLMENTS),
        where('studentId', '==', studentId)
      )
      const snapshot = await getDocs(q)
      enrollments.value = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    } catch (err) {
      console.error('Error fetching enrollments:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  return {
    enrollments,
    loading,
    error,
    fetchEnrollmentsByStudentId,
  }
})
