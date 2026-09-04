<script setup lang="ts">
import Button from '@/components/ui/button/Button.vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form'
import FormControl from '@/components/ui/form/FormControl.vue'
import FormItem from '@/components/ui/form/FormItem.vue'
import FormLabel from '@/components/ui/form/FormLabel.vue'
import FormMessage from '@/components/ui/form/FormMessage.vue'
import Input from '@/components/ui/input/Input.vue'
import * as accountsService from '@/services/accounts'
import type { Account } from '@/types'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { computed, watch } from 'vue'
import * as z from 'zod'
import { toast } from 'vue-sonner'

const emit = defineEmits(['reload'])

const { open, hide, account } = defineProps<{
  open: boolean
  hide: () => void
  account?: Account | null
}>()

const isEditing = computed(() => !!account)

const formSchema = toTypedSchema(z.object({
  name: z.string().min(1, 'El nombre es requerido').max(50),
  percentage: z.coerce
    .number({ invalid_type_error: 'El porcentaje debe ser un número' })
    .min(0, 'El porcentaje mínimo es 0')
    .max(100, 'El porcentaje máximo es 100'),
}))

const { handleSubmit, isFieldDirty, resetForm, setValues } = useForm({
  validationSchema: formSchema,
  validateOnMount: false,
})

watch(() => open, (isOpen) => {
  if (!isOpen) return

  if (account) {
    setValues({ name: account.name, percentage: account.percentage })
  } else {
    resetForm({ values: { name: '', percentage: 0 } })
  }
})

const onSubmit = handleSubmit(async (values) => {
  try {
    const accounts = await accountsService.getAll();

    const totalPercentage = Object
      .values(accounts)
      .filter((acc) => acc.id != account?.id)
      .reduce((acc, account) => acc + account.percentage, 0)
    
    if (totalPercentage + values.percentage > 100) {
      toast.error('Error', {
        description: 'El porcentaje total de todas las cuentas no puede exceder el 100%'
      })
      return
    }

    if (isEditing.value && account) {
      await accountsService.update(account.id, values)
      toast.success('Cuenta actualizada correctamente')
    } else {
      await accountsService.create(values)
      toast.success('Cuenta creada correctamente')
    }

    resetForm()
    hide()
    emit('reload')
  } catch (err: any) {
    toast.error('Error al guardar la cuenta', {
      description: err?.message || 'Ocurrió un error inesperado'
    })
  }
})
</script>

<template>
  <Dialog :open="open" @update:open="!$event && hide()">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ isEditing ? 'Editar Cuenta' : 'Agregar Cuenta' }}</DialogTitle>
      </DialogHeader>
      <form @submit="onSubmit" id="account-form">
        <FormField v-slot="{ componentField }" name="name" :validate-on-blur="!isFieldDirty">
          <FormItem class="mb-3">
            <FormLabel>Nombre</FormLabel>
            <FormControl>
              <Input placeholder="Nombre de la cuenta" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="percentage" :validate-on-blur="!isFieldDirty">
          <FormItem class="mb-3">
            <FormLabel>Porcentaje asignado (%)</FormLabel>
            <FormControl>
              <Input type="number" min="0" max="100" placeholder="Ej: 30" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
      </form>
      <DialogFooter class="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" @click="hide">Cancelar</Button>
        <Button type="submit" form="account-form">
          {{ isEditing ? 'Guardar' : 'Continuar' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
