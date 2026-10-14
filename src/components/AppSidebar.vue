<script setup lang="ts">
import SearchForm from '@/components/SearchForm.vue'
import AppBrand from '@/components/AppBrand.vue'
import NavUser from '@/components/NavUser.vue'
import { RouterLink } from 'vue-router';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  type SidebarProps,
  SidebarRail,
} from '@/components/ui/sidebar'

const props = defineProps<SidebarProps>()

const data = {
  navMain: [
    {
      title: 'Finanzas',
      url: '#',
      items: [
        {
          title: 'Panel',
          url: '/',
        },
        {
          title: 'Transacciones',
          url: '/transactions',
        },
        {
          title: 'Categorías',
          url: '/categories',
        },
        {
          title: 'Presupuestos',
          url: '/accounts',
        },
        {
          title: 'Metas de Gasto',
          url: '/budgets',
        },
        {
          title: 'Recurrentes',
          url: '/recurring',
        },
      ],
    },
  ],
}
</script>

<template>
  <Sidebar v-bind="props">
    <SidebarHeader>
      <AppBrand />
      <SearchForm />
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup v-for="item in data.navMain" :key="item.title">
        <SidebarGroupLabel>{{ item.title }}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="childItem in item.items" :key="childItem.title">
              <SidebarMenuButton as-child :is-active="$route.path === childItem.url">
                <RouterLink :to="childItem.url">{{ childItem.title }}</RouterLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter>
      <NavUser />
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>
