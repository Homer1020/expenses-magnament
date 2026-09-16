<script setup lang="ts">
import { ref, computed, onMounted, type Ref } from 'vue'
import type { Transaction } from '@/types'
import type { PostgrestError } from '@supabase/supabase-js'
import * as transactionsService from '@/services/transactions'
import Table from './Table.vue'
import Button from '@/components/ui/button/Button.vue'
import Create from './Create.vue'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/formatters'
import BsHint from '@/components/BsHint.vue'
import { CalendarDate } from '@internationalized/date'
import type { DateRange } from 'reka-ui'
import { toast } from 'vue-sonner'
import { TrendingUp, TrendingDown, Wallet, ArrowLeftRight, Plus } from 'lucide-vue-next'

const transactions = ref<Transaction[]>([])
const loading = ref(true)
const error = ref<PostgrestError | null>(null)

const now = new Date()

const dateFilters = ref({
  start: new CalendarDate(now.getFullYear(), now.getMonth() + 1, 1),
  end: new CalendarDate(now.getFullYear(), now.getMonth() + 2, 1),
}) as Ref<DateRange>

const fetchTransactions = async () => {
  const startISO = dateFilters.value.start!.toDate('UTC').toISOString()
  const endISO = dateFilters.value.end!.toDate('UTC').toISOString()

  transactions.value = await transactionsService.getAll({ startISO, endISO })
}

onMounted(async () => {
  try {
    loading.value = true
    await fetchTransactions()
  } catch (err: any) {
    error.value = err as PostgrestError
    console.error('Error fetching transactions:', err)
    toast.error('Error al cargar transacciones', {
      description: err?.message || 'No se pudieron sincronizar las transacciones'
    })
  } finally {
    loading.value = false
  }
})

// Metrics calculations based on active filtered transactions
const totalIncome = computed(() => {
  return transactions.value
    .filter((t) => t.categories?.type === 1)
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
})

const totalExpenses = computed(() => {
  return transactions.value
    .filter((t) => t.categories?.type === 0 || t.categories?.type === undefined)
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
})

const netBalance = computed(() => totalIncome.value - totalExpenses.value)

const incomeCount = computed(() => {
  return transactions.value.filter((t) => t.categories?.type === 1).length
})

const expenseCount = computed(() => {
  return transactions.value.filter((t) => t.categories?.type === 0 || t.categories?.type === undefined).length
})

const avgTransactionAmount = computed(() => {
  if (transactions.value.length === 0) return 0
  const total = transactions.value.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  return total / transactions.value.length
})

const open = ref(false)
const editingTransaction = ref<Transaction | null>(null)

const hide = () => {
  open.value = false
  editingTransaction.value = null
}

const openCreate = () => {
  editingTransaction.value = null
  open.value = true
}

const openEdit = (transaction: Transaction) => {
  editingTransaction.value = transaction
  open.value = true
}

const updateFilters = async (dateRange: DateRange) => {
  try {
    dateFilters.value.start = dateRange.start
    dateFilters.value.end = dateRange.end
    await fetchTransactions()
  } catch (err: any) {
    console.error('Error filtering transactions:', err)
    toast.error('Error al filtrar transacciones', {
      description: err?.message || 'No se pudieron aplicar los filtros de fecha'
    })
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 class="text-xl font-bold tracking-tight">Transacciones</h1>
        <p class="text-xs text-muted-foreground mt-0.5">
          Historial y registro detallado de todos tus ingresos y egresos.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button @click="openCreate" class="gap-1.5 shadow-sm">
          <Plus class="h-4 w-4" />
          Nueva Transacción
        </Button>
      </div>
    </div>

    <!-- Summary Metrics Cards -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card class="border shadow-xs p-0">
        <CardContent class="p-4 flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted-foreground">Total Ingresos</p>
            <h3 class="text-lg font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">
              {{ formatCurrency(totalIncome) }}
            </h3>
            <BsHint :value="totalIncome" />
            <span class="text-[11px] font-medium text-muted-foreground">
              {{ incomeCount }} {{ incomeCount === 1 ? 'movimiento' : 'movimientos' }}
            </span>
          </div>
          <div class="p-2.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <TrendingUp class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card class="border shadow-xs p-0">
        <CardContent class="p-4 flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted-foreground">Total Gastos</p>
            <h3 class="text-lg font-bold text-rose-500 mt-0.5">
              {{ formatCurrency(totalExpenses) }}
            </h3>
            <BsHint :value="totalExpenses" />
            <span class="text-[11px] font-medium text-muted-foreground">
              {{ expenseCount }} {{ expenseCount === 1 ? 'movimiento' : 'movimientos' }}
            </span>
          </div>
          <div class="p-2.5 rounded-full bg-rose-500/10 text-rose-500">
            <TrendingDown class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card class="border shadow-xs p-0">
        <CardContent class="p-4 flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted-foreground">Balance Neto</p>
            <h3
              class="text-lg font-bold mt-0.5"
              :class="netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'"
            >
              {{ formatCurrency(netBalance) }}
            </h3>
            <BsHint :value="netBalance" />
            <span
              class="text-[11px] font-medium"
              :class="netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'"
            >
              {{ netBalance >= 0 ? 'Superávit en periodo' : 'Déficit en periodo' }}
            </span>
          </div>
          <div class="p-2.5 rounded-full bg-primary/10 text-primary">
            <Wallet class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card class="border shadow-xs p-0">
        <CardContent class="p-4 flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted-foreground">Total Transacciones</p>
            <h3 class="text-lg font-bold mt-0.5">
              {{ transactions.length }}
            </h3>
            <span class="text-[11px] font-medium text-muted-foreground">
              Promedio: {{ formatCurrency(avgTransactionAmount) }}<BsHint :value="avgTransactionAmount" inline />
            </span>
          </div>
          <div class="p-2.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <ArrowLeftRight class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Table -->
    <div v-if="loading" class="text-sm text-muted-foreground py-8 text-center">Cargando transacciones...</div>
    <div v-else-if="error" class="text-sm text-destructive py-4">Error: {{ error.message }}</div>
    <div v-else>
      <Table
        :transactions="transactions"
        :date-filters="dateFilters!"
        @edit="openEdit"
        @delete="fetchTransactions"
        @updatedFilters="updateFilters"
      />
    </div>
  </div>

  <Create
    :open="open"
    :hide="hide"
    :transaction="editingTransaction"
    @reload="fetchTransactions"
  />
</template>
