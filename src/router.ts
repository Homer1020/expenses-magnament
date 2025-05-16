import { createWebHistory, createRouter } from 'vue-router'

import HomeView from './views/Home.vue'
import Transactions from './views/transactions/Page.vue'
import Dashboard from './views/dashboard/Page.vue'
import Accounts from './views/accounts/Page.vue'
import DashboardLayout from './views/dashboard/Layout.vue'
import Login from './views/auth/Login.vue'
import supabase from './lib/supabase'

declare module 'vue-router' {
  interface RouteMeta {
    breadcrumb?: Array<{
      title: string
      href?: string // Opcional porque el último item no necesita href
    }>
  }
}

export const routes = [
  {
    path: '/',
    component: HomeView,
    meta: {
      breadcrumb: [
        { title: 'Dashboard' },
      ]
    }
  },
  {
    path: '/login',
    component: Login
  },
  {
    path: '/dashboard',
    component: DashboardLayout,
    meta: {
      requiresAuth: true
    },
    children: [
      {
        path: '',
        component: Dashboard,
        meta: {
          breadcrumb: [
            { title: 'Dashboard' },
          ]
        },
      },
      {
        path: 'accounts',
        component: Accounts,
        meta: {
          breadcrumb: [
            { title: 'Dashboard', href: '/' },
            { title: 'Cuentas' }
          ]
        }
      },
      {
        path: 'transactions',
        component: Transactions,
        meta: {
          breadcrumb: [
            { title: 'Dashboard', href: '/' },
            { title: 'Transacciones' }
          ]
        }
      },
    ]
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to, _, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const { data: { user } } = await supabase.auth.getUser();

  if (requiresAuth && !user) {
    next('/login')
  } else if ((to.path === '/login' || to.path === '/signup') && user) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router