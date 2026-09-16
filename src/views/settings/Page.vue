<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { useSettings } from '@/composables/useSettings'
import { PRESET_CURRENCIES } from '@/constants/presets'
import { formatCurrency, formatDateTime } from '@/lib/formatters'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'

import {
  Coins,
  Check,
  Landmark,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Save,
  Loader2,
  Calculator,
} from 'lucide-vue-next'

const {
  currency,
  exchangeRateSource,
  manualRate,
  showBsEquivalent,
  bcvRate,
  bcvRateUpdatedAt,
  bcvRateLoading,
  bcvRateError,
  bcvRateStale,
  initialized,
  initSettings,
  refreshBcvRate,
  saveSettings,
} = useSettings()

const pageLoading = ref(true)

// Drafts locales: no tocan el estado global hasta que el usuario guarda.
const selectedCurrency = ref(currency.value)
const sourceDraft = ref(exchangeRateSource.value)
const manualRateDraft = ref<string>(manualRate.value != null ? String(manualRate.value) : '')
const showBsDraft = ref(showBsEquivalent.value)

const calcAmount = ref(1)

const savingCurrency = ref(false)
const savingConverter = ref(false)

const bcvAllowed = computed(() => selectedCurrency.value === 'USD')
const isVesSelected = computed(() => selectedCurrency.value === 'VES')

const effectiveRateDraft = computed<number | null>(() => {
  if (sourceDraft.value === 'manual') {
    const parsed = Number(manualRateDraft.value)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }
  return bcvRate.value && bcvRate.value > 0 ? bcvRate.value : null
})

const calcResult = computed(() => {
  if (effectiveRateDraft.value === null) return null
  const amount = Number(calcAmount.value)
  if (!Number.isFinite(amount)) return null
  return amount * effectiveRateDraft.value
})

function currencyLabel(name: string) {
  return name.split('-')[1]?.trim() || name
}

async function handleSaveCurrency() {
  savingCurrency.value = true
  try {
    const result = await saveSettings({ currency: selectedCurrency.value })
    if (result.synced) {
      toast.success('Moneda actualizada correctamente')
    } else {
      toast.error('La moneda se guardó en este dispositivo', {
        description: 'No se pudo sincronizar con tu cuenta. Se reintentará más adelante.',
      })
    }
    // Si la moneda ya no es USD, forzamos modo manual para el conversor.
    if (selectedCurrency.value !== 'USD' && sourceDraft.value === 'bcv') {
      sourceDraft.value = 'manual'
    }
  } finally {
    savingCurrency.value = false
  }
}

async function handleSaveConverter() {
  if (sourceDraft.value === 'manual') {
    const parsed = Number(manualRateDraft.value)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error('Ingresa una tasa manual válida', {
        description: 'Debe ser un número mayor a 0.',
      })
      return
    }
  }

  savingConverter.value = true
  try {
    const result = await saveSettings({
      exchangeRateSource: sourceDraft.value,
      manualRate: sourceDraft.value === 'manual' ? Number(manualRateDraft.value) : manualRate.value,
      showBsEquivalent: showBsDraft.value,
    })
    if (result.synced) {
      toast.success('Configuración del conversor actualizada')
    } else {
      toast.error('Los cambios se guardaron en este dispositivo', {
        description: 'No se pudo sincronizar con tu cuenta. Se reintentará más adelante.',
      })
    }
  } finally {
    savingConverter.value = false
  }
}

async function handleRefreshRate() {
  await refreshBcvRate()
  if (bcvRateError.value && !bcvRate.value) {
    toast.error('No se pudo obtener la tasa BCV', { description: bcvRateError.value })
  }
}

onMounted(async () => {
  await initSettings()
  selectedCurrency.value = currency.value
  sourceDraft.value = exchangeRateSource.value
  manualRateDraft.value = manualRate.value != null ? String(manualRate.value) : ''
  showBsDraft.value = showBsEquivalent.value
  pageLoading.value = false
})
</script>

<template>
  <div class="space-y-6 pb-12">
    <!-- TITULO DE LA PÁGINA -->
    <div class="border-b pb-4">
      <h1 class="text-2xl font-bold tracking-tight">Configuración</h1>
      <p class="text-sm text-muted-foreground mt-0.5">
        Administra la moneda de la aplicación y el conversor a Bolívares.
      </p>
    </div>

    <!-- CARGANDO -->
    <div v-if="pageLoading || !initialized" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Skeleton class="h-96 w-full rounded-xl" />
      <Skeleton class="h-96 w-full rounded-xl" />
    </div>

    <!-- CONTENIDO -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <!-- 1. MONEDA DE LA APLICACIÓN -->
      <Card class="border shadow-xs flex flex-col gap-0">
        <CardHeader class="border-b bg-muted/20 pb-4">
          <CardTitle class="text-base flex items-center gap-2">
            <Coins class="h-4 w-4 text-primary" />
            Moneda de la Aplicación
          </CardTitle>
          <CardDescription>
            Selecciona la divisa en la que se calcularán tus balances y presupuestos.
          </CardDescription>
        </CardHeader>
        <CardContent class="p-6 flex-1">
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
                  <p class="text-xs text-muted-foreground">{{ currencyLabel(curr.name) }}</p>
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
          <Button @click="handleSaveCurrency" :disabled="savingCurrency" class="gap-1.5">
            <Loader2 v-if="savingCurrency" class="h-4 w-4 animate-spin" />
            <Save v-else class="h-4 w-4" />
            <span>{{ savingCurrency ? 'Guardando...' : 'Guardar Moneda' }}</span>
          </Button>
        </CardFooter>
      </Card>

      <!-- 2. CONVERSOR A BOLÍVARES -->
      <Card class="border shadow-xs flex flex-col gap-0">
        <CardHeader class="border-b bg-muted/20 pb-4">
          <CardTitle class="text-base flex items-center gap-2">
            <Landmark class="h-4 w-4 text-primary" />
            Conversor a Bolívares (BCV)
          </CardTitle>
          <CardDescription>
            Muestra el equivalente en Bs de tus montos usando la tasa oficial o una tasa propia.
          </CardDescription>
        </CardHeader>

        <template v-if="isVesSelected">
          <CardContent class="p-6 flex-1 flex items-center justify-center text-center">
            <p class="text-sm text-muted-foreground">
              El conversor no aplica porque tu moneda ya es Bolívares (VES).
            </p>
          </CardContent>
        </template>

        <template v-else>
          <CardContent class="p-6 flex-1 flex flex-col gap-5">
            <!-- Selector de fuente -->
            <div class="grid grid-cols-2 gap-3">
              <button
                type="button"
                :disabled="!bcvAllowed"
                @click="bcvAllowed && (sourceDraft = 'bcv')"
                class="flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all"
                :class="[
                  sourceDraft === 'bcv' && bcvAllowed ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'bg-card',
                  !bcvAllowed ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50',
                ]"
              >
                <span class="text-sm font-medium">Tasa Oficial BCV</span>
                <span class="text-xs text-muted-foreground">Actualizada automáticamente</span>
              </button>
              <button
                type="button"
                @click="sourceDraft = 'manual'"
                class="flex flex-col items-start gap-1 p-3 rounded-xl border text-left cursor-pointer transition-all hover:border-primary/50"
                :class="sourceDraft === 'manual' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'bg-card'"
              >
                <span class="text-sm font-medium">Tasa Manual</span>
                <span class="text-xs text-muted-foreground">La ingresas tú</span>
              </button>
            </div>

            <p v-if="!bcvAllowed" class="text-xs text-muted-foreground -mt-2">
              La tasa BCV solo aplica cuando tu moneda es USD, porque se publica en Dólar → Bolívar.
              Con {{ selectedCurrency }} debes ingresar una tasa manual.
            </p>

            <!-- Modo BCV -->
            <div v-if="sourceDraft === 'bcv' && bcvAllowed" class="space-y-2">
              <div class="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                <div>
                  <p class="text-xs text-muted-foreground">Tasa actual</p>
                  <p class="text-lg font-bold">
                    {{ bcvRate ? formatCurrency(bcvRate, 'VES') : '—' }}
                  </p>
                  <p v-if="bcvRateUpdatedAt" class="text-[11px] text-muted-foreground">
                    Actualizado: {{ formatDateTime(bcvRateUpdatedAt) }}
                  </p>
                </div>
                <Button variant="secondary" size="sm" @click="handleRefreshRate" :disabled="bcvRateLoading" class="gap-1.5">
                  <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': bcvRateLoading }" />
                  Actualizar
                </Button>
              </div>

              <div v-if="bcvRateStale" class="flex items-center gap-2 p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs">
                <AlertTriangle class="h-4 w-4 shrink-0" />
                <span>No se pudo actualizar. Se muestra la última tasa conocida.</span>
              </div>
              <div v-else-if="bcvRateError" class="flex items-center gap-2 p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs">
                <AlertCircle class="h-4 w-4 shrink-0" />
                <span>{{ bcvRateError }}</span>
              </div>
            </div>

            <!-- Modo manual -->
            <div v-else class="space-y-1.5">
              <Label for="manual-rate">Tasa manual (Bs por 1 {{ selectedCurrency }})</Label>
              <Input
                id="manual-rate"
                type="number"
                min="0"
                step="0.01"
                placeholder="Ej: 840.50"
                v-model="manualRateDraft"
              />
              <p class="text-xs text-muted-foreground">
                Si cambias de moneda más adelante, revisa esta tasa: sigue expresada en Bs por 1 {{ selectedCurrency }}.
              </p>
            </div>

            <!-- Toggle mostrar en toda la app -->
            <div class="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p class="text-sm font-medium">Mostrar equivalente en Bs</p>
                <p class="text-xs text-muted-foreground">Se verá junto a los montos en toda la app.</p>
              </div>
              <Switch v-model="showBsDraft" />
            </div>

            <!-- Calculadora en vivo -->
            <div class="space-y-2 p-3 rounded-lg border bg-muted/10">
              <p class="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                <Calculator class="h-3.5 w-3.5" />
                Calculadora rápida
              </p>
              <div class="flex items-center gap-2">
                <Input type="number" min="0" step="0.01" v-model="calcAmount" class="w-28" />
                <span class="text-xs text-muted-foreground">{{ selectedCurrency }}</span>
                <span class="text-muted-foreground">≈</span>
                <span class="font-semibold text-sm">
                  {{ calcResult !== null ? formatCurrency(calcResult, 'VES') : 'Sin tasa disponible' }}
                </span>
              </div>
            </div>
          </CardContent>

          <CardFooter class="flex justify-end border-t p-4">
            <Button @click="handleSaveConverter" :disabled="savingConverter" class="gap-1.5">
              <Loader2 v-if="savingConverter" class="h-4 w-4 animate-spin" />
              <Save v-else class="h-4 w-4" />
              <span>{{ savingConverter ? 'Guardando...' : 'Guardar' }}</span>
            </Button>
          </CardFooter>
        </template>
      </Card>
    </div>
  </div>
</template>
