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
import Select from '@/components/ui/select/Select.vue'
import SelectContent from '@/components/ui/select/SelectContent.vue'
import SelectGroup from '@/components/ui/select/SelectGroup.vue'
import SelectItem from '@/components/ui/select/SelectItem.vue'
import SelectTrigger from '@/components/ui/select/SelectTrigger.vue'
import SelectValue from '@/components/ui/select/SelectValue.vue'
import Textarea from '@/components/ui/textarea/Textarea.vue'
import supabase from '@/lib/supabase'
import * as categoriesService from '@/services/categories'
import * as transactionsService from '@/services/transactions'
import type { Transaction, TransactionCategory } from '@/types'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { computed, ref, watch } from 'vue'
import * as z from 'zod'

const emit = defineEmits(['reload'])

const { open, hide, transaction } = defineProps<{
  open: boolean
  hide: () => void
  transaction?: Transaction | null
}>()

const isEditing = computed(() => !!transaction)

const formSchema = toTypedSchema(z.object({
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  description: z.string().max(100).optional(),
  category: z.number(),
}))

const { handleSubmit, isFieldDirty, resetForm, setValues } = useForm({
  validationSchema: formSchema,
  validateOnMount: false,
})

const categories = ref<TransactionCategory[]>([])

watch(() => open, async (isOpen) => {
  if (!isOpen) return

  try {
    categories.value = await categoriesService.getAll()
  } catch (err) {
    console.error(err)
  }

  if (transaction) {
    setValues({
      category: transaction.category_id,
      amount: transaction.amount,
      description: transaction.description ?? '',
    })
  } else {
    resetForm({ values: { category: undefined, amount: undefined, description: '' } })
  }
})

const onSubmit = handleSubmit(async (values) => {
  try {
    if (isEditing.value && transaction) {
      await transactionsService.update(transaction.id, {
        amount: values.amount,
        description: values.description,
        category_id: values.category,
      })
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      await transactionsService.create({
        amount: values.amount,
        description: values.description,
        category_id: values.category,
        user_id: user!.id,
      })
    }

    resetForm()
    hide()
    emit('reload')
  } catch (err) {
    console.error(err)
  }
})
</script>

<template>
  <Dialog :open="open" @update:open="!$event && hide()">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ isEditing ? 'Editar Transacción' : 'Agregar Transacción' }}</DialogTitle>
      </DialogHeader>
      <form @submit="onSubmit" id="transaction-form">
        <FormField v-slot="{ componentField }" name="category" :validate-on-blur="!isFieldDirty">
          <FormItem class="mb-3">
            <FormLabel>Categoría</FormLabel>
            <Select v-bind="componentField">
              <FormControl class="w-full">
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectGroup>
                  <SelectItem
                    v-for="category in categories"
                    :key="category.id"
                    :value="category.id"
                  >
                    {{ category.name }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="amount" :validate-on-blur="!isFieldDirty">
          <FormItem class="mb-3">
            <FormLabel>Monto (USD)</FormLabel>
            <FormControl>
              <Input type="number" step="0.01" placeholder="80" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="description">
          <FormItem>
            <FormLabel>Descripción</FormLabel>
            <FormControl>
              <Textarea placeholder="Escribe una descripción" v-bind="componentField" :validate-on-blur="!isFieldDirty" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
      </form>
      <DialogFooter class="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" @click="hide">Cancelar</Button>
        <Button type="submit" form="transaction-form">
          {{ isEditing ? 'Guardar' : 'Continuar' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
