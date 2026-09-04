<script setup lang="ts">
import { ref, onMounted, type Ref } from 'vue'
import type { Transaction } from '@/types'
import type { PostgrestError } from '@supabase/supabase-js'
import * as transactionsService from '@/services/transactions'
import Table from './Table.vue'
import Button from '@/components/ui/button/Button.vue'
import Create from './Create.vue'
import { CalendarDate } from '@internationalized/date'
import type { DateRange } from 'reka-ui'
import { toast } from 'vue-sonner'

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
  <div>
    <div class="flex items-center justify-between mb-3">
      <h1 class="font-medium text-lg">Transacciones</h1>
      <Button @click="openCreate">Nueva Transacción</Button>
    </div>
    <div v-if="loading">Cargando...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
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
