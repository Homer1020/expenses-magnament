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
  User as UserIcon,
  Mail,
  KeyRound,
  Phone,
  Eye,
  EyeOff,
  Save,
  ShieldCheck,
  Loader2,
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
    </div>
  </div>
</template>
