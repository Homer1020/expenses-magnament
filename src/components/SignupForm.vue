<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import supabase from '@/lib/supabase'
import router from '@/router'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'
import * as z from 'zod'

const formSchema = toTypedSchema(
  z.object({
    fullName: z.string().min(1, 'El nombre es requerido'),
    email: z.string().email('El correo no es valido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'La confirmación de la contraseña es requerida'),
  }).refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })
)

const { handleSubmit, isFieldDirty } = useForm({
  validationSchema: formSchema,
  validateOnMount: false,
})

const handleSignup = handleSubmit(async values => {
  const { data, error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      data: {
        display_name: values.fullName,
      },
    },
  })

  console.log({ data, error })

  if (error) {
    let message = 'Hubo un error'
    if (error.code === 'invalid_credentials') message = 'Credenciales invalidas'

    toast.error(message)
    return
  }

  toast.success('Cuenta creada exitosamente')
  router.push({ path: '/', replace: true })
})
</script>

<template>
  <div class="mx-2 md:mx-auto md:max-w-lg mt-20">
    <div class="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>
            Enter your information below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form @submit="handleSignup" class="flex flex-col gap-4">
            <FormField v-slot="{ componentField }" name="fullName" :validate-on-blur="!isFieldDirty">
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input id="name" type="text" placeholder="John Doe" v-bind="componentField" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="email" :validate-on-blur="!isFieldDirty">
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    v-bind="componentField"
                  />
                </FormControl>
                <FormDescription>
                  We'll use this to contact you. We will not share your email with anyone else.
                </FormDescription>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="password" :validate-on-blur="!isFieldDirty">
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input id="password" type="password" v-bind="componentField" />
                </FormControl>
                <FormDescription>Must be at least 8 characters long.</FormDescription>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="confirmPassword" :validate-on-blur="!isFieldDirty">
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input id="confirm-password" type="password" v-bind="componentField" />
                </FormControl>
                <FormDescription>Please confirm your password.</FormDescription>
                <FormMessage />
              </FormItem>
            </FormField>

            <div class="flex flex-col gap-3 mt-2">
              <Button type="submit">
                Create Account
              </Button>
              <Button variant="outline" type="button">
                Sign up with Google
              </Button>
              <p class="px-6 text-center text-sm text-muted-foreground">
                Already have an account? <RouterLink to="/login" class="underline">Sign in</RouterLink>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
