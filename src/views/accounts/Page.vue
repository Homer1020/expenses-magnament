<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Account, Transaction } from '@/types'
import type { PostgrestError } from '@supabase/supabase-js'
import * as accountsService from '@/services/accounts'
import * as transactionsService from '@/services/transactions'
import { type AccountWithMetrics } from './columns'
import Table from './Table.vue'
import Button from '@/components/ui/button/Button.vue'
import Create from './Create.vue'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/formatters'
import { Wallet, TrendingDown, PiggyBank, Sparkles } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const accounts = ref<Account[]>([])
const allTransactions = ref<Transaction[]>([])
const currentMonthTransactions = ref<Transaction[]>([])
const loading = ref(true)
const error = ref<PostgrestError | null>(null)

const fetchData = async () => {
  const now = new Date()
  const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString()
  const endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1)).toISOString()

  const [accs, allTx] = await Promise.all([
    accountsService.getAll(),
    transactionsService.getAll(),
  ])

  accounts.value = accs
  allTransactions.value = allTx
  currentMonthTransactions.value = allTx.filter((t) => t.date >= startOfMonth && t.date < endOfMonth)
}

onMounted(async () => {
  try {
    loading.value = true
    await fetchData()
  } catch (err: any) {
    error.value = err as PostgrestError
    console.error('Error fetching accounts data:', err)
    toast.error('Error al cargar presupuestos', {
      description: err?.message || 'No se pudieron sincronizar los datos de presupuestos'
    })
  } finally {
    loading.value = false
  }
})

// Metrics calculations
const monthlyIncome = computed(() => {
  return currentMonthTransactions.value
    .filter((t) => t.categories?.type === 1)
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
})

const accountsWithMetrics = computed<AccountWithMetrics[]>(() => {
  const income = monthlyIncome.value
  return accounts.value.map((acc) => {
    const allocatedBudget = (income * (acc.percentage || 0)) / 100
    const spent = currentMonthTransactions.value
      .filter((t) => t.account_id === acc.id && t.categories?.type !== 1)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    const available = allocatedBudget - spent
    const spentRatio = allocatedBudget > 0 ? (spent / allocatedBudget) * 100 : 0

    const fundBalance = allTransactions.value
      .filter((t) => t.account_id === acc.id)
      .reduce((sum, t) => sum + (t.categories?.type === 1 ? Number(t.amount) || 0 : -(Number(t.amount) || 0)), 0)

    return {
      ...acc,
      allocatedBudget,
      spent,
      available,
      spentRatio,
      fundBalance,
    }
  })
})

const totalFundBalance = computed(() => {
  return accountsWithMetrics.value.reduce((sum, a) => sum + a.fundBalance, 0)
})

const totalAllocated = computed(() => {
  return accountsWithMetrics.value.reduce((sum, a) => sum + a.allocatedBudget, 0)
})

const totalSpent = computed(() => {
  return accountsWithMetrics.value.reduce((sum, a) => sum + a.spent, 0)
})

const totalAvailable = computed(() => {
  return accountsWithMetrics.value.reduce((sum, a) => sum + a.available, 0)
})

const totalPercentage = computed(() => {
  return accounts.value.reduce((sum, a) => sum + (a.percentage || 0), 0)
})

const open = ref(false)
const editingAccount = ref<Account | null>(null)

const hide = () => {
  open.value = false
  editingAccount.value = null
}

const openCreate = () => {
  editingAccount.value = null
  open.value = true
}

const openEdit = (account: Account) => {
  editingAccount.value = account
  open.value = true
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold tracking-tight">Presupuestos Mensuales</h1>
        <p class="text-xs text-muted-foreground mt-0.5">
          Distribución porcentual de tus ingresos mensuales y saldos disponibles en tiempo real.
        </p>
      </div>
      <Button @click="openCreate" class="gap-1.5 shadow-sm">
        <Sparkles class="h-4 w-4" />
        Nuevo Presupuesto
      </Button>
    </div>

    <!-- Summary Metrics Cards -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Card class="border shadow-xs">
        <CardContent class="p-4 flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted-foreground">Ingresos del Mes</p>
            <h3 class="text-lg font-bold mt-0.5">{{ formatCurrency(monthlyIncome) }}</h3>
          </div>
          <div class="p-2.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <PiggyBank class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card class="border shadow-xs">
        <CardContent class="p-4 flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted-foreground">Total Presupuestado</p>
            <h3 class="text-lg font-bold mt-0.5">{{ formatCurrency(totalAllocated) }}</h3>
            <span
              class="text-[11px] font-medium"
              :class="totalPercentage === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'"
            >
              {{ totalPercentage }}% asignado
            </span>
          </div>
          <div class="p-2.5 rounded-full bg-primary/10 text-primary">
            <Wallet class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card class="border shadow-xs">
        <CardContent class="p-4 flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted-foreground">Gastado desde Presupuestos</p>
            <h3 class="text-lg font-bold text-rose-500 mt-0.5">{{ formatCurrency(totalSpent) }}</h3>
          </div>
          <div class="p-2.5 rounded-full bg-rose-500/10 text-rose-500">
            <TrendingDown class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card class="border shadow-xs">
        <CardContent class="p-4 flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted-foreground">Saldo Disponible Total</p>
            <h3
              class="text-lg font-bold mt-0.5"
              :class="totalAvailable >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'"
            >
              {{ formatCurrency(totalAvailable) }}
            </h3>
          </div>
          <div class="p-2.5 rounded-full bg-primary/10 text-primary">
            <Wallet class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card class="border shadow-xs">
        <CardContent class="p-4 flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted-foreground">Total en Fondos</p>
            <h3
              class="text-lg font-bold mt-0.5"
              :class="totalFundBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'"
            >
              {{ formatCurrency(totalFundBalance) }}
            </h3>
          </div>
          <div class="p-2.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <PiggyBank class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Table -->
    <div v-if="loading" class="text-sm text-muted-foreground py-8 text-center">Cargando presupuestos...</div>
    <div v-else-if="error" class="text-sm text-destructive py-4">Error: {{ error.message }}</div>
    <div v-else>
      <Table
        :accounts="accountsWithMetrics"
        @edit="openEdit"
        @delete="fetchData"
      />
    </div>
  </div>

  <Create
    :open="open"
    :hide="hide"
    :account="editingAccount"
    @reload="fetchData"
  />
</template>