import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../firebase'
import { COLLECTIONS } from '../constants/dbCollections'

export const useUserStore = defineStore('user', () => {
  // 🔹 STATE
  const users = ref([])
  const loading = ref(false)
  const error = ref(null)

  // 🔹 GETTERS (computed values)
  const userCount = computed(() => users.value.length)

  // 🔹 ACTIONS
  const fetchUsers = async () => {
    loading.value = true
    error.value = null
    try {
      const q = query(collection(db, COLLECTIONS.USERS), where('role', '==', 'Admin'))
      const snapshot = await getDocs(q)
      users.value = snapshot.docs.map((doc, index) => ({
        id: doc.id,
        ...doc.data(),
        rowNumber: index + 1,
      }))
      console.log('Users from Firestore:', users.value)
    } catch (err) {
      error.value = err.message
      console.error('Error fetching users:', err)
    } finally {
      loading.value = false
    }
  }

  const fetchAllUsers = async () => {
    loading.value = true
    error.value = null
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.USERS))
      users.value = snapshot.docs.map((doc, index) => ({
        id: doc.id,
        ...doc.data(),
        rowNumber: index + 1,
      }))
      console.log('All users from Firestore:', users.value)
    } catch (err) {
      error.value = err.message
      console.error('Error fetching all users:', err)
    } finally {
      loading.value = false
    }
  }

  const addUser = async (userData) => {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.USERS), userData)
      users.value.push({ id: docRef.id, ...userData })
    } catch (err) {
      console.error('Error adding user:', err)
      throw err
    }
  }

  const updateUser = async (id, newData) => {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, id)
      await updateDoc(userRef, newData)
      const index = users.value.findIndex((u) => u.id === id)
      if (index !== -1) {
        users.value[index] = { ...users.value[index], ...newData }
      }
    } catch (err) {
      console.error('Error updating user:', err)
      throw err
    }
  }

  const deleteUser = async (id) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.USERS, id))
      users.value = users.value.filter((u) => u.id !== id)
    } catch (err) {
      console.error('Error deleting user:', err)
      throw err
    }
  }

  return {
    // state
    users,
    loading,
    error,

    // getters
    userCount,

    // actions
    fetchUsers,
    fetchAllUsers,
    addUser,
    updateUser,
    deleteUser,
  }
})
