<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { BudgetGoal, Transaction } from '@/types'
import type { PostgrestError } from '@supabase/supabase-js'
import * as budgetGoalsService from '@/services/budgetGoals'
import * as transactionsService from '@/services/transactions'
import { type BudgetGoalWithMetrics } from './columns'
import Table from './Table.vue'
import Button from '@/components/ui/button/Button.vue'
import Create from './Create.vue'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/formatters'
import BsHint from '@/components/BsHint.vue'
import { Target, TrendingDown, Wallet, AlertTriangle, Plus } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const goals = ref<BudgetGoal[]>([])
const currentMonthTransactions = ref<Transaction[]>([])
const loading = ref(true)
const error = ref<PostgrestError | null>(null)

const fetchData = async () => {
  const now = new Date()
  const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString()
  const endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1)).toISOString()

  const [goalsData, monthTx] = await Promise.all([
    budgetGoalsService.getAll(),
    transactionsService.getAll({ startISO: startOfMonth, endISO: endOfMonth }),
  ])

  goals.value = goalsData
  currentMonthTransactions.value = monthTx
}

onMounted(async () => {
  try {
    loading.value = true
    await fetchData()
  } catch (err: any) {
    error.value = err as PostgrestError
    console.error('Error fetching budget goals data:', err)
    toast.error('Error al cargar metas de gasto', {
      description: err?.message || 'No se pudieron sincronizar las metas de gasto'
    })
  } finally {
    loading.value = false
  }
})

const goalsWithMetrics = computed<BudgetGoalWithMetrics[]>(() => {
  return goals.value.map((goal) => {
    const spent = currentMonthTransactions.value
      .filter((t) => t.category_id === goal.category_id)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    const available = goal.amount - spent
    const spentRatio = goal.amount > 0 ? (spent / goal.amount) * 100 : 0

    return { ...goal, spent, available, spentRatio }
  })
})

const totalBudgeted = computed(() => goalsWithMetrics.value.reduce((sum, g) => sum + g.amount, 0))
const totalSpent = computed(() => goalsWithMetrics.value.reduce((sum, g) => sum + g.spent, 0))
const totalAvailable = computed(() => totalBudgeted.value - totalSpent.value)
const overBudgetCount = computed(() => goalsWithMetrics.value.filter((g) => g.spentRatio > 100).length)

const open = ref(false)
const editingGoal = ref<BudgetGoal | null>(null)

const hide = () => {
  open.value = false
  editingGoal.value = null
}

const openCreate = () => {
  editingGoal.value = null
  open.value = true
}

const openEdit = (goal: BudgetGoal) => {
  editingGoal.value = goal
  open.value = true
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 class="text-xl font-bold tracking-tight">Metas de Gasto</h1>
        <p class="text-xs text-muted-foreground mt-0.5">
          Límite mensual de gasto por categoría, con alerta cuando te acercas o te pasas.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button @click="openCreate" class="gap-1.5 shadow-sm">
          <Plus class="h-4 w-4" />
          Nueva Meta
        </Button>
      </div>
    </div>

    <!-- Summary Metrics Cards -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card class="border shadow-xs p-0">
        <CardContent class="p-4 flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted-foreground">Total Presupuestado (mes)</p>
            <h3 class="text-lg font-bold mt-0.5">{{ formatCurrency(totalBudgeted) }}</h3>
            <BsHint :value="totalBudgeted" />
          </div>
          <div class="p-2.5 rounded-full bg-primary/10 text-primary">
            <Wallet class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card class="border shadow-xs p-0">
        <CardContent class="p-4 flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted-foreground">Gastado este Mes</p>
            <h3 class="text-lg font-bold text-rose-500 mt-0.5">{{ formatCurrency(totalSpent) }}</h3>
            <BsHint :value="totalSpent" />
          </div>
          <div class="p-2.5 rounded-full bg-rose-500/10 text-rose-500">
            <TrendingDown class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card class="border shadow-xs p-0">
        <CardContent class="p-4 flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted-foreground">Disponible Total</p>
            <h3
              class="text-lg font-bold mt-0.5"
              :class="totalAvailable >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'"
            >
              {{ formatCurrency(totalAvailable) }}
            </h3>
            <BsHint :value="totalAvailable" />
          </div>
          <div class="p-2.5 rounded-full bg-primary/10 text-primary">
            <Target class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card class="border shadow-xs p-0">
        <CardContent class="p-4 flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted-foreground">Metas Excedidas</p>
            <h3
              class="text-lg font-bold mt-0.5"
              :class="overBudgetCount > 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'"
            >
              {{ overBudgetCount }}
            </h3>
            <span class="text-[11px] font-medium text-muted-foreground">de {{ goals.length }} metas activas</span>
          </div>
          <div class="p-2.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertTriangle class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Table -->
    <div v-if="loading" class="text-sm text-muted-foreground py-8 text-center">Cargando metas de gasto...</div>
    <div v-else-if="error" class="text-sm text-destructive py-4">Error: {{ error.message }}</div>
    <div v-else>
      <Table
        :goals="goalsWithMetrics"
        @edit="openEdit"
        @delete="fetchData"
      />
    </div>
  </div>

  <Create
    :open="open"
    :hide="hide"
    :goal="editingGoal"
    @reload="fetchData"
  />
</template>
