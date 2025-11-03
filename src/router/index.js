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
          path: 'evaluation/:evaluationId/teacher/:teacherId/:evaluationType?',
          name: 'StudentEvaluation',
          component: () => import('@/views/Evaluation/StudentEvaluation.vue'),
        },
        {
          path: 'evaluation/:evaluationId/teacher/:teacherId/:evaluationType?/view',
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
          path: 'evaluation/:evaluationId/teacher/:teacherId/:evaluationType?/view',
          name: 'StudentEvaluationViewMain',
          component: () => import('@/views/Evaluation/StudentEvaluationView.vue'),
        },
        {
          path: 'form',
          name: 'EvaluationFormView',
          component: () => import('@/views/EvaluationForm/EvaluationFormView.vue'),
          children: [
            {
              path: '',
              name: 'DefaultCriterias',
              component: () => import('@/views/EvaluationForm/Criterias.vue'),
              meta: { hierarchy: 'simple' },
            },
            {
              path: 'criterias',
              name: 'Criterias',
              component: () => import('@/views/EvaluationForm/Criterias.vue'),
              meta: { hierarchy: 'simple' },
            },
            {
              path: 'sections',
              name: 'Sections',
              component: () => import('@/views/EvaluationForm/Sections.vue'),
              meta: { hierarchy: 'hierarchical', level: 1 },
            },
            {
              path: 'sections/:sectionId/criterias',
              name: 'SectionCriterias',
              component: () => import('@/views/EvaluationForm/Criterias.vue'),
              meta: { hierarchy: 'hierarchical', level: 2 },
              props: (route) => ({ sectionId: route.params.sectionId }),
            },
            {
              path: 'criterias/:criteriaId/questions',
              name: 'CriteriaQuestions',
              component: () => import('@/views/EvaluationForm/Questions.vue'),
              meta: { hierarchy: 'simple', level: 2 },
              props: (route) => ({ criteriaId: route.params.criteriaId }),
            },
            {
              path: 'sections/:sectionId/criterias/:criteriaId/questions',
              name: 'HierarchicalQuestions',
              component: () => import('@/views/EvaluationForm/Questions.vue'),
              meta: { hierarchy: 'hierarchical', level: 3 },
              props: (route) => ({
                sectionId: route.params.sectionId,
                criteriaId: route.params.criteriaId,
              }),
            },
            {
              path: 'questions',
              name: 'Questions',
              component: () => import('@/views/EvaluationForm/Questions.vue'),
              meta: { hierarchy: 'simple' },
            },
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

  // Wait for auth store to initialize if it's still loading
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

  // Route validation for hierarchical navigation
  if (to.matched.some((record) => record.meta.hierarchy)) {
    const routeMeta = to.meta

    // Validate hierarchical routes have required parameters
    if (routeMeta.hierarchy === 'hierarchical') {
      if (routeMeta.level === 2 && !to.params.sectionId) {
        // Section criterias route needs sectionId
        return next('/main/form/sections')
      }
      if (routeMeta.level === 3 && (!to.params.sectionId || !to.params.criteriaId)) {
        // Hierarchical questions route needs both sectionId and criteriaId
        return next('/main/form/sections')
      }
    }

    // Validate simple routes
    if (routeMeta.hierarchy === 'simple' && routeMeta.level === 2 && !to.params.criteriaId) {
      // Simple questions route needs criteriaId
      return next('/main/form/criterias')
    }
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
