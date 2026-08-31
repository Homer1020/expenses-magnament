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
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { computed, ref, watch } from 'vue'
import * as z from 'zod'
import { Wallet, AlertCircle, TrendingDown } from 'lucide-vue-next'

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
  category: z.number({ required_error: 'Selecciona una categoría' }),
  account: z.number().nullable().optional(),
}))

const { handleSubmit, isFieldDirty, resetForm, setValues, values } = useForm<{
  amount?: number
  description?: string
  category?: number
  account?: number | null
}>({
  validationSchema: formSchema,
  validateOnMount: false,
})

const categories = ref<TransactionCategory[]>([])
const accounts = ref<Account[]>([])
const currentMonthTransactions = ref<Transaction[]>([])
const loadingBudget = ref(false)

const selectedCategory = computed(() => {
  if (!values.category) return null
  return categories.value.find((c) => c.id === values.category) || null
})

const isExpenseCategory = computed(() => {
  return selectedCategory.value?.type === 0
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

  const allocatedBudget = (monthlyIncome.value * (acc.percentage || 0)) / 100
  // Sum expenses for this account this month, excluding current editing transaction
  const spentSoFar = currentMonthTransactions.value
    .filter((t) => t.account_id === acc.id && t.categories?.type !== 1 && (transaction ? t.id !== transaction.id : true))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

  const availableBefore = allocatedBudget - spentSoFar
  const currentAmount = Number(values.amount) || 0
  const projectedRemaining = availableBefore - currentAmount

  return {
    ...acc,
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

    const [cats, accs, monthTx] = await Promise.all([
      categoriesService.getAll(),
      accountsService.getAll(),
      transactionsService.getAll({ startISO: startOfMonth, endISO: endOfMonth }),
    ])

    categories.value = cats
    accounts.value = accs
    currentMonthTransactions.value = monthTx
  } catch (err) {
    console.error('Error fetching modal budget data:', err)
  } finally {
    loadingBudget.value = false
  }
}

watch(() => open, async (isOpen) => {
  if (!isOpen) return

  await fetchBudgetData()

  if (transaction) {
    setValues({
      category: transaction.category_id,
      account: transaction.account_id ?? null,
      amount: transaction.amount,
      description: transaction.description ?? '',
    })
  } else {
    resetForm({ values: { category: undefined, account: null, amount: undefined, description: '' } })
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
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      await transactionsService.create({
        amount: formValues.amount!,
        description: formValues.description,
        category_id: formValues.category!,
        account_id: accountId,
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
    <DialogContent class="sm:max-w-[480px]">
      <DialogHeader>
        <DialogTitle>{{ isEditing ? 'Editar Transacción' : 'Agregar Transacción' }}</DialogTitle>
      </DialogHeader>
      <form @submit="onSubmit" id="transaction-form" class="space-y-3.5">
        <!-- Categoría -->
        <FormField v-slot="{ componentField }" name="category" :validate-on-blur="!isFieldDirty">
          <FormItem>
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
                    <div class="flex items-center justify-between w-full gap-2">
                      <span>{{ category.name }}</span>
                      <span class="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded" :class="category.type === 1 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-500'">
                        {{ category.type === 1 ? 'Ingreso' : 'Egreso' }}
                      </span>
                    </div>
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- Cuenta (Visible para gastos / egresos o si hay cuentas configuradas) -->
        <FormField v-if="isExpenseCategory && accounts.length > 0" v-slot="{ componentField }" name="account">
          <FormItem>
            <div class="flex items-center justify-between">
              <FormLabel>Cuenta / Fondo Asignado</FormLabel>
              <span class="text-xs text-muted-foreground font-normal">Opcional</span>
            </div>
            <Select v-bind="componentField">
              <FormControl class="w-full">
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona la cuenta de donde se debita" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectGroup>
                  <SelectItem :value="null">
                    <span class="text-muted-foreground">Sin asignar a cuenta</span>
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

        <!-- Live Budget Card when Account is Selected -->
        <div v-if="selectedAccountData" class="p-3.5 rounded-lg border bg-accent/30 space-y-2.5 transition-all text-xs">
          <div class="flex items-center justify-between">
            <span class="font-medium text-muted-foreground flex items-center gap-1.5">
              <Wallet class="h-3.5 w-3.5 text-primary" />
              Presupuesto Mensual ({{ selectedAccountData.percentage }}% de {{ formatCurrency(monthlyIncome) }}):
            </span>
            <span class="font-semibold text-foreground">{{ formatCurrency(selectedAccountData.allocatedBudget) }}</span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-muted-foreground flex items-center gap-1.5">
              <TrendingDown class="h-3.5 w-3.5 text-rose-500" />
              Gastado este mes:
            </span>
            <span class="font-medium text-rose-500">{{ formatCurrency(selectedAccountData.spentSoFar) }}</span>
          </div>

          <div class="flex items-center justify-between pt-1.5 border-t">
            <span class="font-medium">Disponible actual en cuenta:</span>
            <span
              class="font-bold text-sm"
              :class="selectedAccountData.availableBefore >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'"
            >
              {{ formatCurrency(selectedAccountData.availableBefore) }}
            </span>
          </div>

          <!-- Projected remaining if amount is typed -->
          <div v-if="selectedAccountData.currentAmount > 0" class="flex items-center justify-between pt-1.5 border-t border-dashed">
            <span class="text-muted-foreground">Restante tras este gasto:</span>
            <span
              class="font-bold text-sm"
              :class="selectedAccountData.projectedRemaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'"
            >
              {{ formatCurrency(selectedAccountData.projectedRemaining) }}
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

        <!-- Monto -->
        <FormField v-slot="{ componentField }" name="amount" :validate-on-blur="!isFieldDirty">
          <FormItem>
            <FormLabel>Monto (USD)</FormLabel>
            <FormControl>
              <Input type="number" step="0.01" placeholder="80.00" v-bind="componentField" />
            </FormControl>
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
