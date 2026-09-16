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
import * as transactionsService from '@/services/transactions'
import type { Transaction, TransactionCategory, Account } from '@/types'
import { formatCurrency } from '@/lib/formatters'
import { useSettings } from '@/composables/useSettings'
import BsHint from '@/components/BsHint.vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { computed, nextTick, ref, watch } from 'vue'
import * as z from 'zod'
import { Wallet, AlertCircle, TrendingDown } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const emit = defineEmits(['reload'])

const { open, hide, transaction } = defineProps<{
  open: boolean
  hide: () => void
  transaction?: Transaction | null
}>()

const isEditing = computed(() => !!transaction)

const { currency } = useSettings()
const amountLabel = computed(() => `Monto (${currency.value})`)

const formSchema = toTypedSchema(z.object({
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  description: z.string().max(100).optional(),
  type: z.number({ required_error: 'Selecciona un tipo' }),
  category: z.number({ required_error: 'Selecciona una categoría' }),
  account: z.number().nullable().optional(),
}))

const { handleSubmit, isFieldDirty, resetForm, setFieldValue, setValues, values } = useForm<{
  amount?: number
  description?: string
  type?: number
  category?: number
  account?: number | null
}>({
  validationSchema: formSchema,
  validateOnMount: false,
})

const categories = ref<TransactionCategory[]>([])
const accounts = ref<Account[]>([])
const allTransactions = ref<Transaction[]>([])
const currentMonthTransactions = ref<Transaction[]>([])
const loadingBudget = ref(false)
const isSyncingForm = ref(false)

const filteredCategories = computed(() => {
  return categories.value.filter((c) => c.type === values.type)
})

const showAccountField = computed(() => {
  return values.type !== undefined && accounts.value.length > 0
})

// Calculate monthly income and account live calculations
const monthlyIncome = computed(() => {
  return currentMonthTransactions.value
    .filter((t) => t.categories?.type === 1)
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
})

const selectedAccountData = computed(() => {
  if (!values.account) return null
  const acc = accounts.value.find((a) => a.id === values.account)
  if (!acc) return null

  const currentAmount = Number(values.amount) || 0

  if (values.type === 1) {
    // Ingreso: saldo acumulado histórico del fondo (ingresos - egresos asignados)
    const currentBalance = allTransactions.value
      .filter((t) => t.account_id === acc.id && (transaction ? t.id !== transaction.id : true))
      .reduce((sum, t) => sum + (t.categories?.type === 1 ? Number(t.amount) || 0 : -(Number(t.amount) || 0)), 0)
    const projectedBalance = currentBalance + currentAmount

    return {
      ...acc,
      mode: 'income' as const,
      currentBalance,
      currentAmount,
      projectedBalance,
    }
  }

  const allocatedBudget = (monthlyIncome.value * (acc.percentage || 0)) / 100
  // Sum expenses for this account this month, excluding current editing transaction
  const spentSoFar = currentMonthTransactions.value
    .filter((t) => t.account_id === acc.id && t.categories?.type !== 1 && (transaction ? t.id !== transaction.id : true))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

  const availableBefore = allocatedBudget - spentSoFar
  const projectedRemaining = availableBefore - currentAmount

  return {
    ...acc,
    mode: 'expense' as const,
    allocatedBudget,
    spentSoFar,
    availableBefore,
    currentAmount,
    projectedRemaining,
    isOverBudget: currentAmount > 0 && projectedRemaining < 0,
  }
})

const fetchBudgetData = async () => {
  try {
    loadingBudget.value = true
    const now = new Date()
    const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString()
    const endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1)).toISOString()

    const [cats, accs, allTx] = await Promise.all([
      categoriesService.getAll(),
      accountsService.getAll(),
      transactionsService.getAll(),
    ])

    categories.value = cats
    accounts.value = accs
    allTransactions.value = allTx
    currentMonthTransactions.value = allTx.filter((t) => t.date >= startOfMonth && t.date < endOfMonth)
  } catch (err: any) {
    console.error('Error fetching modal budget data:', err)
    toast.error('Error al cargar datos auxiliares', {
      description: err?.message || 'No se pudieron sincronizar las categorías y presupuestos'
    })
  } finally {
    loadingBudget.value = false
  }
}

watch(() => open, async (isOpen) => {
  if (!isOpen) return

  await fetchBudgetData()

  isSyncingForm.value = true
  if (transaction) {
    setValues({
      type: transaction.categories?.type,
      category: transaction.category_id,
      account: transaction.account_id ?? null,
      amount: transaction.amount,
      description: transaction.description ?? '',
    })
  } else {
    resetForm({ values: { type: undefined, category: undefined, account: null, amount: undefined, description: '' } })
  }
  await nextTick()
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

    if (isEditing.value && transaction) {
      await transactionsService.update(transaction.id, {
        amount: formValues.amount!,
        description: formValues.description,
        category_id: formValues.category!,
        account_id: accountId,
      })
      toast.success('Transacción actualizada correctamente')
    } else {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        toast.error('Error de autenticación', {
          description: 'Debes iniciar sesión para registrar una transacción'
        })
        return
      }

      await transactionsService.create({
        amount: formValues.amount!,
        description: formValues.description,
        category_id: formValues.category!,
        account_id: accountId,
        user_id: user.id,
      })
      toast.success('Transacción registrada correctamente')
    }

    resetForm()
    hide()
    emit('reload')
  } catch (err: any) {
    console.error('Error saving transaction:', err)
    toast.error('Error al guardar la transacción', {
      description: err?.message || 'Ocurrió un error inesperado al procesar la transacción'
    })
  }
})
</script>

<template>
  <Dialog :open="open" @update:open="!$event && hide()">
    <DialogContent class="sm:max-w-[480px]">
      <DialogHeader>
        <DialogTitle>{{ isEditing ? 'Editar Transacción' : 'Agregar Transacción' }}</DialogTitle>
      </DialogHeader>
      <form @submit="onSubmit" id="transaction-form" class="space-y-3.5">
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

        <!-- Presupuesto / Fondo (visible para Ingreso o Egreso si hay presupuestos configurados) -->
        <FormField v-if="showAccountField" v-slot="{ componentField }" name="account">
          <FormItem>
            <div class="flex items-center justify-between">
              <FormLabel>Presupuesto / Fondo Asignado</FormLabel>
              <span class="text-xs text-muted-foreground font-normal">Opcional</span>
            </div>
            <Select v-bind="componentField">
              <FormControl class="w-full">
                <SelectTrigger>
                  <SelectValue :placeholder="values.type === 1 ? 'Selecciona el fondo al que se abona' : 'Selecciona el presupuesto de donde se debita'" />
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
                    <div class="flex items-center justify-between w-full gap-3">
                      <span>{{ account.name }}</span>
                      <span class="text-xs text-muted-foreground font-medium">({{ account.percentage }}%)</span>
                    </div>
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- Live Budget Card when Account is Selected (Egreso) -->
        <div v-if="selectedAccountData?.mode === 'expense'" class="p-3.5 rounded-lg border bg-accent/30 space-y-2.5 transition-all text-xs">
          <div class="flex items-center justify-between">
            <span class="font-medium text-muted-foreground flex items-center gap-1.5">
              <Wallet class="h-3.5 w-3.5 text-primary" />
              Presupuesto Mensual ({{ selectedAccountData.percentage }}% de {{ formatCurrency(monthlyIncome) }}):
            </span>
            <span class="flex flex-col items-end">
              <span class="font-semibold text-foreground">{{ formatCurrency(selectedAccountData.allocatedBudget) }}</span>
              <BsHint :value="selectedAccountData.allocatedBudget" inline />
            </span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-muted-foreground flex items-center gap-1.5">
              <TrendingDown class="h-3.5 w-3.5 text-rose-500" />
              Gastado este mes:
            </span>
            <span class="flex flex-col items-end">
              <span class="font-medium text-rose-500">{{ formatCurrency(selectedAccountData.spentSoFar) }}</span>
              <BsHint :value="selectedAccountData.spentSoFar" inline />
            </span>
          </div>

          <div class="flex items-center justify-between pt-1.5 border-t">
            <span class="font-medium">Disponible actual en presupuesto:</span>
            <span class="flex flex-col items-end">
              <span
                class="font-bold text-sm"
                :class="selectedAccountData.availableBefore >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'"
              >
                {{ formatCurrency(selectedAccountData.availableBefore) }}
              </span>
              <BsHint :value="selectedAccountData.availableBefore" inline />
            </span>
          </div>

          <!-- Projected remaining if amount is typed -->
          <div v-if="selectedAccountData.currentAmount > 0" class="flex items-center justify-between pt-1.5 border-t border-dashed">
            <span class="text-muted-foreground">Restante tras este gasto:</span>
            <span class="flex flex-col items-end">
              <span
                class="font-bold text-sm"
                :class="selectedAccountData.projectedRemaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'"
              >
                {{ formatCurrency(selectedAccountData.projectedRemaining) }}
              </span>
              <BsHint :value="selectedAccountData.projectedRemaining" inline />
            </span>
          </div>

          <!-- Over budget warning -->
          <div
            v-if="selectedAccountData.isOverBudget"
            class="flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-2.5 rounded-md font-medium text-xs mt-1"
          >
            <AlertCircle class="h-4 w-4 shrink-0 mt-0.5" />
            <span>Este gasto sobrepasa el saldo presupuestado disponible por {{ formatCurrency(Math.abs(selectedAccountData.projectedRemaining)) }}.</span>
          </div>
        </div>

        <!-- Live Fund Balance Card when Account is Selected (Ingreso) -->
        <div v-if="selectedAccountData?.mode === 'income'" class="p-3.5 rounded-lg border bg-accent/30 space-y-2.5 transition-all text-xs">
          <div class="flex items-center justify-between">
            <span class="font-medium text-muted-foreground flex items-center gap-1.5">
              <Wallet class="h-3.5 w-3.5 text-primary" />
              Saldo actual del fondo:
            </span>
            <span class="flex flex-col items-end">
              <span class="font-semibold text-foreground">{{ formatCurrency(selectedAccountData.currentBalance) }}</span>
              <BsHint :value="selectedAccountData.currentBalance" inline />
            </span>
          </div>

          <div v-if="selectedAccountData.currentAmount > 0" class="flex items-center justify-between pt-1.5 border-t border-dashed">
            <span class="text-muted-foreground">Saldo proyectado tras este ingreso:</span>
            <span class="flex flex-col items-end">
              <span class="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                {{ formatCurrency(selectedAccountData.projectedBalance) }}
              </span>
              <BsHint :value="selectedAccountData.projectedBalance" inline />
            </span>
          </div>
        </div>

        <!-- Monto -->
        <FormField v-slot="{ componentField }" name="amount" :validate-on-blur="!isFieldDirty">
          <FormItem>
            <FormLabel>{{ amountLabel }}</FormLabel>
            <FormControl>
              <Input type="number" step="0.01" placeholder="80.00" v-bind="componentField" />
            </FormControl>
            <BsHint v-if="Number(values.amount) > 0" :value="Number(values.amount)" />
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- Descripción -->
        <FormField v-slot="{ componentField }" name="description">
          <FormItem>
            <FormLabel>Descripción</FormLabel>
            <FormControl>
              <Textarea placeholder="Escribe una descripción..." v-bind="componentField" :validate-on-blur="!isFieldDirty" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
      </form>
      <DialogFooter class="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" @click="hide">Cancelar</Button>
        <Button type="submit" form="transaction-form">
          {{ isEditing ? 'Guardar Cambios' : 'Registrar Transacción' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
