<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { User } from '@supabase/supabase-js'
import { RouterLink } from 'vue-router'
import supabase from '@/lib/supabase'
import { signOut } from '@/services/auth'
import { useTheme } from '@/composables/useTheme'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { ChevronsUpDown, User as UserIcon, LogOut, Settings, Sun, Moon } from 'lucide-vue-next'

const { isMobile } = useSidebar()
const { preference, isDark } = useTheme()

const user = ref<User | null>(null)

const displayName = computed(() =>
  user.value?.user_metadata?.display_name || user.value?.user_metadata?.full_name || ''
)
const initials = computed(() =>
  (displayName.value || user.value?.email || 'U').slice(0, 2).toUpperCase()
)

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
            <div class="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg font-semibold text-xs">
              {{ initials }}
            </div>
            <div class="grid flex-1 text-left text-sm leading-tight">
              <span class="truncate font-semibold">{{ displayName || 'Mi Cuenta' }}</span>
              <span class="truncate text-xs text-muted-foreground">{{ user?.email || 'Cargando...' }}</span>
            </div>
            <ChevronsUpDown class="ml-auto size-4" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          class="w-(--reka-dropdown-menu-trigger-width) min-w-56 rounded-lg"
          :side="isMobile ? 'bottom' : 'right'"
          align="end"
          :side-offset="4"
        >
          <DropdownMenuLabel class="p-0 font-normal">
            <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <div class="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg font-semibold text-xs">
                {{ initials }}
              </div>
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-semibold">{{ displayName || 'Mi Cuenta' }}</span>
                <span class="truncate text-xs text-muted-foreground">{{ user?.email }}</span>
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

          <DropdownMenuSub>
            <DropdownMenuSubTrigger class="cursor-pointer gap-2">
              <Moon v-if="isDark" class="size-4" />
              <Sun v-else class="size-4" />
              <span>Tema</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup v-model="preference">
                <DropdownMenuRadioItem value="light" class="cursor-pointer">Claro</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark" class="cursor-pointer">Oscuro</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="auto" class="cursor-pointer">Sistema</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

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
