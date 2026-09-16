import { createWebHistory, createRouter } from 'vue-router'

import Transactions from './views/transactions/Page.vue'
import Categories from './views/categories/Page.vue'
import Dashboard from './views/dashboard/Page.vue'
import Accounts from './views/accounts/Page.vue'
import Profile from './views/profile/Page.vue'
import Settings from './views/settings/Page.vue'
import DashboardLayout from './views/dashboard/Layout.vue'
import Login from './views/auth/Login.vue'
import Signup from './views/auth/Signup.vue'
import Onboarding from './views/onboarding/Page.vue'
import NotFound from './views/NotFound.vue'
import supabase from './lib/supabase'

declare module 'vue-router' {
  interface RouteMeta {
    breadcrumb?: Array<{
      title: string
      href?: string // Opcional porque el último item no necesita href
    }>
    requiresAuth?: boolean
  }
}

export const routes = [
  {
    path: '/onboarding',
    component: Onboarding,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: '/',
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
            { title: 'Presupuestos' }
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
      {
        path: 'categories',
        component: Categories,
        meta: {
          breadcrumb: [
            { title: 'Dashboard', href: '/' },
            { title: 'Categorías' }
          ]
        }
      },
      {
        path: 'profile',
        component: Profile,
        meta: {
          breadcrumb: [
            { title: 'Dashboard', href: '/' },
            { title: 'Mi Perfil' }
          ]
        }
      },
      {
        path: 'settings',
        component: Settings,
        meta: {
          breadcrumb: [
            { title: 'Dashboard', href: '/' },
            { title: 'Configuración' }
          ]
        }
      },
    ]
  },
  {
    path: '/login',
    component: Login
  },
  {
    path: '/signup',
    component: Signup
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
    meta: {
      requiresAuth: false
    }
  }
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
    next('/')
  } else {
    next()
  }
})

export default router