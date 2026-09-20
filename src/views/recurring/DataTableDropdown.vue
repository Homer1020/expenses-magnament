<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import * as recurringTransactionsService from '@/services/recurringTransactions'
import type { RecurringTransaction } from '@/types'
import { MoreHorizontal } from 'lucide-vue-next'

import { toast } from 'vue-sonner'

defineProps<{
  item: RecurringTransaction
}>()

const emit = defineEmits(['edit', 'delete'])

const deleteItem = async (id: number) => {
  try {
    await recurringTransactionsService.remove(id)
    toast.success('Transacción recurrente eliminada correctamente')
    emit('delete')
  } catch (err: any) {
    console.error('Error deleting recurring transaction:', err)
    toast.error('Error al eliminar la transacción recurrente', {
      description: err?.message || 'Ocurrió un error inesperado al intentar eliminar la transacción recurrente'
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
      <DropdownMenuItem @click="() => deleteItem(item.id)">Eliminar</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
