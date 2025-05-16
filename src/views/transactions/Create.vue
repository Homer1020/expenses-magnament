<script setup lang="ts">
import Button from '@/components/ui/button/Button.vue';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form';
import FormControl from '@/components/ui/form/FormControl.vue';
import FormItem from '@/components/ui/form/FormItem.vue';
import FormLabel from '@/components/ui/form/FormLabel.vue';
import FormMessage from '@/components/ui/form/FormMessage.vue';
import Input from '@/components/ui/input/Input.vue';
import Select from '@/components/ui/select/Select.vue';
import SelectContent from '@/components/ui/select/SelectContent.vue';
import SelectGroup from '@/components/ui/select/SelectGroup.vue';
import SelectItem from '@/components/ui/select/SelectItem.vue';
import SelectTrigger from '@/components/ui/select/SelectTrigger.vue';
import SelectValue from '@/components/ui/select/SelectValue.vue';
import Textarea from '@/components/ui/textarea/Textarea.vue';
import supabase from '@/lib/supabase';
import type { TransactionCategory } from '@/types';
import { toTypedSchema } from '@vee-validate/zod';
import { useForm } from 'vee-validate';
import { ref, watch } from 'vue';
import * as z from 'zod';


const emit = defineEmits(['reload']);

const formSchema = toTypedSchema(z.object({
  amount: z.number(),
  description: z.string().max(100).optional(),
  category: z.number()
}))

const { open, hide } = defineProps<{ open: boolean, hide: () => void }>()

const { handleSubmit, isFieldDirty, resetForm } = useForm({
  validationSchema: formSchema,
  validateOnMount: false
})

const onSubmit = handleSubmit(async (values) => {
  try {
    const { data, error } = await supabase.from('transactions').insert({
      amount: values.amount,
      category_id: values.category
    })

    if (error) throw error

    console.log({ data })
    resetForm()
    hide()
    emit('reload')
  } catch (err) {
    console.log(err)
  }
})

const categories = ref<TransactionCategory[]>([])

watch(() => open, async () => {
  if (!open) return
  try {
    const { data, error } = await supabase.from('categories').select('*')
    if (error) throw error
    categories.value = data
  } catch (err) {
    console.log(err)
  }
})
</script>

<template>
  <Dialog :open="open" @update:open="!$event && hide()">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Agregar Transacción</DialogTitle>
      </DialogHeader>
      <form @submit="onSubmit" id="transaction-form">
        <FormField v-slot="{ componentField }" name="category" :validate-on-blur="!isFieldDirty">
          <FormItem class="mb-3">
            <FormLabel>Categoria</FormLabel>
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
              <Input type="number" placeholder="80$" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="description">
          <FormItem>
            <FormLabel>Descripcion</FormLabel>
            <FormControl>
              <Textarea placeholder="Escribe una descripcion" v-bind="componentField" :validate-on-blur="!isFieldDirty" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
      </form>
      <DialogFooter class="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" @click="hide">Cancelar</Button>
        <Button type="submit" form="transaction-form">Continuar</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
