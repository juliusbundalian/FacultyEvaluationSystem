import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/store/authStore'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'AuthView',
      component: () => import('@/views/AuthenticationView.vue'),
      children: [
        { path: '', component: () => import('@/views/Authentication/Login.vue') },
        { path: 'register', component: () => import('@/views/Authentication/Register.vue') },
        {
          path: 'forgotpassword',
          component: () => import('@/views/Authentication/ForgotPassword.vue'),
        },
      ],
    },
    {
      path: '/evaluations',
      component: () => import('@/views/Evaluators/EvaluationsLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'EvaluatorsView',
          component: () => import('@/views/Evaluators/EvaluatorsView.vue'),
        },
        {
          path: 'evaluation/:evaluationId/teacher/:teacherId',
          name: 'StudentEvaluation',
          component: () => import('@/views/Evaluation/StudentEvaluation.vue'),
        },
        {
          path: 'evaluation/:evaluationId/teacher/:teacherId/view',
          name: 'StudentEvaluationView',
          component: () => import('@/views/Evaluation/StudentEvaluationView.vue'),
        },
      ],
    },
    {
      path: '/main',
      name: 'MainView',
      component: () => import('@/views/MainView.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', component: () => import('@/views/DashboardView.vue') },
        { path: 'users', component: () => import('@/views/User/UserView.vue') },
        { path: 'evaluation', component: () => import('@/views/Evaluation/EvaluationView.vue') },
        {
          path: 'evaluation/:evaluationId/summary',
          name: 'EvaluationSummary',
          component: () => import('@/views/Evaluation/EvaluationSummary.vue'),
        },
        {
          path: 'evaluation/:evaluationId/teacher/:teacherId/view',
          name: 'StudentEvaluationViewMain',
          component: () => import('@/views/Evaluation/StudentEvaluationView.vue'),
        },
        {
          path: 'form',
          name: 'EvaluationFormView',
          component: () => import('@/views/EvaluationForm/EvaluationFormView.vue'),
          children: [
            { path: '', component: () => import('@/views/EvaluationForm/Criterias.vue') },
            { path: 'questions', component: () => import('@/views/EvaluationForm/Questions.vue') },
          ],
        },
        { path: 'faculty', component: () => import('@/views/Faculty/FacultyView.vue') },
        { path: 'students', component: () => import('@/views/Student/StudentView.vue') },
      ],
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  if (authStore.loading) {
    await new Promise((resolve) => {
      const unwatch = authStore.$subscribe(() => {
        if (!authStore.loading) {
          unwatch()
          resolve()
        }
      })
    })
  }

  const isAuth = authStore.isAuthenticated
  const requiresAuth = to.meta.requiresAuth

  if (requiresAuth && !isAuth) {
    return next('/')
  }
  if ((isAuth && to.path === '/') || to.path === '/register' || to.path === '/forgotpassword') {
    return next('/main')
  }

  next()
})

export default router
