<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import supabase from '@/lib/supabase'
import router from '@/router'
import { ref } from 'vue'
import { toast } from 'vue-sonner'

const form = ref<{
  email: string,
  password: string
}>({
  email: '',
  password: ''
})

const handleLogin = async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email: form.value.email,
    password: form.value.password,
  })

  if(error) {
    let message = 'Hubo un error';
    // let description = 'Por favor intente nuevamente.';

    if(error.code === 'invalid_credentials') message = 'Credenciales invalidas';

    toast.error(message, {
      // description: 'Sunday, December 03, 2023 at 9:00 AM',
      // action: {
      //   label: 'Undo',
      //   onClick: () => console.log('Undo'),
      // },
    })
    return
  }

  router.push({path: '/dashboard', replace: true}) 
}
</script>

<template>
  <div class="mx-5 lg:mx-auto max-w-lg mt-20">
    <div class="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form @submit.prevent="handleLogin">
            <div class="flex flex-col gap-6">
              <div class="grid gap-3">
                <Label for="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  v-model="form.email"
                />
              </div>
              <div class="grid gap-3">
                <div class="flex items-center">
                  <Label for="password">Password</Label>
                  <a
                    href="#"
                    class="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                <Input id="password" type="password" required v-model="form.password" />
              </div>
              <div class="flex flex-col gap-3">
                <Button type="submit" class="w-full cursor-pointer">
                  Login
                </Button>
                <Button variant="outline" class="w-full">
                  Login with Google
                </Button>
              </div>
            </div>
            <div class="mt-4 text-center text-sm">
              Don't have an account?
              <a href="#" class="underline underline-offset-4">
                Sign up
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
