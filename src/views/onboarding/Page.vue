<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import router from '@/router'
import supabase from '@/lib/supabase'
import { toast } from 'vue-sonner'
import {
  PRESET_ACCOUNT_GROUPS,
  PRESET_CATEGORIES,
  PRESET_CURRENCIES,
  type PresetAccount,
  type PresetAccountGroup,
  type PresetCategoryItem,
} from '@/constants/presets'
import { initializeUserData, quickSetupDefault } from '@/services/onboarding'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Coins,
  PieChart,
  Tag,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Layers,
  TrendingUp,
  TrendingDown,
  Loader2,
  Check,
} from 'lucide-vue-next'

// State
const currentStep = ref(1)
const loading = ref(false)
const quickLoading = ref(false)
const userId = ref<string | null>(null)
const userName = ref('')

// Step 1: Currency & Preferences
const selectedCurrency = ref('USD')

// Step 2: Accounts & Presets
const selectedPresetId = ref<string>('balanced')
const customAccounts = ref<PresetAccount[]>(
  JSON.parse(JSON.stringify(PRESET_ACCOUNT_GROUPS[0].accounts))
)
const newAccountName = ref('')
const newAccountPercentage = ref<number | undefined>(undefined)

// Step 3: Categories
interface CategorySelectable extends PresetCategoryItem {
  selected: boolean
}

const selectableCategories = ref<CategorySelectable[]>(
  PRESET_CATEGORIES.map((c) => ({
    ...c,
    selected: c.defaultSelected ?? true,
  }))
)
const categoryTypeFilter = ref<'all' | 'expense' | 'income'>('all')
const newCategoryName = ref('')
const newCategoryType = ref<0 | 1>(0)

// Computed
const totalPercentage = computed(() => {
  return customAccounts.value.reduce((sum, acc) => sum + (Number(acc.percentage) || 0), 0)
})

const isPercentageValid = computed(() => totalPercentage.value === 100)

const selectedCategoriesCount = computed(() => {
  return selectableCategories.value.filter((c) => c.selected).length
})

const filteredCategories = computed(() => {
  if (categoryTypeFilter.value === 'expense') {
    return selectableCategories.value.filter((c) => c.type === 0)
  }
  if (categoryTypeFilter.value === 'income') {
    return selectableCategories.value.filter((c) => c.type === 1)
  }
  return selectableCategories.value
})

// Handlers
const selectPreset = (preset: PresetAccountGroup) => {
  selectedPresetId.value = preset.id
  customAccounts.value = JSON.parse(JSON.stringify(preset.accounts))
}

const addAccount = () => {
  if (!newAccountName.value.trim()) {
    toast.error('Ingresa un nombre para la cuenta')
    return
  }
  const pct = Number(newAccountPercentage.value) || 0
  if (pct <= 0 || pct > 100) {
    toast.error('El porcentaje debe ser mayor a 0 y menor o igual a 100')
    return
  }

  customAccounts.value.push({
    name: newAccountName.value.trim(),
    percentage: pct,
  })

  newAccountName.value = ''
  newAccountPercentage.value = undefined
}

const removeAccount = (index: number) => {
  if (customAccounts.value.length <= 1) {
    toast.error('Debes mantener al menos una cuenta')
    return
  }
  customAccounts.value.splice(index, 1)
}

const toggleCategory = (cat: CategorySelectable) => {
  cat.selected = !cat.selected
}

const selectAllCategories = (select: boolean) => {
  selectableCategories.value.forEach((c) => {
    if (categoryTypeFilter.value === 'all') {
      c.selected = select
    } else if (categoryTypeFilter.value === 'expense' && c.type === 0) {
      c.selected = select
    } else if (categoryTypeFilter.value === 'income' && c.type === 1) {
      c.selected = select
    }
  })
}

const addCustomCategory = () => {
  if (!newCategoryName.value.trim()) {
    toast.error('Ingresa el nombre de la categoría')
    return
  }

  selectableCategories.value.unshift({
    name: newCategoryName.value.trim(),
    type: newCategoryType.value,
    group: 'Personalizada',
    selected: true,
  })

  newCategoryName.value = ''
  toast.success('Categoría agregada')
}

// Quick 1-Click Setup Handler
const handleQuickSetup = async () => {
  if (!userId.value) return
  quickLoading.value = true
  try {
    await quickSetupDefault(userId.value, selectedCurrency.value)
    toast.success('¡Configuración inicial completada con éxito!')
    router.replace('/')
  } catch (err: any) {
    console.error('Error en configuración rápida:', err)
    toast.error('Error al configurar la cuenta', {
      description: err?.message || 'Inténtalo de nuevo',
    })
  } finally {
    quickLoading.value = false
  }
}

// Wizard Final Submit Handler
const handleCompleteSetup = async () => {
  if (!userId.value) return

  if (!isPercentageValid.value) {
    toast.error('Los porcentajes de las cuentas deben sumar exactamente 100%')
    currentStep.value = 2
    return
  }

  const activeCategories = selectableCategories.value
    .filter((c) => c.selected)
    .map((c) => ({ name: c.name, type: c.type }))

  if (activeCategories.length === 0) {
    toast.error('Debes seleccionar al menos una categoría')
    currentStep.value = 3
    return
  }

  loading.value = true
  try {
    await initializeUserData(userId.value, {
      currency: selectedCurrency.value,
      accounts: customAccounts.value,
      categories: activeCategories,
    })

    toast.success('¡Tu espacio financiero está listo para usar!')
    router.replace('/')
  } catch (err: any) {
    console.error('Error al completar setup:', err)
    toast.error('Ocurrió un error al guardar la configuración', {
      description: err?.message || 'Por favor verifica tu conexión',
    })
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    userId.value = user.id
    userName.value = user.user_metadata?.full_name || user.user_metadata?.display_name || user.email?.split('@')[0] || ''
    if (user.user_metadata?.currency) {
      selectedCurrency.value = user.user_metadata.currency
    }
  } else {
    router.replace('/login')
  }
})
</script>

<template>
  <div class="min-h-screen bg-linear-to-b from-background via-background to-muted/30 py-8 px-4 sm:px-6">
    <div class="max-w-3xl mx-auto space-y-6">
      <!-- HEADER -->
      <div class="text-center space-y-2">
        <div class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Sparkles class="h-3.5 w-3.5" />
          <span>Configuración Inicial</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">
          {{ userName ? `¡Hola ${userName}! ` : '¡Bienvenido! ' }}Configuremos tu espacio
        </h1>
        <p class="text-sm text-muted-foreground max-w-lg mx-auto">
          Personaliza cómo quieres organizar tus presupuestos y clasificar tus movimientos. Podrás modificar todo cuando quieras.
        </p>
      </div>

      <!-- QUICK 1-CLICK ACTION BANNER -->
      <div class="rounded-xl border border-primary/20 bg-linear-to-r from-primary/5 via-primary/10 to-primary/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div class="flex items-center gap-3 text-center sm:text-left">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <Zap class="h-5 w-5" />
          </div>
          <div>
            <h2 class="text-sm font-semibold">¿Quieres empezar ya?</h2>
            <p class="text-xs text-muted-foreground">
              Aplica nuestra plantilla recomendada (50/20/15/10/5 y categorías estándar) con 1 clic.
            </p>
          </div>
        </div>
        <Button
          @click="handleQuickSetup"
          :disabled="quickLoading || loading"
          class="w-full sm:w-auto shrink-0 gap-1.5 shadow-sm"
        >
          <Loader2 v-if="quickLoading" class="h-4 w-4 animate-spin" />
          <Zap v-else class="h-4 w-4" />
          <span>Configuración Rápida</span>
        </Button>
      </div>

      <!-- WIZARD STEPPER -->
      <div class="grid grid-cols-3 gap-2">
        <button
          type="button"
          @click="currentStep = 1"
          class="flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all"
          :class="currentStep === 1 ? 'border-primary bg-primary/10 text-primary' : currentStep > 1 ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400' : 'bg-muted/40 text-muted-foreground'"
        >
          <CheckCircle2 v-if="currentStep > 1" class="h-4 w-4 shrink-0" />
          <Coins v-else class="h-4 w-4 shrink-0" />
          <span class="hidden sm:inline">1. Moneda</span>
          <span class="sm:hidden">1</span>
        </button>

        <button
          type="button"
          @click="currentStep = 2"
          class="flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all"
          :class="currentStep === 2 ? 'border-primary bg-primary/10 text-primary' : currentStep > 2 ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400' : 'bg-muted/40 text-muted-foreground'"
        >
          <CheckCircle2 v-if="currentStep > 2" class="h-4 w-4 shrink-0" />
          <PieChart v-else class="h-4 w-4 shrink-0" />
          <span class="hidden sm:inline">2. Presupuestos</span>
          <span class="sm:hidden">2</span>
        </button>

        <button
          type="button"
          @click="currentStep = 3"
          class="flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all"
          :class="currentStep === 3 ? 'border-primary bg-primary/10 text-primary' : 'bg-muted/40 text-muted-foreground'"
        >
          <Tag class="h-4 w-4 shrink-0" />
          <span class="hidden sm:inline">3. Categorías</span>
          <span class="sm:hidden">3</span>
        </button>
      </div>

      <!-- STEP 1: PREFERENCES & CURRENCY -->
      <Card v-if="currentStep === 1" class="border shadow-xs">
        <CardHeader>
          <CardTitle class="text-lg flex items-center gap-2">
            <Coins class="h-5 w-5 text-primary" />
            Paso 1: Moneda Principal
          </CardTitle>
          <CardDescription>
            Selecciona la divisa en la que se calcularán tus balances y presupuestos.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              v-for="curr in PRESET_CURRENCIES"
              :key="curr.code"
              @click="selectedCurrency = curr.code"
              class="flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all hover:border-primary/50"
              :class="selectedCurrency === curr.code ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'bg-card'"
            >
              <div class="flex items-center gap-3">
                <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-muted font-bold text-sm">
                  {{ curr.symbol }}
                </div>
                <div>
                  <p class="font-medium text-sm">{{ curr.code }}</p>
                  <p class="text-xs text-muted-foreground">{{ curr.name.split('-')[1]?.trim() || curr.name }}</p>
                </div>
              </div>
              <Check v-if="selectedCurrency === curr.code" class="h-4 w-4 text-primary" />
            </div>
          </div>
        </CardContent>
        <CardFooter class="flex justify-between border-t p-4">
          <div class="text-xs text-muted-foreground">
            Moneda seleccionada: <strong class="text-foreground">{{ selectedCurrency }}</strong>
          </div>
          <Button @click="currentStep = 2" class="gap-1.5">
            <span>Siguiente: Presupuestos</span>
            <ArrowRight class="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      <!-- STEP 2: ACCOUNTS & BUDGETS -->
      <Card v-else-if="currentStep === 2" class="border shadow-xs">
        <CardHeader>
          <CardTitle class="text-lg flex items-center gap-2">
            <PieChart class="h-5 w-5 text-primary" />
            Paso 2: Distribución de Cuentas y Presupuestos
          </CardTitle>
          <CardDescription>
            Cada vez que registres un ingreso, la aplicación lo distribuirá automáticamente en estas cuentas según su porcentaje.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <!-- Presets Options -->
          <div class="space-y-2">
            <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Plantillas Financieras Disponibles
            </Label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                v-for="group in PRESET_ACCOUNT_GROUPS"
                :key="group.id"
                @click="selectPreset(group)"
                class="p-3.5 rounded-xl border cursor-pointer transition-all hover:border-primary/50 relative"
                :class="selectedPresetId === group.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'bg-card'"
              >
                <div class="flex items-center justify-between mb-1">
                  <div class="flex items-center gap-1.5">
                    <span class="font-medium text-sm">{{ group.name }}</span>
                    <span
                      v-if="group.badge"
                      class="rounded-full bg-primary/10 px-2 py-0.2 text-[10px] font-semibold text-primary"
                    >
                      {{ group.badge }}
                    </span>
                  </div>
                  <Check v-if="selectedPresetId === group.id" class="h-4 w-4 text-primary" />
                </div>
                <p class="text-xs text-muted-foreground line-clamp-2">{{ group.description }}</p>
                <div class="mt-2.5 flex flex-wrap gap-1">
                  <span
                    v-for="a in group.accounts"
                    :key="a.name"
                    class="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {{ a.name.split('/')[0] }}: <strong>{{ a.percentage }}%</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Total Percentage Meter -->
          <div class="rounded-xl border p-4 bg-muted/20 space-y-2">
            <div class="flex items-center justify-between text-xs font-medium">
              <span class="flex items-center gap-1.5">
                <Layers class="h-4 w-4 text-muted-foreground" />
                Total Asignado:
              </span>
              <span
                class="font-bold text-sm"
                :class="isPercentageValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'"
              >
                {{ totalPercentage }}% / 100%
              </span>
            </div>

            <!-- Visual Bar -->
            <div class="h-2 w-full overflow-hidden rounded-full bg-muted flex">
              <div
                v-for="(acc, idx) in customAccounts"
                :key="acc.name"
                class="h-full transition-all duration-300"
                :class="[
                  idx % 5 === 0 ? 'bg-primary' : '',
                  idx % 5 === 1 ? 'bg-emerald-500' : '',
                  idx % 5 === 2 ? 'bg-blue-500' : '',
                  idx % 5 === 3 ? 'bg-amber-500' : '',
                  idx % 5 === 4 ? 'bg-purple-500' : '',
                ]"
                :style="{ width: `${acc.percentage}%` }"
                :title="`${acc.name}: ${acc.percentage}%`"
              ></div>
            </div>

            <p v-if="!isPercentageValid" class="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle class="h-3.5 w-3.5" />
              La suma de porcentajes debe ser exactamente 100% para continuar.
            </p>
          </div>

          <!-- Accounts List & Adjustments -->
          <div class="space-y-3">
            <Label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ajustar Cuentas Seleccionadas
            </Label>
            <div class="space-y-2">
              <div
                v-for="(acc, index) in customAccounts"
                :key="index"
                class="flex items-center justify-between gap-3 p-2.5 rounded-lg border bg-card"
              >
                <div class="flex-1">
                  <Input
                    type="text"
                    v-model="acc.name"
                    class="h-8 text-sm"
                    placeholder="Nombre de la cuenta"
                  />
                </div>
                <div class="flex items-center gap-1.5 w-28 shrink-0">
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    v-model.number="acc.percentage"
                    class="h-8 text-sm text-right pr-2"
                  />
                  <span class="text-xs font-semibold text-muted-foreground">%</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  class="h-8 w-8 p-0 text-muted-foreground hover:text-rose-500"
                  @click="removeAccount(index)"
                  :disabled="customAccounts.length <= 1"
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              </div>
            </div>

            <!-- Add new custom account -->
            <div class="flex items-center gap-2 pt-1">
              <Input
                type="text"
                placeholder="Nueva cuenta (ej. Viajes)"
                v-model="newAccountName"
                class="h-8 text-xs flex-1"
                @keyup.enter="addAccount"
              />
              <Input
                type="number"
                placeholder="%"
                min="1"
                max="100"
                v-model.number="newAccountPercentage"
                class="h-8 text-xs w-20"
                @keyup.enter="addAccount"
              />
              <Button size="sm" variant="outline" @click="addAccount" class="h-8 gap-1 text-xs">
                <Plus class="h-3.5 w-3.5" />
                <span>Agregar</span>
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter class="flex justify-between border-t p-4">
          <Button variant="outline" @click="currentStep = 1" class="gap-1.5">
            <ArrowLeft class="h-4 w-4" />
            <span>Atrás</span>
          </Button>
          <Button
            @click="currentStep = 3"
            :disabled="!isPercentageValid"
            class="gap-1.5"
          >
            <span>Siguiente: Categorías</span>
            <ArrowRight class="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      <!-- STEP 3: CATEGORIES SELECTION -->
      <Card v-else-if="currentStep === 3" class="border shadow-xs">
        <CardHeader>
          <CardTitle class="text-lg flex items-center gap-2">
            <Tag class="h-5 w-5 text-primary" />
            Paso 3: Selección de Categorías
          </CardTitle>
          <CardDescription>
            Haz clic en las categorías que quieras tener activas desde el inicio. Podrás crear más en cualquier momento.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <!-- Filters & Actions -->
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2 border-b">
            <div class="flex items-center gap-1.5">
              <Button
                size="sm"
                :variant="categoryTypeFilter === 'all' ? 'default' : 'outline'"
                class="h-7 text-xs"
                @click="categoryTypeFilter = 'all'"
              >
                Todas ({{ selectableCategories.length }})
              </Button>
              <Button
                size="sm"
                :variant="categoryTypeFilter === 'expense' ? 'default' : 'outline'"
                class="h-7 text-xs gap-1"
                @click="categoryTypeFilter = 'expense'"
              >
                <TrendingDown class="h-3 w-3 text-rose-500" />
                Gastos
              </Button>
              <Button
                size="sm"
                :variant="categoryTypeFilter === 'income' ? 'default' : 'outline'"
                class="h-7 text-xs gap-1"
                @click="categoryTypeFilter = 'income'"
              >
                <TrendingUp class="h-3 w-3 text-emerald-500" />
                Ingresos
              </Button>
            </div>

            <div class="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                class="h-7 text-xs"
                @click="selectAllCategories(true)"
              >
                Marcar todas
              </Button>
              <Button
                variant="ghost"
                size="sm"
                class="h-7 text-xs text-muted-foreground"
                @click="selectAllCategories(false)"
              >
                Desmarcar
              </Button>
            </div>
          </div>

          <!-- Selectable Category Chips -->
          <div class="flex flex-wrap gap-2 py-2 max-h-[340px] overflow-y-auto pr-1">
            <button
              v-for="cat in filteredCategories"
              :key="cat.name + cat.type"
              type="button"
              @click="toggleCategory(cat)"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium cursor-pointer transition-all"
              :class="[
                cat.selected
                  ? cat.type === 1
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30'
                    : 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                  : 'bg-muted/40 text-muted-foreground opacity-60 hover:opacity-100'
              ]"
            >
              <Check v-if="cat.selected" class="h-3.5 w-3.5" />
              <span>{{ cat.name }}</span>
              <span class="text-[10px] opacity-70">
                ({{ cat.type === 1 ? 'Ingreso' : 'Gasto' }})
              </span>
            </button>
          </div>

          <!-- Add custom category inline -->
          <div class="pt-2 border-t flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Input
              type="text"
              placeholder="Nueva categoría (ej. Criptomonedas)"
              v-model="newCategoryName"
              class="h-8 text-xs flex-1"
              @keyup.enter="addCustomCategory"
            />
            <div class="flex items-center gap-2">
              <select
                v-model.number="newCategoryType"
                class="h-8 rounded-md border bg-background px-2.5 text-xs text-foreground focus:outline-hidden"
              >
                <option :value="0">Gasto</option>
                <option :value="1">Ingreso</option>
              </select>
              <Button size="sm" variant="secondary" @click="addCustomCategory" class="h-8 gap-1 text-xs">
                <Plus class="h-3.5 w-3.5" />
                <span>Añadir</span>
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter class="flex flex-col sm:flex-row items-center justify-between gap-3 border-t p-4">
          <Button variant="outline" @click="currentStep = 2" class="gap-1.5 w-full sm:w-auto">
            <ArrowLeft class="h-4 w-4" />
            <span>Atrás</span>
          </Button>

          <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
            <div class="text-xs text-muted-foreground hidden sm:inline">
              {{ selectedCategoriesCount }} seleccionadas
            </div>
            <Button
              @click="handleCompleteSetup"
              :disabled="loading || selectedCategoriesCount === 0 || !isPercentageValid"
              class="gap-1.5 w-full sm:w-auto shadow-sm"
            >
              <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
              <Sparkles v-else class="h-4 w-4" />
              <span>Finalizar y Comenzar</span>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>
