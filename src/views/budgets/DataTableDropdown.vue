<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import * as budgetGoalsService from '@/services/budgetGoals'
import type { BudgetGoal } from '@/types'
import { MoreHorizontal } from 'lucide-vue-next'

import { toast } from 'vue-sonner'

defineProps<{
  goal: BudgetGoal
}>()

const emit = defineEmits(['edit', 'delete'])

const deleteGoal = async (id: number) => {
  try {
    await budgetGoalsService.remove(id)
    toast.success('Meta de gasto eliminada correctamente')
    emit('delete')
  } catch (err: any) {
    console.error('Error deleting budget goal:', err)
    toast.error('Error al eliminar la meta de gasto', {
      description: err?.message || 'Ocurrió un error inesperado al intentar eliminar la meta de gasto'
    })
  }
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" class="w-8 h-8 p-0">
        <span class="sr-only">Abrir menú</span>
        <MoreHorizontal class="w-4 h-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem @click="emit('edit')">Editar</DropdownMenuItem>
      <DropdownMenuItem @click="() => deleteGoal(goal.id)">Eliminar</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
