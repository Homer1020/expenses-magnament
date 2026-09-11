<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { TransactionCategory } from '@/types'
import type { PostgrestError } from '@supabase/supabase-js'
import * as categoriesService from '@/services/categories'
import { PRESET_CATEGORIES } from '@/constants/presets'
import supabase from '@/lib/supabase'
import Table from './Table.vue'
import Button from '@/components/ui/button/Button.vue'
import Create from './Create.vue'
import { toast } from 'vue-sonner'
import { Sparkles, Loader2 } from 'lucide-vue-next'

const categories = ref<TransactionCategory[]>([])
const loading = ref(true)
const seedingCategories = ref(false)
const error = ref<PostgrestError | null>(null)

const fetchCategories = async () => {
  categories.value = await categoriesService.getAll()
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
    await fetchCategories()
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
    await fetchCategories()
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
  <div>
    <div class="flex items-center justify-between mb-3">
      <h1 class="font-medium text-lg">Categorías</h1>
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
        <Button @click="openCreate">Nueva Categoría</Button>
      </div>
    </div>
    <div v-if="loading">Cargando...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <div v-else>
      <Table
        :categories="categories"
        @edit="openEdit"
        @delete="fetchCategories"
      />
    </div>
  </div>
  <Create
    :open="open"
    :hide="hide"
    :category="editingCategory"
    @reload="fetchCategories"
  />
</template>
