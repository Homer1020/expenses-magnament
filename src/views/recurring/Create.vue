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
import * as accountsService from '@/services/accounts'
import * as recurringTransactionsService from '@/services/recurringTransactions'
import type { RecurringTransaction, TransactionCategory, Account, RecurringFrequency } from '@/types'
import { useSettings } from '@/composables/useSettings'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { computed, ref, watch } from 'vue'
import * as z from 'zod'
import { toast } from 'vue-sonner'

const emit = defineEmits(['reload'])

const { open, hide, item } = defineProps<{
  open: boolean
  hide: () => void
  item?: RecurringTransaction | null
}>()

const isEditing = computed(() => !!item)

const { currency } = useSettings()
const amountLabel = computed(() => `Monto (${currency.value})`)

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10)
}

const formSchema = toTypedSchema(z.object({
  type: z.number({ required_error: 'Selecciona un tipo' }),
  category: z.number({ required_error: 'Selecciona una categoría' }),
  account: z.number().nullable().optional(),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  description: z.string().max(100).optional(),
  frequency: z.enum(['weekly', 'monthly', 'yearly'], { required_error: 'Selecciona una frecuencia' }),
  start_date: z.string().min(1, 'Selecciona una fecha de inicio'),
}))

const { handleSubmit, isFieldDirty, resetForm, setFieldValue, values } = useForm<{
  type?: number
  category?: number
  account?: number | null
  amount?: number
  description?: string
  frequency?: RecurringFrequency
  start_date?: string
}>({
  validationSchema: formSchema,
  validateOnMount: false,
})

const categories = ref<TransactionCategory[]>([])
const accounts = ref<Account[]>([])
const isSyncingForm = ref(false)

const filteredCategories = computed(() => {
  return categories.value.filter((c) => c.type === values.type)
})

const showAccountField = computed(() => {
  return values.type !== undefined && accounts.value.length > 0
})

const fetchAuxData = async () => {
  const [cats, accs] = await Promise.all([
    categoriesService.getAll(),
    accountsService.getAll(),
  ])
  categories.value = cats
  accounts.value = accs
}

watch(() => open, async (isOpen) => {
  if (!isOpen) return

  await fetchAuxData()

  isSyncingForm.value = true
  if (item) {
    setFieldValue('type', item.categories?.type)
    setFieldValue('category', item.category_id)
    setFieldValue('account', item.account_id ?? null)
    setFieldValue('amount', item.amount)
    setFieldValue('description', item.description ?? '')
    setFieldValue('frequency', item.frequency)
    setFieldValue('start_date', item.start_date)
  } else {
    resetForm({
      values: {
        type: undefined,
        category: undefined,
        account: null,
        amount: undefined,
        description: '',
        frequency: 'monthly',
        start_date: todayISODate(),
      },
    })
  }
  isSyncingForm.value = false
})

watch(() => values.type, (newType, oldType) => {
  if (isSyncingForm.value || oldType === undefined) return
  if (newType !== oldType) {
    setFieldValue('category', undefined)
    setFieldValue('account', null)
  }
})

const onSubmit = handleSubmit(async (formValues) => {
  try {
    const accountId = formValues.account ? Number(formValues.account) : null

    if (isEditing.value && item) {
      await recurringTransactionsService.update(item.id, {
        amount: formValues.amount!,
        description: formValues.description,
        category_id: formValues.category!,
        account_id: accountId,
        frequency: formValues.frequency!,
      })
      toast.success('Transacción recurrente actualizada correctamente')
    } else {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        toast.error('Error de autenticación', {
          description: 'Debes iniciar sesión para registrar una transacción recurrente'
        })
        return
      }

      await recurringTransactionsService.create({
        amount: formValues.amount!,
        description: formValues.description,
        category_id: formValues.category!,
        account_id: accountId,
        frequency: formValues.frequency!,
        start_date: formValues.start_date!,
        user_id: user.id,
      })
      toast.success('Transacción recurrente creada correctamente')
    }

    resetForm()
    hide()
    emit('reload')
  } catch (err: any) {
    console.error('Error saving recurring transaction:', err)
    toast.error('Error al guardar la transacción recurrente', {
      description: err?.message || 'Ocurrió un error inesperado al procesar la transacción recurrente'
    })
  }
})
</script>

<template>
  <Dialog :open="open" @update:open="!$event && hide()">
    <DialogContent class="sm:max-w-[480px]">
      <DialogHeader>
        <DialogTitle>{{ isEditing ? 'Editar Transacción Recurrente' : 'Agregar Transacción Recurrente' }}</DialogTitle>
      </DialogHeader>
      <form @submit="onSubmit" id="recurring-form" class="space-y-3.5">
        <!-- Tipo -->
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
                  <SelectItem :value="1">Ingreso</SelectItem>
                  <SelectItem :value="0">Egreso</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- Categoría -->
        <FormField v-slot="{ componentField }" name="category" :validate-on-blur="!isFieldDirty">
          <FormItem>
            <FormLabel>Categoría</FormLabel>
            <Select v-bind="componentField" :disabled="values.type === undefined">
              <FormControl class="w-full">
                <SelectTrigger>
                  <SelectValue :placeholder="values.type === undefined ? 'Primero selecciona un tipo' : 'Selecciona una categoría'" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectGroup>
                  <SelectItem
                    v-for="category in filteredCategories"
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

        <!-- Presupuesto / Fondo -->
        <FormField v-if="showAccountField" v-slot="{ componentField }" name="account">
          <FormItem>
            <div class="flex items-center justify-between">
              <FormLabel>Presupuesto / Fondo Asignado</FormLabel>
              <span class="text-xs text-muted-foreground font-normal">Opcional</span>
            </div>
            <Select v-bind="componentField">
              <FormControl class="w-full">
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un presupuesto" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectGroup>
                  <SelectItem :value="null">
                    <span class="text-muted-foreground">Sin asignar a presupuesto</span>
                  </SelectItem>
                  <SelectItem
                    v-for="account in accounts"
                    :key="account.id"
                    :value="account.id"
                  >
                    {{ account.name }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- Monto -->
        <FormField v-slot="{ componentField }" name="amount" :validate-on-blur="!isFieldDirty">
          <FormItem>
            <FormLabel>{{ amountLabel }}</FormLabel>
            <FormControl>
              <Input type="number" step="0.01" placeholder="80.00" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- Frecuencia -->
        <FormField v-slot="{ componentField }" name="frequency" :validate-on-blur="!isFieldDirty">
          <FormItem>
            <FormLabel>Frecuencia</FormLabel>
            <Select v-bind="componentField">
              <FormControl class="w-full">
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una frecuencia" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- Fecha de inicio -->
        <FormField v-slot="{ componentField }" name="start_date" :validate-on-blur="!isFieldDirty">
          <FormItem>
            <FormLabel>Primera Ejecución</FormLabel>
            <FormControl>
              <Input type="date" v-bind="componentField" :disabled="isEditing" />
            </FormControl>
            <p v-if="isEditing" class="text-xs text-muted-foreground">
              La fecha de inicio no se puede modificar una vez creada.
            </p>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- Descripción -->
        <FormField v-slot="{ componentField }" name="description">
          <FormItem>
            <FormLabel>Descripción</FormLabel>
            <FormControl>
              <Textarea placeholder="Ej: Suscripción Netflix" v-bind="componentField" :validate-on-blur="!isFieldDirty" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
      </form>
      <DialogFooter class="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" @click="hide">Cancelar</Button>
        <Button type="submit" form="recurring-form">
          {{ isEditing ? 'Guardar Cambios' : 'Crear Recurrencia' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
