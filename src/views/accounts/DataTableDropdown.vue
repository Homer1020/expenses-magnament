<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import * as accountsService from '@/services/accounts'
import type { Account } from '@/types'
import { MoreHorizontal } from 'lucide-vue-next'

import { toast } from 'vue-sonner'

defineProps<{
  account: Account
}>()

const emit = defineEmits(['edit', 'delete'])

const deleteAccount = async (id: number) => {
  try {
    await accountsService.remove(id)
    toast.success('Cuenta eliminada correctamente')
    emit('delete')
  } catch (err: any) {
    console.error('Error deleting account:', err)
    toast.error('Error al eliminar la cuenta', {
      description: err?.message || 'Ocurrió un error inesperado al intentar eliminar la cuenta'
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
      <DropdownMenuItem @click="() => deleteAccount(account.id)">Eliminar</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
