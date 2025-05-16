<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { Transaction } from '@/types';
import { MoreHorizontal } from 'lucide-vue-next'

defineProps<{
  transaction: Transaction
}>()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" class="w-8 h-8 p-0">
        <span class="sr-only">Open menu</span>
        <MoreHorizontal class="w-4 h-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem>Editar</DropdownMenuItem>
      <DropdownMenuItem>Eliminar</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>