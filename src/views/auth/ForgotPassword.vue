<script setup lang="ts">
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import supabase from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const email = ref('')
const loading = ref(false)
const sent = ref(false)

const handleSubmit = async () => {
  loading.value = true
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.value.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
    sent.value = true
  } catch (err: any) {
    toast.error('No se pudo enviar el correo', {
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
        <CardTitle>Recuperar contraseña</CardTitle>
        <CardDescription>
          Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p v-if="sent" class="text-sm">
          Si el correo existe, recibirás un enlace en unos minutos. Revisa también tu carpeta de spam.
        </p>
        <form v-else @submit.prevent="handleSubmit" class="flex flex-col gap-6">
          <div class="grid gap-3">
            <Label for="email">Email</Label>
            <Input id="email" type="email" placeholder="m@example.com" required v-model="email" />
          </div>
          <Button type="submit" class="w-full" :disabled="loading">
            {{ loading ? 'Enviando...' : 'Enviar enlace' }}
          </Button>
        </form>
        <div class="mt-4 text-center text-sm">
          <RouterLink to="/login" class="underline underline-offset-4">Volver al login</RouterLink>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
