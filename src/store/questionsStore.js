import { defineStore } from 'pinia'
import { ref } from 'vue'
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

export const useQuestionStore = defineStore('question', () => {
  const questions = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Fetch questions by criteriaId
  const fetchQuestionsByCriteria = async (criteriaId) => {
    loading.value = true
    error.value = null
    try {
      const q = query(collection(db, COLLECTIONS.QUESTIONS), where('criteriaId', '==', criteriaId))
      const snapshot = await getDocs(q)
      questions.value = snapshot.docs.map((doc, index) => ({
        id: doc.id,
        ...doc.data(),
        rowNumber: index + 1,
      }))
    } catch (err) {
      error.value = err.message
      console.error('Error fetching questions:', err)
    } finally {
      loading.value = false
    }
  }

  const addQuestion = async (newQuestion) => {
    try {
      // First, get all questions to calculate the correct next ID
      const allQuestionsSnapshot = await getDocs(collection(db, COLLECTIONS.QUESTIONS))
      const allQuestions = allQuestionsSnapshot.docs.map((doc) => doc.data())

      // Find the highest existing question number
      let maxQuestionNumber = 0
      allQuestions.forEach((q) => {
        if (q.questionId && q.questionId.startsWith('q-')) {
          const num = parseInt(q.questionId.replace('q-', ''))
          if (!isNaN(num) && num > maxQuestionNumber) {
            maxQuestionNumber = num
          }
        }
      })

      // Generate the next ID
      const nextId = maxQuestionNumber + 1
      const questionId = `q-${String(nextId).padStart(3, '0')}`

      // Update the newQuestion object with the correct ID and order
      const questionToAdd = {
        ...newQuestion,
        questionId,
        questionOrder: nextId,
      }

      console.log('🔍 Generated questionId:', questionId)
      console.log('🔍 Question to add:', questionToAdd)

      const docRef = await addDoc(collection(db, COLLECTIONS.QUESTIONS), questionToAdd)
      questions.value.push({ id: docRef.id, ...questionToAdd })
    } catch (err) {
      console.error('Error adding question:', err)
      throw err
    }
  }

  const updateQuestion = async (id, updatedFields) => {
    try {
      const questionRef = doc(db, COLLECTIONS.QUESTIONS, id)
      await updateDoc(questionRef, updatedFields)

      const index = questions.value.findIndex((q) => q.id === id)
      if (index !== -1) {
        questions.value[index] = { ...questions.value[index], ...updatedFields }
      }
    } catch (err) {
      console.error('Error updating question:', err)
      throw err
    }
  }

  const deleteQuestion = async (id) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.QUESTIONS, id))
      questions.value = questions.value.filter((q) => q.id !== id)
    } catch (err) {
      console.error('Error deleting question:', err)
    }
  }

  return {
    questions,
    loading,
    error,
    fetchQuestionsByCriteria,
    addQuestion,
    deleteQuestion,
    updateQuestion,
  }
})
