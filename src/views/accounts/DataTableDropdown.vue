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

defineProps<{
  account: Account
}>()

const emit = defineEmits(['edit', 'delete'])

const deleteAccount = async (id: number) => {
  try {
    await accountsService.remove(id)
    emit('delete')
  } catch (err) {
    console.error('Error deleting account:', err)
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
