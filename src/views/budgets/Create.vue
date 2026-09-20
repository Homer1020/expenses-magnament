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
import * as budgetGoalsService from '@/services/budgetGoals'
import * as categoriesService from '@/services/categories'
import type { BudgetGoal, TransactionCategory } from '@/types'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { computed, ref, watch } from 'vue'
import * as z from 'zod'
import { toast } from 'vue-sonner'

const emit = defineEmits(['reload'])

const { open, hide, goal } = defineProps<{
  open: boolean
  hide: () => void
  goal?: BudgetGoal | null
}>()

const isEditing = computed(() => !!goal)

const categories = ref<TransactionCategory[]>([])
const existingGoals = ref<BudgetGoal[]>([])

// Solo categorías de egreso, y solo las que aún no tienen una meta asignada
// (salvo la que se está editando actualmente).
const availableCategories = computed(() => {
  const usedIds = new Set(
    existingGoals.value
      .filter((g) => g.id !== goal?.id)
      .map((g) => g.category_id)
  )
  return categories.value.filter((c) => c.type === 0 && !usedIds.has(c.id))
})

const formSchema = toTypedSchema(z.object({
  category_id: z.number({ required_error: 'Selecciona una categoría' }),
  amount: z.coerce.number().positive('El límite debe ser mayor a 0'),
}))

const { handleSubmit, isFieldDirty, resetForm, setValues } = useForm({
  validationSchema: formSchema,
  validateOnMount: false,
})

watch(() => open, async (isOpen) => {
  if (!isOpen) return

  const [cats, goals] = await Promise.all([
    categoriesService.getAll(),
    budgetGoalsService.getAll(),
  ])
  categories.value = cats
  existingGoals.value = goals

  if (goal) {
    setValues({ category_id: goal.category_id, amount: goal.amount })
  } else {
    resetForm({ values: { category_id: undefined, amount: undefined } })
  }
})

const onSubmit = handleSubmit(async (values) => {
  try {
    if (isEditing.value && goal) {
      await budgetGoalsService.update(goal.id, values)
      toast.success('Meta de gasto actualizada correctamente')
    } else {
      await budgetGoalsService.create(values)
      toast.success('Meta de gasto creada correctamente')
    }

    resetForm()
    hide()
    emit('reload')
  } catch (err: any) {
    console.error(err)
    const isDuplicate = err?.code === '23505'
    toast.error('Error al guardar la meta de gasto', {
      description: isDuplicate
        ? 'Esa categoría ya tiene una meta de gasto asignada'
        : err?.message || 'Ocurrió un error inesperado al guardar la meta de gasto'
    })
  }
})
</script>

<template>
  <Dialog :open="open" @update:open="!$event && hide()">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ isEditing ? 'Editar Meta de Gasto' : 'Agregar Meta de Gasto' }}</DialogTitle>
      </DialogHeader>
      <form @submit="onSubmit" id="budget-goal-form" class="space-y-3.5">
        <FormField v-slot="{ componentField }" name="category_id" :validate-on-blur="!isFieldDirty">
          <FormItem>
            <FormLabel>Categoría de Gasto</FormLabel>
            <Select v-bind="componentField">
              <FormControl class="w-full">
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectGroup>
                  <SelectItem
                    v-for="category in availableCategories"
                    :key="category.id"
                    :value="category.id"
                  >
                    {{ category.name }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <p v-if="!availableCategories.length" class="text-xs text-muted-foreground">
              Todas tus categorías de egreso ya tienen una meta asignada.
            </p>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="amount" :validate-on-blur="!isFieldDirty">
          <FormItem>
            <FormLabel>Límite Mensual</FormLabel>
            <FormControl>
              <Input type="number" step="0.01" placeholder="Ej: 300.00" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
      </form>
      <DialogFooter class="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" @click="hide">Cancelar</Button>
        <Button type="submit" form="budget-goal-form">
          {{ isEditing ? 'Guardar' : 'Continuar' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
