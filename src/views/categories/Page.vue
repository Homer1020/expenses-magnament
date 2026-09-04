<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { TransactionCategory } from '@/types'
import type { PostgrestError } from '@supabase/supabase-js'
import * as categoriesService from '@/services/categories'
import Table from './Table.vue'
import Button from '@/components/ui/button/Button.vue'
import Create from './Create.vue'
import { toast } from 'vue-sonner'

const categories = ref<TransactionCategory[]>([])
const loading = ref(true)
const error = ref<PostgrestError | null>(null)

const fetchCategories = async () => {
  categories.value = await categoriesService.getAll()
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
      <Button @click="openCreate">Nueva Categoría</Button>
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
