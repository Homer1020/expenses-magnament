<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { User } from '@supabase/supabase-js'
import { RouterLink } from 'vue-router'
import supabase from '@/lib/supabase'
import { signOut } from '@/services/auth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { ChevronsUpDown, User as UserIcon, LogOut, Settings } from 'lucide-vue-next'

defineProps<{
  versions?: string[]
  defaultVersion?: string
}>()

const user = ref<User | null>(null)

onMounted(async () => {
  const { data } = await supabase.auth.getUser()
  user.value = data.user

  supabase.auth.onAuthStateChange((_event, session) => {
    user.value = session?.user ?? null
  })
})
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <SidebarMenuButton
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
          >
            <!-- Avatar / Icono -->
            <div class="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg font-semibold text-xs">
              {{ (user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email || 'U').slice(0, 2).toUpperCase() }}
            </div>

            <!-- Datos del Usuario -->
            <div class="grid flex-1 text-left text-sm leading-tight">
              <span class="truncate font-semibold">
                {{ user?.user_metadata?.display_name || user?.user_metadata?.full_name || 'Expenses Management' }}
              </span>
              <span class="truncate text-xs text-muted-foreground">
                {{ user?.email || 'Cargando...' }}
              </span>
            </div>

            <ChevronsUpDown class="ml-auto size-4" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          class="w-(--reka-dropdown-menu-trigger-width) min-w-56"
          align="start"
          side="bottom"
          :side-offset="4"
        >
          <DropdownMenuLabel class="p-0 font-normal">
            <div class="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-semibold">
                  {{ user?.user_metadata?.display_name || user?.user_metadata?.full_name || 'Mi Cuenta' }}
                </span>
                <span class="truncate text-xs text-muted-foreground">
                  {{ user?.email }}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem as-child class="cursor-pointer">
            <RouterLink to="/profile" class="flex items-center gap-2 w-full">
              <UserIcon class="size-4" />
              <span>Mi Perfil</span>
            </RouterLink>
          </DropdownMenuItem>

          <DropdownMenuItem as-child class="cursor-pointer">
            <RouterLink to="/settings" class="flex items-center gap-2 w-full">
              <Settings class="size-4" />
              <span>Configuración</span>
            </RouterLink>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem @click="signOut" class="cursor-pointer text-destructive focus:text-destructive flex items-center gap-2">
            <LogOut class="size-4" />
            <span>Cerrar Sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
