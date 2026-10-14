<script setup lang="ts">
import { RouterLink } from 'vue-router'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Wallet } from 'lucide-vue-next'
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <SidebarMenuButton size="lg" as-child>
        <RouterLink to="/">
          <div class="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
            <Wallet class="size-4" />
          </div>
          <div class="grid flex-1 text-left text-sm leading-tight">
            <span class="truncate font-semibold">Expenses Management</span>
            <span class="truncate text-xs text-muted-foreground">Finanzas personales</span>
          </div>
        </RouterLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
