<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import * as transactionsService from '@/services/transactions'
import type { Transaction } from '@/types'
import { MoreHorizontal } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

defineProps<{
  transaction: Transaction
}>()

const emit = defineEmits(['edit', 'delete'])

const deleteTransaction = async (id: number) => {
  try {
    await transactionsService.remove(id)
    toast.success('Transacción eliminada correctamente')
    emit('delete')
  } catch (err: any) {
    console.error('Error deleting transaction:', err)
    toast.error('Error al eliminar la transacción', {
      description: err?.message || 'Ocurrió un error inesperado al intentar eliminar la transacción'
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
      <DropdownMenuItem @click="() => deleteTransaction(transaction.id)">Eliminar</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
