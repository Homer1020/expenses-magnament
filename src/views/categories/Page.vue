<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { TransactionCategory, Transaction } from '@/types'
import type { PostgrestError } from '@supabase/supabase-js'
import * as categoriesService from '@/services/categories'
import * as transactionsService from '@/services/transactions'
import { PRESET_CATEGORIES } from '@/constants/presets'
import supabase from '@/lib/supabase'
import Table from './Table.vue'
import Button from '@/components/ui/button/Button.vue'
import Create from './Create.vue'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/formatters'
import { toast } from 'vue-sonner'
import { Sparkles, Loader2, Tags, TrendingDown, TrendingUp, PieChart, Plus } from 'lucide-vue-next'

const categories = ref<TransactionCategory[]>([])
const transactions = ref<Transaction[]>([])
const loading = ref(true)
const seedingCategories = ref(false)
const error = ref<PostgrestError | null>(null)

const fetchData = async () => {
  const [cats, txs] = await Promise.all([
    categoriesService.getAll(),
    transactionsService.getAll(),
  ])
  categories.value = cats
  transactions.value = txs
}

const handleLoadDefaultCategories = async () => {
  try {
    seedingCategories.value = true
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const toInsert = PRESET_CATEGORIES.map((c) => ({
      name: c.name,
      type: c.type,
      user_id: user.id,
    }))

    const { error } = await supabase.from('categories').insert(toInsert)
    if (error) throw error

    toast.success('¡Categorías recomendadas cargadas con éxito!')
    await fetchData()
  } catch (err: any) {
    console.error('Error al cargar categorías recomendadas:', err)
    toast.error('Error al cargar categorías recomendadas', {
      description: err?.message || 'Inténtalo de nuevo'
    })
  } finally {
    seedingCategories.value = false
  }
}

onMounted(async () => {
  try {
    loading.value = true
    await fetchData()
  } catch (err: any) {
    error.value = err as PostgrestError
    console.error('Error fetching categories:', err)
    toast.error('Error al cargar categorías', {
      description: err?.message || 'No se pudieron sincronizar las categorías'
    })
  } finally {
    loading.value = false
  }
})

// Metrics calculations
const totalCategoriesCount = computed(() => categories.value.length)

const expenseCategoriesCount = computed(() => {
  return categories.value.filter((c) => c.type === 0).length
})

const incomeCategoriesCount = computed(() => {
  return categories.value.filter((c) => c.type === 1).length
})

const totalExpensesAmount = computed(() => {
  return transactions.value
    .filter((t) => t.categories?.type === 0 || t.categories?.type === undefined)
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
})

const totalIncomeAmount = computed(() => {
  return transactions.value
    .filter((t) => t.categories?.type === 1)
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
})

const usedCategoriesCount = computed(() => {
  const usedIds = new Set(transactions.value.map((t) => t.category_id).filter(Boolean))
  return categories.value.filter((c) => usedIds.has(c.id)).length
})

const topExpenseCategory = computed(() => {
  const expenseTx = transactions.value.filter((t) => t.categories?.type === 0 || t.categories?.type === undefined)
  if (expenseTx.length === 0) return null

  const map = new Map<string, number>()
  for (const t of expenseTx) {
    const name = t.categories?.name || 'Sin categoría'
    map.set(name, (map.get(name) || 0) + (Number(t.amount) || 0))
  }

  let topName = ''
  let topAmount = 0
  for (const [name, amount] of map.entries()) {
    if (amount > topAmount) {
      topAmount = amount
      topName = name
    }
  }

  return topName ? { name: topName, amount: topAmount } : null
})

const open = ref(false)
const editingCategory = ref<TransactionCategory | null>(null)

const hide = () => {
  open.value = false
  editingCategory.value = null
}

const openCreate = () => {
  editingCategory.value = null
  open.value = true
}

const openEdit = (category: TransactionCategory) => {
  editingCategory.value = category
  open.value = true
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold tracking-tight">Categorías</h1>
        <p class="text-xs text-muted-foreground mt-0.5">
          Organiza y clasifica tus ingresos y gastos para un mejor control financiero.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Button
          v-if="!loading && categories.length === 0"
          variant="outline"
          size="sm"
          :disabled="seedingCategories"
          @click="handleLoadDefaultCategories"
          class="gap-1.5"
        >
          <Loader2 v-if="seedingCategories" class="h-4 w-4 animate-spin" />
          <Sparkles v-else class="h-4 w-4 text-primary" />
          <span>Cargar Predeterminadas</span>
        </Button>
        <Button @click="openCreate" class="gap-1.5 shadow-sm">
          <Plus class="h-4 w-4" />
          Nueva Categoría
        </Button>
      </div>
    </div>

    <!-- Summary Metrics Cards -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card class="border shadow-xs p-0">
        <CardContent class="p-4 flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted-foreground">Total Categorías</p>
            <h3 class="text-lg font-bold mt-0.5">{{ totalCategoriesCount }}</h3>
            <span class="text-[11px] font-medium text-muted-foreground">
              {{ usedCategoriesCount }} en uso activo
            </span>
          </div>
          <div class="p-2.5 rounded-full bg-primary/10 text-primary">
            <Tags class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card class="border shadow-xs p-0">
        <CardContent class="p-4 flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted-foreground">Categorías de Gasto</p>
            <h3 class="text-lg font-bold text-rose-500 mt-0.5">{{ expenseCategoriesCount }}</h3>
            <span class="text-[11px] font-medium text-muted-foreground">
              {{ totalExpensesAmount > 0 ? formatCurrency(totalExpensesAmount) + ' registrado' : 'Para clasificar egresos' }}
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
            <p class="text-xs font-medium text-muted-foreground">Categorías de Ingreso</p>
            <h3 class="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{{ incomeCategoriesCount }}</h3>
            <span class="text-[11px] font-medium text-muted-foreground">
              {{ totalIncomeAmount > 0 ? formatCurrency(totalIncomeAmount) + ' registrado' : 'Para clasificar entradas' }}
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
            <p class="text-xs font-medium text-muted-foreground">Mayor Gasto por Categoría</p>
            <h3 class="text-lg font-bold mt-0.5 truncate max-w-[150px] sm:max-w-[180px]">
              {{ topExpenseCategory ? topExpenseCategory.name : 'Sin gastos' }}
            </h3>
            <span class="text-[11px] font-medium text-amber-600 dark:text-amber-400">
              {{ topExpenseCategory ? formatCurrency(topExpenseCategory.amount) : 'Sin movimientos' }}
            </span>
          </div>
          <div class="p-2.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <PieChart class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Table -->
    <div v-if="loading" class="text-sm text-muted-foreground py-8 text-center">Cargando categorías...</div>
    <div v-else-if="error" class="text-sm text-destructive py-4">Error: {{ error.message }}</div>
    <div v-else>
      <Table
        :categories="categories"
        @edit="openEdit"
        @delete="fetchData"
      />
    </div>
  </div>

  <Create
    :open="open"
    :hide="hide"
    :category="editingCategory"
    @reload="fetchData"
  />
</template>
