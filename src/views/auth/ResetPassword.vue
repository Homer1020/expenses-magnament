<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import supabase from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const router = useRouter()
const password = ref('')
const confirm = ref('')
const loading = ref(false)
const ready = ref(false)

onMounted(async () => {
  // El enlace del correo crea una sesión de recuperación (detectSessionInUrl)
  const { data: { session } } = await supabase.auth.getSession()
  ready.value = !!session
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') ready.value = true
  })
})

const handleSubmit = async () => {
  if (password.value.length < 8) {
    toast.error('La contraseña debe tener al menos 8 caracteres')
    return
  }
  if (password.value !== confirm.value) {
    toast.error('Las contraseñas no coinciden')
    return
  }

  loading.value = true
  try {
    const { error } = await supabase.auth.updateUser({ password: password.value })
    if (error) throw error
    toast.success('Contraseña actualizada correctamente')
    router.replace('/')
  } catch (err: any) {
    toast.error('No se pudo actualizar la contraseña', {
      description: err?.message || 'Intenta nuevamente.',
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-2 md:mx-auto md:max-w-lg mt-20 mb-10">
    <Card>
      <CardHeader>
        <CardTitle>Nueva contraseña</CardTitle>
        <CardDescription>Elige una contraseña de al menos 8 caracteres.</CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="!ready" class="text-sm space-y-3">
          <p>El enlace es inválido o expiró.</p>
          <RouterLink to="/forgot-password" class="underline underline-offset-4">Solicitar uno nuevo</RouterLink>
        </div>
        <form v-else @submit.prevent="handleSubmit" class="flex flex-col gap-6">
          <div class="grid gap-3">
            <Label for="password">Nueva contraseña</Label>
            <Input id="password" type="password" required v-model="password" />
          </div>
          <div class="grid gap-3">
            <Label for="confirm">Confirmar contraseña</Label>
            <Input id="confirm" type="password" required v-model="confirm" />
          </div>
          <Button type="submit" class="w-full" :disabled="loading">
            {{ loading ? 'Guardando...' : 'Guardar contraseña' }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
