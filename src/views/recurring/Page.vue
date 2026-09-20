<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { RecurringTransaction } from '@/types'
import type { PostgrestError } from '@supabase/supabase-js'
import * as recurringTransactionsService from '@/services/recurringTransactions'
import Table from './Table.vue'
import Button from '@/components/ui/button/Button.vue'
import Create from './Create.vue'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatFullDate } from '@/lib/formatters'
import BsHint from '@/components/BsHint.vue'
import { Repeat, TrendingUp, TrendingDown, CalendarClock, Plus, RefreshCw, Loader2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const items = ref<RecurringTransaction[]>([])
const loading = ref(true)
const syncing = ref(false)
const error = ref<PostgrestError | null>(null)

const fetchData = async () => {
  items.value = await recurringTransactionsService.getAll()
}

onMounted(async () => {
  try {
    loading.value = true
    await fetchData()
  } catch (err: any) {
    error.value = err as PostgrestError
    console.error('Error fetching recurring transactions data:', err)
    toast.error('Error al cargar transacciones recurrentes', {
      description: err?.message || 'No se pudieron sincronizar las transacciones recurrentes'
    })
  } finally {
    loading.value = false
  }
})

const activeItems = computed(() => items.value.filter((i) => i.active))

const MONTHLY_FACTOR: Record<string, number> = {
  weekly: 4.345,
  monthly: 1,
  yearly: 1 / 12,
}

const monthlyIncomeCommitment = computed(() => {
  return activeItems.value
    .filter((i) => i.categories?.type === 1)
    .reduce((sum, i) => sum + i.amount * MONTHLY_FACTOR[i.frequency], 0)
})

const monthlyExpenseCommitment = computed(() => {
  return activeItems.value
    .filter((i) => i.categories?.type !== 1)
    .reduce((sum, i) => sum + i.amount * MONTHLY_FACTOR[i.frequency], 0)
})

const nextUpcoming = computed(() => {
  if (activeItems.value.length === 0) return null
  return [...activeItems.value].sort((a, b) => a.next_run_date.localeCompare(b.next_run_date))[0]
})

const handleSync = async () => {
  try {
    syncing.value = true
    const generated = await recurringTransactionsService.generateDueTransactions()
    await fetchData()
    if (generated > 0) {
      toast.success(`Se generaron ${generated} transacción(es) automáticamente`)
    } else {
      toast.success('Todo al día, no había transacciones pendientes')
    }
  } catch (err: any) {
    console.error('Error syncing recurring transactions:', err)
    toast.error('Error al sincronizar', {
      description: err?.message || 'Ocurrió un error inesperado al sincronizar'
    })
  } finally {
    syncing.value = false
  }
}

const open = ref(false)
const editingItem = ref<RecurringTransaction | null>(null)

const hide = () => {
  open.value = false
  editingItem.value = null
}

const openCreate = () => {
  editingItem.value = null
  open.value = true
}

const openEdit = (item: RecurringTransaction) => {
  editingItem.value = item
  open.value = true
}

const handleToggle = async (item: RecurringTransaction) => {
  try {
    await recurringTransactionsService.setActive(item.id, !item.active)
    toast.success(item.active ? 'Recurrencia pausada' : 'Recurrencia activada')
    await fetchData()
  } catch (err: any) {
    console.error('Error toggling recurring transaction:', err)
    toast.error('Error al actualizar el estado', {
      description: err?.message || 'Ocurrió un error inesperado'
    })
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 class="text-xl font-bold tracking-tight">Transacciones Recurrentes</h1>
        <p class="text-xs text-muted-foreground mt-0.5">
          Automatiza ingresos y gastos fijos: se registran solos según la frecuencia que definas.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" :disabled="syncing" @click="handleSync" class="gap-1.5">
          <Loader2 v-if="syncing" class="h-4 w-4 animate-spin" />
          <RefreshCw v-else class="h-4 w-4" />
          Sincronizar Ahora
        </Button>
        <Button @click="openCreate" class="gap-1.5 shadow-sm">
          <Plus class="h-4 w-4" />
          Nueva Recurrencia
        </Button>
      </div>
    </div>

    <!-- Summary Metrics Cards -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card class="border shadow-xs p-0">
        <CardContent class="p-4 flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted-foreground">Recurrencias Activas</p>
            <h3 class="text-lg font-bold mt-0.5">{{ activeItems.length }}</h3>
            <span class="text-[11px] font-medium text-muted-foreground">de {{ items.length }} en total</span>
          </div>
          <div class="p-2.5 rounded-full bg-primary/10 text-primary">
            <Repeat class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card class="border shadow-xs p-0">
        <CardContent class="p-4 flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted-foreground">Ingreso Recurrente (equiv. mensual)</p>
            <h3 class="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {{ formatCurrency(monthlyIncomeCommitment) }}
            </h3>
            <BsHint :value="monthlyIncomeCommitment" />
          </div>
          <div class="p-2.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <TrendingUp class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card class="border shadow-xs p-0">
        <CardContent class="p-4 flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted-foreground">Gasto Recurrente (equiv. mensual)</p>
            <h3 class="text-lg font-bold text-rose-500 mt-0.5">{{ formatCurrency(monthlyExpenseCommitment) }}</h3>
            <BsHint :value="monthlyExpenseCommitment" />
          </div>
          <div class="p-2.5 rounded-full bg-rose-500/10 text-rose-500">
            <TrendingDown class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card class="border shadow-xs p-0">
        <CardContent class="p-4 flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted-foreground">Próxima Ejecución</p>
            <h3 class="text-lg font-bold mt-0.5 truncate max-w-[150px] sm:max-w-[180px]">
              {{ nextUpcoming ? (nextUpcoming.categories?.name || 'Sin categoría') : 'Sin recurrencias' }}
            </h3>
            <span class="text-[11px] font-medium text-muted-foreground">
              {{ nextUpcoming ? formatFullDate(nextUpcoming.next_run_date) : 'Crea tu primera recurrencia' }}
            </span>
          </div>
          <div class="p-2.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <CalendarClock class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Table -->
    <div v-if="loading" class="text-sm text-muted-foreground py-8 text-center">Cargando transacciones recurrentes...</div>
    <div v-else-if="error" class="text-sm text-destructive py-4">Error: {{ error.message }}</div>
    <div v-else>
      <Table
        :items="items"
        @edit="openEdit"
        @delete="fetchData"
        @toggle="handleToggle"
      />
    </div>
  </div>

  <Create
    :open="open"
    :hide="hide"
    :item="editingItem"
    @reload="fetchData"
  />
</template>
