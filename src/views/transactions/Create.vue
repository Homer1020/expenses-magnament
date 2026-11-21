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
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
import { useLocalStorage } from '@vueuse/core'
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

const { currency, effectiveRate, defaultInBs, exchangeRateSource, saveSettings } = useSettings()

// "Monto en Bs": el usuario escribe Bs; `amount` (moneda global) se deriva con la tasa vigente.
const inBs = ref(false)
const canUseBs = computed(() => currency.value !== 'VES' && effectiveRate.value !== null)
const amountLabel = computed(() => (inBs.value ? 'Monto (Bs)' : `Monto (${currency.value})`))

// Tasa Bs/USD de la transacción (precargada con la del sistema, editable).
// Se usa tanto en modo Bs (USD = Bs / tasa) como en modo USD (Bs = USD × tasa).
const rateInput = ref<number | null>(null)
const currentRate = computed(() => {
  const rate = Number(rateInput.value) || 0
  return rate > 0 ? rate : null
})
const toUsd = (bs: number, rate: number) => Math.round((bs / rate) * 100) / 100

// Monto en USD: guardar o no su equivalente en Bs.
// Se recuerda la última elección (ej. apagado para comisiones PayPal).
const rememberWithBs = useLocalStorage('expenses:tx-with-bs', true)
const withBs = ref(true)
const showRateField = computed(() => inBs.value || (currency.value !== 'VES' && withBs.value))
const rateDiffersFromSystem = computed(() =>
  currentRate.value !== null && currentRate.value !== effectiveRate.value
)

const bsPreview = computed(() => {
  const typed = Number(values.amount) || 0
  return !inBs.value && withBs.value && typed > 0 && currentRate.value ? typed * currentRate.value : null
})

// Si está activo al guardar, la tasa escrita pasa a ser la tasa manual global
const updateGlobalRate = ref(false)

const applyGlobalRate = async () => {
  if (!updateGlobalRate.value || !rateDiffersFromSystem.value || !currentRate.value) return
  const { synced } = await saveSettings({ exchangeRateSource: 'manual', manualRate: currentRate.value })
  if (synced) toast.success('Tasa manual de las configuraciones actualizada')
  else toast.warning('Tasa actualizada solo en este dispositivo', { description: 'No se pudo sincronizar con tu cuenta' })
}

function todayLocalISODate(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formSchema = toTypedSchema(z.object({
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  description: z.string().max(100).optional(),
  type: z.number({ required_error: 'Selecciona un tipo' }),
  category: z.number({ required_error: 'Selecciona una categoría' }),
  account: z.number().nullable().optional(),
  date: z.string().min(1, 'Selecciona una fecha'),
}))

const { handleSubmit, resetForm, setFieldValue, setValues, values } = useForm<{
  amount?: number
  description?: string
  type?: number
  category?: number
  account?: number | null
  date?: string
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

// Monto equivalente en la moneda global, venga o no digitado en Bs
const usdAmount = computed(() => {
  const typed = Number(values.amount) || 0
  if (!inBs.value) return typed
  return currentRate.value ? toUsd(typed, currentRate.value) : typed
})

// Calculate monthly income, expenses, and net base for budget allocation
const monthlyIncome = computed(() => {
  return currentMonthTransactions.value
    .filter((t) => t.categories?.type === 1)
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
})

const unassignedMonthlyExpenses = computed(() => {
  return currentMonthTransactions.value
    .filter((t) => t.categories?.type !== 1 && !t.account_id && (transaction ? t.id !== transaction.id : true))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
})

// Net monthly distributable income base (gross income minus unassigned expenses)
const monthlyNetIncome = computed(() => Math.max(0, monthlyIncome.value - unassignedMonthlyExpenses.value))

const selectedAccountData = computed(() => {
  if (!values.account) return null
  const acc = accounts.value.find((a) => a.id === values.account)
  if (!acc) return null

  const currentAmount = usdAmount.value
  const netBase = monthlyNetIncome.value
  const allocatedBudget = (netBase * (acc.percentage || 0)) / 100

  // Direct income assigned specifically to this account (excluding the editing transaction)
  const directIncome = currentMonthTransactions.value
    .filter((t) => t.account_id === acc.id && t.categories?.type === 1 && (transaction ? t.id !== transaction.id : true))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

  // Sum expenses for this account this month, excluding current editing transaction
  const spentSoFar = currentMonthTransactions.value
    .filter((t) => t.account_id === acc.id && t.categories?.type !== 1 && (transaction ? t.id !== transaction.id : true))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

  const availableBefore = allocatedBudget + directIncome - spentSoFar

  if (values.type === 1) {
    const projectedAvailable = availableBefore + currentAmount

    return {
      ...acc,
      mode: 'income' as const,
      netBase,
      allocatedBudget,
      directIncome,
      spentSoFar,
      availableBefore,
      currentAmount,
      projectedAvailable,
    }
  }

  const projectedRemaining = availableBefore - currentAmount

  return {
    ...acc,
    mode: 'expense' as const,
    netBase,
    allocatedBudget,
    directIncome,
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

    const [cats, accs, allTx, monthTx] = await Promise.all([
      categoriesService.getAll(),
      accountsService.getAll(),
      transactionsService.getAll(),
      transactionsService.getAll({ startISO: startOfMonth, endISO: endOfMonth }),
    ])

    categories.value = cats
    accounts.value = accs
    allTransactions.value = allTx
    currentMonthTransactions.value = monthTx
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

  isSyncingForm.value = true
  updateGlobalRate.value = false
  if (!transaction) {
    // Se limpia antes de cargar datos para no mostrar errores viejos al abrir
    inBs.value = defaultInBs.value && canUseBs.value
    withBs.value = rememberWithBs.value
    rateInput.value = effectiveRate.value
    resetForm({
      values: {
        type: undefined,
        category: undefined,
        account: null,
        amount: undefined,
        description: '',
        date: todayLocalISODate(),
      },
    })
  }

  await fetchBudgetData()

  if (transaction) {
    inBs.value = transaction.input_currency === 'VES'
    withBs.value = transaction.exchange_rate !== null
    rateInput.value = transaction.exchange_rate ?? effectiveRate.value
    const txDate = transaction.date
      ? transaction.date.split('T')[0]
      : (transaction.created_at ? transaction.created_at.split('T')[0] : todayLocalISODate())

    setValues({
      type: transaction.categories?.type,
      category: transaction.category_id,
      account: transaction.account_id ?? null,
      amount: inBs.value ? transaction.bs_amount ?? transaction.amount : transaction.amount,
      description: transaction.description ?? '',
      date: txDate,
    })
  }
  await nextTick()
  isSyncingForm.value = false
})

// Al cambiar el tipo se limpia la categoría sin validar (no debe verse como error)
watch(() => values.type, (newType, oldType) => {
  if (isSyncingForm.value || oldType === undefined) return
  if (newType !== oldType) {
    setFieldValue('category', undefined, false)
    setFieldValue('account', null, false)
  }
})

// Al alternar el check, convierte el monto digitado para no perderlo
const onToggleBs = (checked: boolean) => {
  const typed = Number(values.amount) || 0
  const rate = currentRate.value ?? effectiveRate.value
  if (typed > 0 && rate) {
    const converted = checked ? typed * rate : typed / rate
    setFieldValue('amount', Math.round(converted * 100) / 100)
  }
  inBs.value = checked
}

const onSubmit = handleSubmit(async (formValues) => {
  try {
    const accountId = formValues.account ? Number(formValues.account) : null

    let amount = formValues.amount!
    let bsAmount: number | null = null
    if (inBs.value) {
      bsAmount = formValues.amount!
      if (!currentRate.value) {
        toast.error('Escribe una tasa Bs/USD válida para convertir los Bs')
        return
      }
      if (
        transaction?.input_currency === 'VES' &&
        transaction.bs_amount === bsAmount &&
        transaction.exchange_rate === currentRate.value
      ) {
        // Sin cambios en Bs ni tasa: conserva el monto original (evita deriva por redondeo)
        amount = transaction.amount
      } else {
        amount = toUsd(bsAmount, currentRate.value)
      }
      if (amount <= 0) {
        toast.error('El monto en Bs es demasiado pequeño para la tasa indicada')
        return
      }
    }

    // En Bs la tasa es la implícita (amount × tasa = bs_amount). En USD es
    // opcional: la que escribió el usuario, o ninguna si es solo en dólares.
    const inputCurrency = bsAmount !== null ? 'VES' : 'USD'
    let exchangeRate: number | null = null
    if (bsAmount !== null) {
      exchangeRate = currentRate.value
    } else if (withBs.value) {
      exchangeRate = currentRate.value
      if (!exchangeRate) {
        toast.error('Escribe una tasa Bs/USD válida o desactiva el equivalente en Bs')
        return
      }
      bsAmount = Math.round(amount * exchangeRate * 100) / 100
    }
    if (!isEditing.value && inputCurrency === 'USD') rememberWithBs.value = withBs.value

    if (isEditing.value && transaction) {
      await transactionsService.update(transaction.id, {
        amount,
        bs_amount: bsAmount,
        exchange_rate: exchangeRate,
        input_currency: inputCurrency,
        description: formValues.description,
        category_id: formValues.category!,
        account_id: accountId,
        date: formValues.date,
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
        amount,
        bs_amount: bsAmount,
        exchange_rate: exchangeRate,
        input_currency: inputCurrency,
        description: formValues.description,
        category_id: formValues.category!,
        account_id: accountId,
        user_id: user.id,
        date: formValues.date,
      })
      toast.success('Transacción registrada correctamente')
    }

    // La transacción ya quedó guardada; un fallo aquí no debe revertirla
    try {
      await applyGlobalRate()
    } catch (rateErr) {
      console.error('Error al actualizar la tasa global:', rateErr)
      toast.warning('La transacción se guardó, pero no se pudo actualizar la tasa global')
    }
    updateGlobalRate.value = false

    // Evita que el watcher de `type` marque error en categoría al reiniciar
    isSyncingForm.value = true
    resetForm()
    await nextTick()
    isSyncingForm.value = false
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
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <!-- Tipo -->
          <FormField v-slot="{ componentField }" name="type">
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

          <!-- Fecha -->
          <FormField v-slot="{ componentField }" name="date">
            <FormItem>
              <FormLabel>Fecha</FormLabel>
              <FormControl>
                <Input type="date" v-bind="componentField" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        </div>

        <!-- Categoría -->
        <FormField v-slot="{ componentField }" name="category">
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
              Presupuesto Mensual ({{ selectedAccountData.percentage }}% de {{ formatCurrency(selectedAccountData.netBase) }}):
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
              Presupuesto Mensual ({{ selectedAccountData.percentage }}% de {{ formatCurrency(selectedAccountData.netBase) }}):
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

          <!-- Proyección tras el ingreso -->
          <div v-if="selectedAccountData.currentAmount > 0" class="flex items-center justify-between pt-1.5 border-t border-dashed">
            <span class="text-muted-foreground">Disponible tras este ingreso:</span>
            <span class="flex flex-col items-end">
              <span class="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                {{ formatCurrency(selectedAccountData.projectedAvailable) }}
              </span>
              <BsHint :value="selectedAccountData.projectedAvailable" inline />
            </span>
          </div>
        </div>

        <!-- Monto en Bs -->
        <div v-if="canUseBs || inBs" class="flex items-center justify-between rounded-lg border p-2.5">
          <div class="space-y-0.5">
            <Label for="amount-in-bs" class="text-sm">Monto en Bs</Label>
            <p class="text-[11px] text-muted-foreground">Úsalo si pagaste o recibiste directamente en bolívares</p>
          </div>
          <Switch id="amount-in-bs" :model-value="inBs" :disabled="!canUseBs && !inBs" @update:model-value="onToggleBs(!!$event)" />
        </div>

        <!-- Monto -->
        <FormField v-slot="{ componentField }" name="amount">
          <FormItem>
            <FormLabel>{{ amountLabel }}</FormLabel>
            <FormControl>
              <Input type="number" step="0.01" placeholder="80.00" v-bind="componentField" />
            </FormControl>
            <span
              v-if="inBs && usdAmount > 0"
              class="block text-[11px] text-muted-foreground mt-0.5"
            >
              ≈ {{ formatCurrency(usdAmount) }}
            </span>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- Guardar equivalente en Bs (solo si el monto es en USD) -->
        <div v-if="!inBs && currency !== 'VES'" class="flex items-center justify-between gap-3 rounded-lg border p-2.5">
          <div class="space-y-0.5">
            <Label for="with-bs" class="text-sm">Guardar equivalente en Bs</Label>
            <p class="text-[11px] text-muted-foreground">Apágalo si fue 100% en dólares (PayPal, Zelle...)</p>
          </div>
          <Switch id="with-bs" :model-value="withBs" @update:model-value="withBs = !!$event" />
        </div>

        <!-- Tasa (precargada con la del sistema, editable) -->
        <div v-if="showRateField" class="space-y-1.5">
          <div class="flex items-center gap-2">
            <Label for="rate" class="shrink-0 text-sm">Tasa Bs/USD</Label>
            <Input
              id="rate"
              type="number"
              step="0.01"
              class="h-8"
              :placeholder="effectiveRate ? effectiveRate.toFixed(2) : 'Ej. 36.50'"
              :model-value="rateInput ?? ''"
              @update:model-value="rateInput = $event === '' ? null : Number($event)"
            />
          </div>
          <div v-if="rateDiffersFromSystem" class="flex items-center justify-between gap-3 rounded-lg border p-2.5">
            <div class="space-y-0.5">
              <Label for="update-global-rate" class="text-sm">Cambiar tasa manual de las configuraciones</Label>
              <p class="text-[11px] text-muted-foreground">
                Actual: {{ effectiveRate ? effectiveRate.toFixed(2) : '—' }}
                ({{ exchangeRateSource === 'manual' ? 'manual' : 'BCV' }}).
                <template v-if="updateGlobalRate">
                  Quedará en tasa manual: {{ currentRate?.toFixed(2) }}.
                </template>
              </p>
            </div>
            <Switch id="update-global-rate" :model-value="updateGlobalRate" @update:model-value="updateGlobalRate = !!$event" />
          </div>
          <p v-if="bsPreview" class="text-[11px] text-muted-foreground">≈ {{ formatCurrency(bsPreview, 'VES') }}</p>
        </div>

        <!-- Descripción -->
        <FormField v-slot="{ componentField }" name="description">
          <FormItem>
            <FormLabel>Descripción</FormLabel>
            <FormControl>
              <Textarea placeholder="Escribe una descripción..." v-bind="componentField" />
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
