<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { User } from '@supabase/supabase-js'
import { toast } from 'vue-sonner'
import supabase from '@/lib/supabase'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { resetAccount } from '@/services/auth'

import {
  User as UserIcon,
  Mail,
  KeyRound,
  Phone,
  Eye,
  EyeOff,
  Save,
  ShieldCheck,
  Loader2,
  Trash2,
} from 'lucide-vue-next'

// State
const loading = ref(true)
const user = ref<User | null>(null)

// Form states
const profileForm = ref({
  fullName: '',
  phone: '',
  email: '',
})

const passwordForm = ref({
  newPassword: '',
  confirmPassword: '',
})

const showPassword = ref(false)
const showConfirmPassword = ref(false)

const savingProfile = ref(false)
const savingPassword = ref(false)

// Load user info from Supabase
const loadUser = async () => {
  loading.value = true
  try {
    const { data: { user: currentUser }, error } = await supabase.auth.getUser()
    if (error) throw error

    user.value = currentUser
    if (currentUser) {
      profileForm.value.email = currentUser.email || ''
      profileForm.value.fullName =
        currentUser.user_metadata?.full_name ||
        currentUser.user_metadata?.display_name ||
        ''
      profileForm.value.phone = currentUser.user_metadata?.phone || ''
    }
  } catch (error: any) {
    console.error('Error al cargar datos del usuario:', error)
    toast.error('No se pudo cargar la información del usuario', {
      description: error?.message || 'Error de conexión',
    })
  } finally {
    loading.value = false
  }
}

// Update Profile (Name, Phone)
const handleUpdateProfile = async () => {
  if (!profileForm.value.fullName.trim()) {
    toast.error('El nombre es requerido')
    return
  }

  savingProfile.value = true
  try {
    const { data, error } = await supabase.auth.updateUser({
      data: {
        full_name: profileForm.value.fullName.trim(),
        display_name: profileForm.value.fullName.trim(),
        phone: profileForm.value.phone.trim(),
      },
    })

    if (error) throw error

    user.value = data.user
    toast.success('Perfil actualizado correctamente')
  } catch (error: any) {
    console.error('Error al actualizar perfil:', error)
    toast.error('Error al actualizar los datos', {
      description: error?.message || 'Ocurrió un problema al guardar',
    })
  } finally {
    savingProfile.value = false
  }
}

// Update Password
const handleUpdatePassword = async () => {
  if (!passwordForm.value.newPassword) {
    toast.error('Ingresa la nueva contraseña')
    return
  }

  if (passwordForm.value.newPassword.length < 8) {
    toast.error('La contraseña debe tener al menos 8 caracteres')
    return
  }

  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    toast.error('Las contraseñas no coinciden')
    return
  }

  savingPassword.value = true
  try {
    const { error } = await supabase.auth.updateUser({
      password: passwordForm.value.newPassword,
    })

    if (error) throw error

    passwordForm.value.newPassword = ''
    passwordForm.value.confirmPassword = ''
    toast.success('Contraseña actualizada correctamente')
  } catch (error: any) {
    console.error('Error al cambiar contraseña:', error)
    toast.error('Error al actualizar la contraseña', {
      description: error?.message || 'No se pudo cambiar la contraseña',
    })
  } finally {
    savingPassword.value = false
  }
}

// Reset account
const RESET_PHRASE = 'RESETEAR'
const resetOpen = ref(false)
const resetConfirm = ref('')
const resetting = ref(false)

const handleResetAccount = async () => {
  if (resetConfirm.value !== RESET_PHRASE) return

  resetting.value = true
  try {
    await resetAccount()
    toast.success('Cuenta reestablecida a cero')
    resetOpen.value = false
    resetConfirm.value = ''
  } catch (error: any) {
    console.error('Error al reestablecer la cuenta:', error)
    toast.error('Error al reestablecer la cuenta', {
      description: error?.message || 'Ocurrió un problema inesperado',
    })
  } finally {
    resetting.value = false
  }
}

onMounted(() => {
  loadUser()
})
</script>

<template>
  <div class="space-y-6 pb-12">
    <!-- TITULO DE LA PÁGINA -->
    <div class="border-b pb-4">
      <h1 class="text-2xl font-bold tracking-tight">Mi Cuenta</h1>
      <p class="text-sm text-muted-foreground mt-0.5">
        Administra tus datos personales y credenciales de acceso.
      </p>
    </div>

    <!-- CARGANDO -->
    <div v-if="loading" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Skeleton class="h-96 w-full rounded-xl" />
      <Skeleton class="h-96 w-full rounded-xl" />
    </div>

    <!-- CONTENIDO -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
      <!-- 1. DATOS PERSONALES -->
      <Card class="border shadow-xs flex flex-col gap-0">
        <CardHeader class="border-b bg-muted/20 pb-4">
          <CardTitle class="text-base flex items-center gap-2">
            <UserIcon class="h-4 w-4 text-primary" />
            Datos Personales
          </CardTitle>
          <CardDescription>
            Modifica tu nombre y teléfono asociados a tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent class="p-6 flex-1 flex flex-col justify-between">
          <form @submit.prevent="handleUpdateProfile" class="space-y-4 flex flex-col flex-1 justify-between">
            <div class="space-y-4">
              <!-- Correo Electrónico (Informativo) -->
              <div class="space-y-1.5">
                <Label for="profile-email">Correo Electrónico</Label>
                <div class="relative">
                  <Input
                    id="profile-email"
                    type="email"
                    :model-value="profileForm.email"
                    disabled
                    class="bg-muted/50 cursor-not-allowed pr-10"
                  />
                  <Mail class="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
                <p class="text-xs text-muted-foreground">
                  El correo principal está asignado a tu cuenta de Supabase.
                </p>
              </div>

              <!-- Nombre Completo -->
              <div class="space-y-1.5">
                <Label for="profile-name">Nombre Completo</Label>
                <div class="relative">
                  <Input
                    id="profile-name"
                    type="text"
                    placeholder="Tu nombre completo"
                    v-model="profileForm.fullName"
                    required
                  />
                  <UserIcon class="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <!-- Teléfono -->
              <div class="space-y-1.5">
                <Label for="profile-phone">Teléfono / Móvil</Label>
                <div class="relative">
                  <Input
                    id="profile-phone"
                    type="tel"
                    placeholder="+1 234 567 890"
                    v-model="profileForm.phone"
                  />
                  <Phone class="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            <!-- Botón Guardar Datos -->
            <div class="pt-4 flex justify-end">
              <Button type="submit" :disabled="savingProfile" class="gap-1.5">
                <Loader2 v-if="savingProfile" class="h-4 w-4 animate-spin" />
                <Save v-else class="h-4 w-4" />
                <span>{{ savingProfile ? 'Guardando...' : 'Guardar Cambios' }}</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <!-- 2. CAMBIO DE CONTRASEÑA -->
      <Card class="border shadow-xs flex flex-col gap-0">
        <CardHeader class="border-b bg-muted/20 pb-4">
          <CardTitle class="text-base flex items-center gap-2">
            <KeyRound class="h-4 w-4 text-primary" />
            Cambiar Contraseña
          </CardTitle>
          <CardDescription>
            Ingresa una nueva contraseña de al menos 8 caracteres.
          </CardDescription>
        </CardHeader>
        <CardContent class="p-6 flex-1 flex flex-col justify-between">
          <form @submit.prevent="handleUpdatePassword" class="space-y-4 flex flex-col flex-1 justify-between">
            <div class="space-y-4">
              <!-- Nueva Contraseña -->
              <div class="space-y-1.5">
                <Label for="new-password">Nueva Contraseña</Label>
                <div class="relative">
                  <Input
                    id="new-password"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="••••••••"
                    v-model="passwordForm.newPassword"
                    required
                  />
                  <button
                    type="button"
                    class="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                    @click="showPassword = !showPassword"
                    tabindex="-1"
                  >
                    <EyeOff v-if="showPassword" class="h-4 w-4" />
                    <Eye v-else class="h-4 w-4" />
                  </button>
                </div>
                <p class="text-xs text-muted-foreground">Mínimo 8 caracteres requeridos.</p>
              </div>

              <!-- Confirmar Contraseña -->
              <div class="space-y-1.5">
                <Label for="confirm-password">Confirmar Contraseña</Label>
                <div class="relative">
                  <Input
                    id="confirm-password"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    placeholder="••••••••"
                    v-model="passwordForm.confirmPassword"
                    required
                  />
                  <button
                    type="button"
                    class="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                    @click="showConfirmPassword = !showConfirmPassword"
                    tabindex="-1"
                  >
                    <EyeOff v-if="showConfirmPassword" class="h-4 w-4" />
                    <Eye v-else class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Botón Actualizar Contraseña -->
            <div class="pt-4 flex justify-end">
              <Button type="submit" variant="secondary" :disabled="savingPassword" class="gap-1.5">
                <Loader2 v-if="savingPassword" class="h-4 w-4 animate-spin" />
                <ShieldCheck v-else class="h-4 w-4" />
                <span>{{ savingPassword ? 'Actualizando...' : 'Actualizar Contraseña' }}</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <!-- 3. ZONA DE PELIGRO -->
      <Card class="border border-destructive/40 shadow-xs gap-0 py-0 lg:col-span-2 overflow-hidden">
        <CardContent class="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-start gap-3">
            <div class="rounded-md bg-destructive/10 p-2 text-destructive shrink-0">
              <Trash2 class="h-5 w-5" />
            </div>
            <div class="space-y-0.5">
              <h2 class="text-base font-semibold text-destructive">Zona de Peligro</h2>
              <p class="text-sm text-muted-foreground">
                Elimina todas tus transacciones, recurrentes y metas de gasto. Tus categorías y cuentas se conservan.
              </p>
            </div>
          </div>
          <Button variant="destructive" class="gap-1.5 shrink-0" @click="resetOpen = true">
            <Trash2 class="h-4 w-4" />
            Reestablecer cuenta a cero
          </Button>
        </CardContent>
      </Card>
    </div>

    <AlertDialog v-model:open="resetOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Reestablecer la cuenta a cero?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción es permanente y no se puede deshacer. Escribe
            <strong>{{ RESET_PHRASE }}</strong> para confirmar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input v-model="resetConfirm" :placeholder="RESET_PHRASE" autocomplete="off" />
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="resetting" @click="resetConfirm = ''">Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            :disabled="resetConfirm !== RESET_PHRASE || resetting"
            class="gap-1.5"
            @click="handleResetAccount"
          >
            <Loader2 v-if="resetting" class="h-4 w-4 animate-spin" />
            <span>{{ resetting ? 'Reestableciendo...' : 'Reestablecer' }}</span>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
