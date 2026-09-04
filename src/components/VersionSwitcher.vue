<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { User } from '@supabase/supabase-js'
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
import { ChevronsUpDown, User as UserIcon } from 'lucide-vue-next'

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
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <!-- Avatar / Icono -->
            <div class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <UserIcon class="size-4" />
            </div>

            <!-- Datos del Usuario -->
            <div class="grid flex-1 text-left text-sm leading-tight">
              <span class="truncate font-semibold">
                Expenses Management
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
            <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-semibold">
                  {{ user?.user_metadata?.full_name || 'Mi Cuenta' }}
                </span>
                <span class="truncate text-xs text-muted-foreground">
                  {{ user?.email }}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <!-- <DropdownMenuItem
            v-for="version in versions"
            :key="version"
            @select="selectedVersion = version"
          >
            v{{ version }}
            <Check v-if="version === selectedVersion" class="ml-auto" />
          </DropdownMenuItem> -->
          <DropdownMenuItem @click="signOut">
            Cerrar Session
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
