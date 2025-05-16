<script setup lang="ts">
import { ref, onMounted } from 'vue'
import supabase from '@/lib/supabase'
import type { Transaction } from '@/types'
import type { PostgrestError } from '@supabase/supabase-js'
import Table from './Table.vue'
import Button from '@/components/ui/button/Button.vue';
import Create from './Create.vue'
import {
  type CalendarDate,
} from '@internationalized/date';

const transactions = ref<Transaction[]>([])
const loading = ref(true)
const error = ref<PostgrestError | null>(null)


const fetchTransactions = async (args?: {start: CalendarDate, end: CalendarDate}) => {
  let startISO;
  let endISO;

  if(!args) {
    const now = new Date();
  
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    startISO = startOfMonth.toISOString();
    endISO = startOfNextMonth.toISOString();
  } else {
    startISO = args.start.toDate('UTC').toISOString();
    endISO = args.end.toDate('UTC').toISOString();
  }

  const { data, error: supabaseError } = await supabase
    .from('transactions')
    .select(`
      *,
      categories(
        name,
        type
      )
    `)
    .gte('date', startISO)
    .lt('date', endISO)
    .order('id', {ascending: false})
  
  if (supabaseError) throw supabaseError

  transactions.value = data
}

onMounted(async () => {
  try {
    loading.value = true
    await fetchTransactions();
  } catch (err) {
    error.value = err as PostgrestError
    console.error('Error fetching transactions:', err)
  } finally {
    loading.value = false
  }
})

const open = ref<boolean>(false);
const hide = () => { open.value = false }
</script>
<template>
<div>
  <div class="flex items-center justify-between mb-3">
    <h1 class="font-medium text-lg">Transacciones</h1>
    <Button @click="open = true">Nueva Transacción</Button>
  </div>
  <div v-if="loading">Cargando...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <ul v-else>
    <Table :transactions="transactions" @updated-date="fetchTransactions" />
  </ul>
</div>
<Create :open="open" :hide="hide" @reload="fetchTransactions" />
</template>