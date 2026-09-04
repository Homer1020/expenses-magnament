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
import * as categoriesService from '@/services/categories'
import type { TransactionCategory } from '@/types'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { computed, watch } from 'vue'
import * as z from 'zod'
import { toast } from 'vue-sonner'

const emit = defineEmits(['reload'])

const { open, hide, category } = defineProps<{
  open: boolean
  hide: () => void
  category?: TransactionCategory | null
}>()

const isEditing = computed(() => !!category)

const formSchema = toTypedSchema(z.object({
  name: z.string().min(1, 'El nombre es requerido').max(50),
  type: z.number(),
}))

const { handleSubmit, isFieldDirty, resetForm, setValues } = useForm({
  validationSchema: formSchema,
  validateOnMount: false,
})

watch(() => open, (isOpen) => {
  if (!isOpen) return

  if (category) {
    setValues({ name: category.name, type: category.type })
  } else {
    resetForm({ values: { name: '', type: 0 } })
  }
})

const onSubmit = handleSubmit(async (values) => {
  try {
    if (isEditing.value && category) {
      await categoriesService.update(category.id, values)
      toast.success('Categoría actualizada correctamente')
    } else {
      await categoriesService.create(values)
      toast.success('Categoría creada correctamente')
    }

    resetForm()
    hide()
    emit('reload')
  } catch (err: any) {
    console.error(err)
    toast.error('Error al guardar la categoría', {
      description: err?.message || 'Ocurrió un error inesperado al guardar la categoría'
    })
  }
})
</script>

<template>
  <Dialog :open="open" @update:open="!$event && hide()">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ isEditing ? 'Editar Categoría' : 'Agregar Categoría' }}</DialogTitle>
      </DialogHeader>
      <form @submit="onSubmit" id="category-form">
        <FormField v-slot="{ componentField }" name="name" :validate-on-blur="!isFieldDirty">
          <FormItem class="mb-3">
            <FormLabel>Nombre</FormLabel>
            <FormControl>
              <Input placeholder="Ej: Alimentación" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="type" :validate-on-blur="!isFieldDirty">
          <FormItem>
            <FormLabel>Tipo</FormLabel>
            <Select v-bind="componentField">
              <FormControl class="w-full">
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectGroup>
                  <SelectItem :value="0">Egreso</SelectItem>
                  <SelectItem :value="1">Ingreso</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        </FormField>
      </form>
      <DialogFooter class="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" @click="hide">Cancelar</Button>
        <Button type="submit" form="category-form">
          {{ isEditing ? 'Guardar' : 'Continuar' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
