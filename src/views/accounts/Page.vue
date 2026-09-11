<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Account, Transaction } from '@/types'
import type { PostgrestError } from '@supabase/supabase-js'
import * as accountsService from '@/services/accounts'
import * as transactionsService from '@/services/transactions'
import { PRESET_ACCOUNT_GROUPS } from '@/constants/presets'
import supabase from '@/lib/supabase'
import { type AccountWithMetrics, type PeriodView } from './columns'
import Table from './Table.vue'
import Button from '@/components/ui/button/Button.vue'
import Create from './Create.vue'
import { Card, CardContent } from '@/components/ui/card'
import Select from '@/components/ui/select/Select.vue'
import SelectContent from '@/components/ui/select/SelectContent.vue'
import SelectGroup from '@/components/ui/select/SelectGroup.vue'
import SelectItem from '@/components/ui/select/SelectItem.vue'
import SelectTrigger from '@/components/ui/select/SelectTrigger.vue'
import SelectValue from '@/components/ui/select/SelectValue.vue'
import { formatCurrency } from '@/lib/formatters'
import { Wallet, TrendingDown, PiggyBank, Sparkles, Loader2 } from 'lucide-vue-next'
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

// Period filter: 'month' shows current-month figures, 'accumulated' shows all-time figures
const periodView = ref<PeriodView>('month')

const periodTransactions = computed(() => {
  return periodView.value === 'month' ? currentMonthTransactions.value : allTransactions.value
})

// Metrics calculations
const periodIncome = computed(() => {
  return periodTransactions.value
    .filter((t) => t.categories?.type === 1)
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
})

const accountsWithMetrics = computed<AccountWithMetrics[]>(() => {
  const income = periodIncome.value
  return accounts.value.map((acc) => {
    const allocatedBudget = (income * (acc.percentage || 0)) / 100
    const spent = periodTransactions.value
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

const seedingAccounts = ref(false)

const handleLoadDefaultAccounts = async () => {
  try {
    seedingAccounts.value = true
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const toInsert = PRESET_ACCOUNT_GROUPS[0].accounts.map((a) => ({
      name: a.name,
      percentage: a.percentage,
      user_id: user.id,
    }))

    const { error } = await supabase.from('accounts').insert(toInsert)
    if (error) throw error

    toast.success('¡Presupuestos recomendados cargados con éxito!')
    await fetchData()
  } catch (err: any) {
    console.error('Error al cargar presupuestos recomendados:', err)
    toast.error('Error al cargar presupuestos', {
      description: err?.message || 'Inténtalo de nuevo'
    })
  } finally {
    seedingAccounts.value = false
  }
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
      <div class="flex items-center gap-2">
        <Select v-model="periodView">
          <SelectTrigger class="w-[150px]">
            <SelectValue placeholder="Periodo" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="month">Mes Actual</SelectItem>
              <SelectItem value="accumulated">Acumulado</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Button
          v-if="!loading && accounts.length === 0"
          variant="outline"
          size="sm"
          :disabled="seedingAccounts"
          @click="handleLoadDefaultAccounts"
          class="gap-1.5"
        >
          <Loader2 v-if="seedingAccounts" class="h-4 w-4 animate-spin" />
          <Sparkles v-else class="h-4 w-4 text-primary" />
          <span>Cargar Predeterminados</span>
        </Button>

        <Button @click="openCreate" class="gap-1.5 shadow-sm">
          <Sparkles class="h-4 w-4" />
          Nuevo Presupuesto
        </Button>
      </div>
    </div>

    <!-- Summary Metrics Cards -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Card class="border shadow-xs">
        <CardContent class="p-4 flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted-foreground">
              {{ periodView === 'month' ? 'Ingresos del Mes' : 'Ingresos Acumulados' }}
            </p>
            <h3 class="text-lg font-bold mt-0.5">{{ formatCurrency(periodIncome) }}</h3>
          </div>
          <div class="p-2.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <PiggyBank class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card class="border shadow-xs">
        <CardContent class="p-4 flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted-foreground">
              Total Presupuestado <span class="opacity-60">({{ periodView === 'month' ? 'mes actual' : 'acumulado' }})</span>
            </p>
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
            <p class="text-xs font-medium text-muted-foreground">
              Gastado desde Presupuestos <span class="opacity-60">({{ periodView === 'month' ? 'mes actual' : 'acumulado' }})</span>
            </p>
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
            <p class="text-xs font-medium text-muted-foreground">
              Saldo Disponible Total <span class="opacity-60">({{ periodView === 'month' ? 'mes actual' : 'acumulado' }})</span>
            </p>
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
        :period-view="periodView"
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