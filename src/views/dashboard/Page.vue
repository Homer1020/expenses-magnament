<script setup lang="ts">
import { ref, computed, onMounted, watch, type Ref } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { CalendarDate } from '@internationalized/date'
import type { DateRange } from 'reka-ui'
import { RouterLink } from 'vue-router'

import * as transactionsService from '@/services/transactions'
import * as categoriesService from '@/services/categories'
import * as accountsService from '@/services/accounts'
import type { Transaction, TransactionCategory, Account } from '@/types'
import { formatCurrency, formatCurrencyWithBs, formatPercentage, formatShortDate } from '@/lib/formatters'
import BsHint from '@/components/BsHint.vue'
import TablePicker from '@/views/transactions/TablePicker.vue'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

import supabase from '@/lib/supabase'
import { toast } from 'vue-sonner'
import { quickSetupDefault } from '@/services/onboarding'

import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  RefreshCw,
  PieChart,
  BarChart3,
  Calendar,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Zap,
  Loader2,
} from 'lucide-vue-next'

// State
const loading = ref(true)
const refreshing = ref(false)
const transactions = ref<Transaction[]>([])
const allTimeTransactions = ref<Transaction[]>([])
const categories = ref<TransactionCategory[]>([])
const accounts = ref<Account[]>([])

// Filter presets
type PeriodPreset = 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'all' | 'custom'
const selectedPreset = ref<PeriodPreset>('this_month')

const now = new Date()
const dateFilters = ref({
  start: new CalendarDate(now.getFullYear(), now.getMonth() + 1, 1),
  end: new CalendarDate(now.getFullYear(), now.getMonth() + 2, 1),
}) as Ref<DateRange>

// Set predefined date range
const setPreset = (preset: PeriodPreset) => {
  selectedPreset.value = preset
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1

  if (preset === 'this_month') {
    dateFilters.value = {
      start: new CalendarDate(year, month, 1),
      end: new CalendarDate(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1, 1),
    } as DateRange
  } else if (preset === 'last_month') {
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    dateFilters.value = {
      start: new CalendarDate(prevYear, prevMonth, 1),
      end: new CalendarDate(year, month, 1),
    } as DateRange
  } else if (preset === 'last_3_months') {
    const d = new Date(today)
    d.setMonth(d.getMonth() - 3)
    dateFilters.value = {
      start: new CalendarDate(d.getFullYear(), d.getMonth() + 1, 1),
      end: new CalendarDate(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1, 1),
    } as DateRange
  } else if (preset === 'this_year') {
    dateFilters.value = {
      start: new CalendarDate(year, 1, 1),
      end: new CalendarDate(year + 1, 1, 1),
    } as DateRange
  } else if (preset === 'all') {
    dateFilters.value = {
      start: new CalendarDate(2020, 1, 1),
      end: new CalendarDate(year + 5, 12, 31),
    } as DateRange
  }
  fetchDashboardData()
}

// Watch custom date picker changes
watch(
  () => dateFilters.value,
  (newVal) => {
    if (newVal?.start && newVal?.end && selectedPreset.value === 'custom') {
      fetchDashboardData()
    }
  },
  { deep: true }
)

const handleCustomDateChange = (range: DateRange) => {
  selectedPreset.value = 'custom'
  dateFilters.value = range
  if (range?.start && range?.end) {
    fetchDashboardData()
  }
}

// Load data
const fetchDashboardData = async (isRefresh = false) => {
  try {
    if (isRefresh) refreshing.value = true
    else loading.value = true

    let startISO: string | undefined
    let endISO: string | undefined

    if (dateFilters.value?.start) {
      startISO = dateFilters.value.start.toDate('UTC').toISOString()
    }
    if (dateFilters.value?.end) {
      endISO = dateFilters.value.end.toDate('UTC').toISOString()
    }

    // Parallel fetching for performance
    const [periodTx, allTx, cats, accs] = await Promise.all([
      transactionsService.getAll(startISO && endISO ? { startISO, endISO } : undefined),
      transactionsService.getAll(),
      categoriesService.getAll(),
      accountsService.getAll(),
    ])

    transactions.value = periodTx
    allTimeTransactions.value = allTx
    categories.value = cats
    accounts.value = accs
  } catch (error) {
    console.error('Error loading dashboard statistics:', error)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

onMounted(() => {
  fetchDashboardData()
})

const quickSettingUp = ref(false)

const handleDashboardQuickSetup = async () => {
  try {
    quickSettingUp.value = true
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await quickSetupDefault(user.id, user.user_metadata?.currency || 'USD')
    toast.success('¡Configuración inicial completada con éxito!')
    await fetchDashboardData(true)
  } catch (err: any) {
    console.error('Error al ejecutar setup rápido desde dashboard:', err)
    toast.error('Error al inicializar datos', {
      description: err?.message || 'Inténtalo nuevamente',
    })
  } finally {
    quickSettingUp.value = false
  }
}

// Calculations & KPIs
const totalIncome = computed(() => {
  return transactions.value
    .filter((t) => t.categories?.type === 1)
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0)
})

const totalExpenses = computed(() => {
  return transactions.value
    .filter((t) => t.categories?.type === 0 || t.categories?.type === undefined)
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0)
})

const netBalance = computed(() => totalIncome.value - totalExpenses.value)

const savingsRate = computed(() => {
  if (totalIncome.value <= 0) return 0
  const rate = ((totalIncome.value - totalExpenses.value) / totalIncome.value) * 100
  return Math.max(0, rate)
})

const incomeTransactionsCount = computed(() => {
  return transactions.value.filter((t) => t.categories?.type === 1).length
})

const expenseTransactionsCount = computed(() => {
  return transactions.value.filter((t) => t.categories?.type === 0 || t.categories?.type === undefined).length
})

const expenseRatio = computed(() => {
  if (totalIncome.value <= 0) return totalExpenses.value > 0 ? 100 : 0
  return Math.min(100, (totalExpenses.value / totalIncome.value) * 100)
})

// Daily average spend calculation
const averageDailySpend = computed(() => {
  if (totalExpenses.value <= 0) return 0
  let days = 30
  if (dateFilters.value?.start && dateFilters.value?.end) {
    const startMs = dateFilters.value.start.toDate('UTC').getTime()
    const endMs = dateFilters.value.end.toDate('UTC').getTime()
    const diffDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24))
    if (diffDays > 0) days = diffDays
  }
  return totalExpenses.value / days
})

// Top 5 largest expenses
const topExpenses = computed(() => {
  return [...transactions.value]
    .filter((t) => t.categories?.type === 0 || t.categories?.type === undefined)
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5)
})

// Recent transactions (last 6)
const recentTransactions = computed(() => {
  return [...transactions.value]
    .sort((a, b) => new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime())
    .slice(0, 6)
})

// Category Breakdown Table & Donut Data
const categoryBreakdown = computed(() => {
  const map = new Map<string, { name: string; total: number; count: number; type: number }>()

  transactions.value.forEach((t) => {
    const catName = t.categories?.name || 'Sin Categoría'
    const catType = t.categories?.type ?? 0
    const current = map.get(catName) || { name: catName, total: 0, count: 0, type: catType }
    current.total += Number(t.amount) || 0
    current.count += 1
    map.set(catName, current)
  })

  return Array.from(map.values())
})

const expenseCategories = computed(() => {
  return categoryBreakdown.value
    .filter((c) => c.type === 0)
    .sort((a, b) => b.total - a.total)
})

// Accounts Budget Allocation
const accountsDistribution = computed(() => {
  const income = totalIncome.value
  return accounts.value.map((acc) => {
    const allocatedBudget = (income * (acc.percentage || 0)) / 100
    const spent = transactions.value
      .filter((t) => t.account_id === acc.id && t.categories?.type !== 1)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    const available = allocatedBudget - spent
    const spentRatio = allocatedBudget > 0 ? (spent / allocatedBudget) * 100 : 0
    const fundBalance = allTimeTransactions.value
      .filter((t) => t.account_id === acc.id)
      .reduce((sum, t) => sum + (t.categories?.type === 1 ? Number(t.amount) || 0 : -(Number(t.amount) || 0)), 0)
    return {
      ...acc,
      allocatedBudget,
      spent,
      available,
      spentRatio,
      fundBalance,
    }
  })
})

// ---------------- CHART 1: Flow Over Time (Area Spline) ----------------
const flowChartOptions = computed<ApexOptions>(() => {
  // Aggregate daily data
  const dateMap = new Map<string, { income: number; expense: number }>()

  // Sort transactions by date ascending
  const sorted = [...transactions.value].sort(
    (a, b) => new Date(a.date || a.created_at).getTime() - new Date(b.date || b.created_at).getTime()
  )

  sorted.forEach((t) => {
    const d = (t.date || t.created_at).split('T')[0]
    const entry = dateMap.get(d) || { income: 0, expense: 0 }
    if (t.categories?.type === 1) {
      entry.income += Number(t.amount) || 0
    } else {
      entry.expense += Number(t.amount) || 0
    }
    dateMap.set(d, entry)
  })

  const dates = Array.from(dateMap.keys())
  const formattedDates = dates.map((d) => formatShortDate(d))

  return {
    chart: {
      id: 'cash-flow-chart',
      type: 'area',
      height: 320,
      fontFamily: 'inherit',
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: ['#10b981', '#f43f5e'],
    stroke: {
      curve: 'smooth',
      width: 2.5,
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 95, 100],
      },
    },
    dataLabels: { enabled: false },
    grid: {
      borderColor: 'rgba(156, 163, 175, 0.15)',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
    },
    xaxis: {
      categories: formattedDates.length > 0 ? formattedDates : ['Sin datos'],
      labels: {
        style: { colors: '#9ca3af', fontSize: '12px' },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: '#9ca3af', fontSize: '12px' },
        formatter: (val) => formatCurrency(val),
      },
    },
    tooltip: {
      theme: 'dark',
      y: {
        formatter: (val) => formatCurrencyWithBs(val),
      },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      labels: { colors: '#9ca3af' },
      markers: { size: 6 },
    },
  }
})

const flowSeries = computed(() => {
  const dateMap = new Map<string, { income: number; expense: number }>()
  const sorted = [...transactions.value].sort(
    (a, b) => new Date(a.date || a.created_at).getTime() - new Date(b.date || b.created_at).getTime()
  )

  sorted.forEach((t) => {
    const d = (t.date || t.created_at).split('T')[0]
    const entry = dateMap.get(d) || { income: 0, expense: 0 }
    if (t.categories?.type === 1) {
      entry.income += Number(t.amount) || 0
    } else {
      entry.expense += Number(t.amount) || 0
    }
    dateMap.set(d, entry)
  })

  const dates = Array.from(dateMap.keys())
  const incomeData = dates.map((d) => dateMap.get(d)!.income)
  const expenseData = dates.map((d) => dateMap.get(d)!.expense)

  return [
    { name: 'Ingresos', data: incomeData.length > 0 ? incomeData : [0] },
    { name: 'Gastos', data: expenseData.length > 0 ? expenseData : [0] },
  ]
})

// ---------------- CHART 2: Category Expenses (Donut) ----------------
const categoryChartOptions = computed<ApexOptions>(() => {
  const labels = expenseCategories.value.map((c) => c.name)
  return {
    chart: {
      type: 'donut',
      height: 300,
      fontFamily: 'inherit',
    },
    labels: labels.length > 0 ? labels : ['Sin gastos'],
    colors: [
      '#3b82f6',
      '#ec4899',
      '#f59e0b',
      '#8b5cf6',
      '#10b981',
      '#06b6d4',
      '#f97316',
      '#64748b',
    ],
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total Gastos',
              color: '#6b7280',
              formatter: () => formatCurrency(totalExpenses.value),
            },
            value: {
              fontSize: '18px',
              fontWeight: 600,
              color: 'currentColor',
              formatter: (val) => formatCurrency(Number(val)),
            },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    stroke: { width: 2, colors: ['transparent'] },
    legend: {
      position: 'bottom',
      labels: { colors: '#9ca3af' },
      fontSize: '12px',
    },
    tooltip: {
      theme: 'dark',
      y: {
        formatter: (val) => formatCurrencyWithBs(val),
      },
    },
  }
})

const categorySeries = computed(() => {
  const series = expenseCategories.value.map((c) => c.total)
  return series.length > 0 ? series : [0]
})

// ---------------- CHART 3 & SEMESTER METRICS: Monthly History (Bar Chart) ----------------
const semesterHistory = computed(() => {
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const fullMonthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const d = new Date()
  const list: {
    key: string
    shortLabel: string
    fullLabel: string
    month: string
    year: number
    income: number
    expense: number
    balance: number
    savingsRate: number
  }[] = []

  for (let i = 5; i >= 0; i--) {
    const targetDate = new Date(d.getFullYear(), d.getMonth() - i, 1)
    const y = targetDate.getFullYear()
    const m = targetDate.getMonth()
    const key = `${y}-${String(m + 1).padStart(2, '0')}`
    list.push({
      key,
      shortLabel: `${monthNames[m]} ${y !== d.getFullYear() ? "'" + String(y).slice(2) : ''}`,
      fullLabel: `${fullMonthNames[m]} ${y}`,
      month: monthNames[m],
      year: y,
      income: 0,
      expense: 0,
      balance: 0,
      savingsRate: 0,
    })
  }

  allTimeTransactions.value.forEach((t) => {
    const dateStr = t.date || t.created_at
    if (!dateStr) return
    const key = dateStr.slice(0, 7) // YYYY-MM
    const match = list.find((item) => item.key === key)
    if (match) {
      if (t.categories?.type === 1) {
        match.income += Number(t.amount) || 0
      } else {
        match.expense += Number(t.amount) || 0
      }
    }
  })

  list.forEach((item) => {
    item.balance = item.income - item.expense
    item.savingsRate = item.income > 0 ? Math.max(0, ((item.income - item.expense) / item.income) * 100) : 0
  })

  return list
})

const semesterTotals = computed(() => {
  const totalIncome = semesterHistory.value.reduce((sum, m) => sum + m.income, 0)
  const totalExpense = semesterHistory.value.reduce((sum, m) => sum + m.expense, 0)
  const netBalance = totalIncome - totalExpense
  const avgMonthlyIncome = totalIncome / 6
  const avgMonthlyExpense = totalExpense / 6
  const avgSavingsRate = totalIncome > 0 ? Math.max(0, (netBalance / totalIncome) * 100) : 0

  return {
    totalIncome,
    totalExpense,
    netBalance,
    avgMonthlyIncome,
    avgMonthlyExpense,
    avgSavingsRate,
  }
})

const monthlyChartOptions = computed<ApexOptions>(() => {
  return {
    chart: {
      type: 'bar',
      height: 220,
      fontFamily: 'inherit',
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '42%',
        borderRadius: 4,
      },
    },
    dataLabels: { enabled: false },
    colors: ['#10b981', '#f43f5e'],
    stroke: { show: true, width: 2, colors: ['transparent'] },
    xaxis: {
      categories: semesterHistory.value.map((m) => m.shortLabel),
      labels: { style: { colors: '#9ca3af', fontSize: '11px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: '#9ca3af', fontSize: '11px' },
        formatter: (val) => formatCurrency(val),
      },
    },
    grid: {
      borderColor: 'rgba(156, 163, 175, 0.15)',
      strokeDashArray: 4,
    },
    tooltip: {
      theme: 'dark',
      y: {
        formatter: (val) => formatCurrencyWithBs(val),
      },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      labels: { colors: '#9ca3af' },
      fontSize: '12px',
    },
  }
})

const monthlySeries = computed(() => {
  return [
    { name: 'Ingresos', data: semesterHistory.value.map((m) => m.income) },
    { name: 'Gastos', data: semesterHistory.value.map((m) => m.expense) },
  ]
})
</script>

<template>
  <div class="space-y-6 pb-12">
    <!-- TOP HEADER & CONTROLS -->
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-bold tracking-tight">Panel Financiero</h1>
          <span class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            <Sparkles class="h-3 w-3" /> Resumen en Tiempo Real
          </span>
        </div>
        <p class="text-sm text-muted-foreground mt-0.5">
          Monitorea tus ingresos, gastos, distribución de presupuestos y patrones de ahorro.
        </p>
      </div>

      <!-- Quick Actions -->
      <div class="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          :disabled="refreshing || loading"
          @click="fetchDashboardData(true)"
          class="h-9 gap-1.5"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': refreshing }" />
          <span>Actualizar</span>
        </Button>

        <Button as-child size="sm" class="h-9 gap-1.5 shadow-sm">
          <RouterLink to="/transactions">
            <Plus class="h-4 w-4" />
            <span>Nueva Transacción</span>
          </RouterLink>
        </Button>
      </div>
    </div>

    <!-- ONBOARDING WELCOME BANNER (IF EMPTY) -->
    <Card
      v-if="!loading && accounts.length === 0 && categories.length === 0"
      class="border-primary/30 bg-linear-to-r from-primary/10 via-primary/5 to-transparent p-5 sm:p-6 shadow-sm overflow-hidden relative"
    >
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div class="space-y-1.5 max-w-xl">
          <div class="flex items-center gap-2">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles class="h-4 w-4" />
            </div>
            <h2 class="text-base sm:text-lg font-bold text-foreground">¡Bienvenido a tu Gestor de Gastos!</h2>
          </div>
          <p class="text-xs sm:text-sm text-muted-foreground">
            Aún no has configurado tus presupuestos ni tus categorías. Configura tu espacio en 1 minuto para empezar a registrar movimientos y ver estadísticas.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
          <Button as-child class="gap-1.5 shadow-xs flex-1 md:flex-initial">
            <RouterLink to="/onboarding">
              <Sparkles class="h-4 w-4" />
              <span>Iniciar Asistente</span>
            </RouterLink>
          </Button>
          <Button
            variant="outline"
            class="gap-1.5 flex-1 md:flex-initial bg-card/80"
            :disabled="quickSettingUp"
            @click="handleDashboardQuickSetup"
          >
            <Loader2 v-if="quickSettingUp" class="h-4 w-4 animate-spin" />
            <Zap v-else class="h-4 w-4 text-primary" />
            <span>Setup Rápido (1 Clic)</span>
          </Button>
        </div>
      </div>
    </Card>

    <!-- FILTER TOOLBAR -->
    <Card class="border shadow-xs bg-card/60 backdrop-blur-xs p-0">
      <CardContent class="p-3">
        <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <!-- Preset Buttons -->
          <div class="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
            <Button
              size="sm"
              :variant="selectedPreset === 'this_month' ? 'default' : 'ghost'"
              class="h-8 text-xs font-medium"
              @click="setPreset('this_month')"
            >
              Este Mes
            </Button>
            <Button
              size="sm"
              :variant="selectedPreset === 'last_month' ? 'default' : 'ghost'"
              class="h-8 text-xs font-medium"
              @click="setPreset('last_month')"
            >
              Mes Pasado
            </Button>
            <Button
              size="sm"
              :variant="selectedPreset === 'last_3_months' ? 'default' : 'ghost'"
              class="h-8 text-xs font-medium"
              @click="setPreset('last_3_months')"
            >
              Últimos 3 Meses
            </Button>
            <Button
              size="sm"
              :variant="selectedPreset === 'this_year' ? 'default' : 'ghost'"
              class="h-8 text-xs font-medium"
              @click="setPreset('this_year')"
            >
              Este Año
            </Button>
            <Button
              size="sm"
              :variant="selectedPreset === 'all' ? 'default' : 'ghost'"
              class="h-8 text-xs font-medium"
              @click="setPreset('all')"
            >
              Todo
            </Button>
          </div>

          <!-- Date Picker for custom range -->
          <div class="flex items-center gap-2 w-full lg:w-auto">
            <span class="text-xs text-muted-foreground hidden sm:inline">Rango:</span>
            <TablePicker
              :model-value="dateFilters"
              @update:model-value="handleCustomDateChange"
            />
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- LOADING STATE -->
    <div v-if="loading" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Skeleton v-for="i in 4" :key="i" class="h-32 rounded-xl" />
    </div>

    <!-- MAIN DASHBOARD CONTENT -->
    <template v-else>
      <!-- 1. STATS KPI CARDS -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <!-- Card 1: Ingresos -->
        <Card class="relative overflow-hidden border shadow-xs transition-all hover:shadow-md">
          <div class="absolute top-0 right-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-emerald-500/10 blur-xl"></div>
          <CardHeader class="flex flex-row items-center justify-between pb-2">
            <CardTitle class="text-sm font-medium text-muted-foreground">Ingresos Totales</CardTitle>
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp class="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {{ formatCurrency(totalIncome) }}
            </div>
            <BsHint :value="totalIncome" />
            <div class="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{{ incomeTransactionsCount }} {{ incomeTransactionsCount === 1 ? 'ingreso' : 'ingresos' }}</span>
              <span class="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
                <ArrowUpRight class="mr-0.5 h-3.5 w-3.5" /> Entradas
              </span>
            </div>
          </CardContent>
        </Card>

        <!-- Card 2: Gastos -->
        <Card class="relative overflow-hidden border shadow-xs transition-all hover:shadow-md">
          <div class="absolute top-0 right-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-rose-500/10 blur-xl"></div>
          <CardHeader class="flex flex-row items-center justify-between pb-2">
            <CardTitle class="text-sm font-medium text-muted-foreground">Gastos Totales</CardTitle>
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <TrendingDown class="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {{ formatCurrency(totalExpenses) }}
            </div>
            <BsHint :value="totalExpenses" />
            <div class="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{{ expenseTransactionsCount }} {{ expenseTransactionsCount === 1 ? 'gasto' : 'gastos' }}</span>
              <span class="font-medium text-rose-600 dark:text-rose-400">
                {{ formatPercentage(expenseRatio) }} del ingreso
              </span>
            </div>
          </CardContent>
        </Card>

        <!-- Card 3: Balance Neto -->
        <Card class="relative overflow-hidden border shadow-xs transition-all hover:shadow-md">
          <div
            class="absolute top-0 right-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full blur-xl"
            :class="netBalance >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'"
          ></div>
          <CardHeader class="flex flex-row items-center justify-between pb-2">
            <CardTitle class="text-sm font-medium text-muted-foreground">Balance Neto</CardTitle>
            <div
              class="flex h-9 w-9 items-center justify-center rounded-lg"
              :class="netBalance >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'"
            >
              <Wallet class="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              class="text-2xl font-bold"
              :class="netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
            >
              {{ netBalance > 0 ? '+' : '' }}{{ formatCurrency(netBalance) }}
            </div>
            <BsHint :value="netBalance" />
            <div class="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span v-if="netBalance >= 0" class="text-emerald-600 dark:text-emerald-400 font-medium">
                Superávit Disponible
              </span>
              <span v-else class="text-rose-600 dark:text-rose-400 font-medium">
                Déficit en el Periodo
              </span>
              <span>Flujo de Caja</span>
            </div>
          </CardContent>
        </Card>

        <!-- Card 4: Tasa de Ahorro & Gasto Diario -->
        <Card class="relative overflow-hidden border shadow-xs transition-all hover:shadow-md">
          <div class="absolute top-0 right-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-blue-500/10 blur-xl"></div>
          <CardHeader class="flex flex-row items-center justify-between pb-2">
            <CardTitle class="text-sm font-medium text-muted-foreground">Tasa de Ahorro</CardTitle>
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <PiggyBank class="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div class="flex items-baseline gap-2">
              <span class="text-2xl font-bold text-foreground">{{ formatPercentage(savingsRate) }}</span>
              <span class="text-xs text-muted-foreground">de ahorro</span>
            </div>
            <div class="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Promedio diario:</span>
              <span class="font-semibold text-foreground">{{ formatCurrency(averageDailySpend) }}/día<BsHint :value="averageDailySpend" inline /></span>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- 2. PRIMARY CHARTS ROW -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-7">
        <!-- Flow Evolution (Area Chart - 4 columns) -->
        <Card class="lg:col-span-4 border shadow-xs">
          <CardHeader class="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle class="text-base font-semibold">Evolución de Ingresos vs Gastos</CardTitle>
              <CardDescription>Comportamiento financiero a lo largo del tiempo</CardDescription>
            </div>
            <div class="rounded-full bg-primary/10 p-2 text-primary">
              <BarChart3 class="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div v-if="transactions.length === 0" class="flex h-[320px] flex-col items-center justify-center text-center text-muted-foreground">
              <Calendar class="h-10 w-10 opacity-30 mb-2" />
              <p class="text-sm font-medium">No hay transacciones registradas en este periodo</p>
              <p class="text-xs opacity-75">Selecciona otro rango o añade nuevos movimientos</p>
            </div>
            <div v-else>
              <VueApexCharts
                type="area"
                height="320"
                :options="flowChartOptions"
                :series="flowSeries"
              />
            </div>
          </CardContent>
        </Card>

        <!-- Category Expenses (Donut Chart - 3 columns) -->
        <Card class="lg:col-span-3 border shadow-xs">
          <CardHeader class="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle class="text-base font-semibold">Gastos por Categoría</CardTitle>
              <CardDescription>Distribución porcentual de los egresos</CardDescription>
            </div>
            <div class="rounded-full bg-primary/10 p-2 text-primary">
              <PieChart class="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div v-if="expenseCategories.length === 0" class="flex h-[300px] flex-col items-center justify-center text-center text-muted-foreground">
              <PieChart class="h-10 w-10 opacity-30 mb-2" />
              <p class="text-sm font-medium">No hay egresos en este periodo</p>
              <p class="text-xs opacity-75">Los gastos por categoría aparecerán aquí</p>
            </div>
            <div v-else>
              <VueApexCharts
                type="donut"
                height="300"
                :options="categoryChartOptions"
                :series="categorySeries"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- 3. ACCOUNTS BUDGET DISTRIBUTION & MONTHLY COMPARISON -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-7">
        <!-- Accounts Distribution Card (3 cols) -->
        <Card class="lg:col-span-3 border shadow-xs flex flex-col justify-between">
          <CardHeader class="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle class="text-base font-semibold">Distribución por Presupuestos</CardTitle>
              <CardDescription>Presupuesto ideal según ingresos del periodo</CardDescription>
            </div>
            <Button as-child variant="ghost" size="sm" class="h-8 gap-1 text-xs">
              <RouterLink to="/accounts">
                <span>Configurar</span>
                <ArrowRight class="h-3 w-3" />
              </RouterLink>
            </Button>
          </CardHeader>
          <CardContent class="space-y-4 flex-1 flex flex-col justify-between">
            <div v-if="accounts.length === 0" class="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <Layers class="h-8 w-8 opacity-30 mb-2" />
              <p class="text-sm font-medium">No has creado presupuestos aún</p>
              <p class="text-xs opacity-75 mb-3">Define porcentajes para tus ahorros y gastos (ej. 50/30/20)</p>
              <Button as-child size="sm" variant="outline">
                <RouterLink to="/accounts">Crear Presupuestos</RouterLink>
              </Button>
            </div>
            <div v-else class="space-y-3.5 flex-1 flex flex-col justify-between">
              <div class="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                <div
                  v-for="acc in accountsDistribution"
                  :key="acc.id"
                  class="rounded-lg border bg-card/50 p-3 transition-colors hover:bg-accent/40 space-y-2"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <div
                        class="h-2 w-2 rounded-full"
                        :class="acc.spentRatio > 100 ? 'bg-rose-500' : acc.spentRatio >= 80 ? 'bg-amber-500' : 'bg-primary'"
                      ></div>
                      <span class="font-medium text-sm">{{ acc.name }}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <span class="text-xs text-muted-foreground">{{ Math.round(acc.spentRatio) }}% usado</span>
                      <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {{ acc.percentage }}%
                      </span>
                    </div>
                  </div>

                  <!-- Spending Progress Bar -->
                  <div class="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      class="h-full rounded-full transition-all duration-500"
                      :class="acc.spentRatio > 100 ? 'bg-rose-500' : acc.spentRatio >= 80 ? 'bg-amber-500' : 'bg-primary'"
                      :style="{ width: `${Math.min(100, acc.spentRatio)}%` }"
                    ></div>
                  </div>

                  <div class="grid grid-cols-3 gap-1 pt-1 text-[11px]">
                    <div>
                      <span class="text-muted-foreground block">Presupuesto:</span>
                      <span class="font-medium text-foreground">{{ formatCurrency(acc.allocatedBudget) }}</span>
                      <BsHint :value="acc.allocatedBudget" inline />
                    </div>
                    <div>
                      <span class="text-muted-foreground block">Gastado:</span>
                      <span class="font-medium text-rose-500">{{ formatCurrency(acc.spent) }}</span>
                      <BsHint :value="acc.spent" inline />
                    </div>
                    <div class="text-right">
                      <span class="text-muted-foreground block">Disponible:</span>
                      <span
                        class="font-bold"
                        :class="acc.available >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'"
                      >
                        {{ formatCurrency(acc.available) }}
                      </span>
                      <BsHint :value="acc.available" inline />
                    </div>
                  </div>

                  <div class="flex items-center justify-between pt-1.5 border-t border-dashed text-[11px]">
                    <span class="text-muted-foreground">Fondo acumulado:</span>
                    <span
                      class="font-bold"
                      :class="acc.fundBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'"
                    >
                      {{ formatCurrency(acc.fundBalance) }}
                    </span>
                    <BsHint :value="acc.fundBalance" inline />
                  </div>
                </div>
              </div>

              <!-- Total percentage hint -->
              <div class="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t mt-auto">
                <span>Porcentaje asignado total:</span>
                <span
                  class="font-semibold"
                  :class="accounts.reduce((acc, a) => acc + (a.percentage || 0), 0) === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'"
                >
                  {{ accounts.reduce((acc, a) => acc + (a.percentage || 0), 0) }}% / 100%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Monthly Trends Comparison (4 cols) -->
        <Card class="lg:col-span-4 border shadow-xs flex flex-col justify-between">
          <CardHeader class="flex flex-row items-center justify-between pb-3">
            <div>
              <div class="flex items-center gap-2">
                <CardTitle class="text-base font-semibold">Tendencia Semestral</CardTitle>
                <span class="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                  Últimos 6 meses
                </span>
              </div>
              <CardDescription>Comparativa histórica de ingresos, egresos y balance mensual consolidado</CardDescription>
            </div>
            <div class="rounded-full bg-primary/10 p-2 text-primary">
              <Clock class="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent class="space-y-4 flex-1 flex flex-col justify-between">
            <!-- Summary KPI metrics -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div class="rounded-lg border bg-card/60 p-2.5">
                <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TrendingUp class="h-3.5 w-3.5 text-emerald-500" />
                  <span class="truncate">Total Ingresos</span>
                </div>
                <div class="mt-1 text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {{ formatCurrency(semesterTotals.totalIncome) }}
                </div>
                <BsHint :value="semesterTotals.totalIncome" />
                <div class="text-[11px] text-muted-foreground truncate">
                  Prom. {{ formatCurrency(semesterTotals.avgMonthlyIncome) }}/mes
                </div>
              </div>

              <div class="rounded-lg border bg-card/60 p-2.5">
                <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TrendingDown class="h-3.5 w-3.5 text-rose-500" />
                  <span class="truncate">Total Gastos</span>
                </div>
                <div class="mt-1 text-base font-bold text-rose-600 dark:text-rose-400">
                  {{ formatCurrency(semesterTotals.totalExpense) }}
                </div>
                <BsHint :value="semesterTotals.totalExpense" />
                <div class="text-[11px] text-muted-foreground truncate">
                  Prom. {{ formatCurrency(semesterTotals.avgMonthlyExpense) }}/mes
                </div>
              </div>

              <div class="rounded-lg border bg-card/60 p-2.5">
                <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Wallet
                    class="h-3.5 w-3.5"
                    :class="semesterTotals.netBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'"
                  />
                  <span class="truncate">Balance Neto</span>
                </div>
                <div
                  class="mt-1 text-base font-bold"
                  :class="semesterTotals.netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
                >
                  {{ semesterTotals.netBalance > 0 ? '+' : '' }}{{ formatCurrency(semesterTotals.netBalance) }}
                </div>
                <BsHint :value="semesterTotals.netBalance" />
                <div class="text-[11px] text-muted-foreground truncate">
                  {{ formatPercentage(semesterTotals.avgSavingsRate) }} tasa de ahorro
                </div>
              </div>
            </div>

            <!-- Apex Bar Chart -->
            <div class="relative">
              <VueApexCharts
                type="bar"
                height="220"
                :options="monthlyChartOptions"
                :series="monthlySeries"
              />
            </div>

            <!-- Historical Monthly Breakdown List -->
            <div class="space-y-2 pt-2 border-t mt-auto">
              <div class="flex items-center justify-between text-xs font-medium text-muted-foreground pb-0.5">
                <span>Historial Mensual</span>
                <span>Balance & Rendimiento</span>
              </div>

              <div class="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                <div
                  v-for="m in [...semesterHistory].reverse()"
                  :key="m.key"
                  class="flex items-center justify-between rounded-md border bg-accent/20 px-2.5 py-1.5 text-xs transition-colors hover:bg-accent/50"
                >
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-foreground w-14">{{ m.shortLabel }}</span>
                    <div class="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span class="text-emerald-600 dark:text-emerald-400 font-medium">
                        +{{ formatCurrency(m.income) }}
                      </span>
                      <span>•</span>
                      <span class="text-rose-600 dark:text-rose-400 font-medium">
                        -{{ formatCurrency(m.expense) }}
                      </span>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <span
                      class="font-semibold"
                      :class="m.balance > 0 ? 'text-emerald-600 dark:text-emerald-400' : m.balance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'"
                    >
                      {{ m.balance > 0 ? '+' : '' }}{{ formatCurrency(m.balance) }}
                    </span>
                    <span
                      class="rounded px-1.5 py-0.5 text-[10px] font-medium"
                      :class="
                        m.income === 0 && m.expense === 0
                          ? 'bg-muted text-muted-foreground'
                          : m.balance >= 0
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      "
                    >
                      {{ m.income === 0 && m.expense === 0 ? 'Sin act.' : `${Math.round(m.savingsRate)}%` }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- 4. BOTTOM SECTION: TOP EXPENSES & RECENT TRANSACTIONS -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- Top 5 Largest Expenses -->
        <Card class="border shadow-xs">
          <CardHeader class="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle class="text-base font-semibold">Mayores Gastos del Periodo</CardTitle>
              <CardDescription>Las 5 salidas de dinero más significativas</CardDescription>
            </div>
            <span class="text-xs text-muted-foreground font-medium">Top 5</span>
          </CardHeader>
          <CardContent>
            <div v-if="topExpenses.length === 0" class="flex h-48 flex-col items-center justify-center text-center text-muted-foreground">
              <CheckCircle2 class="h-8 w-8 text-emerald-500/50 mb-2" />
              <p class="text-sm font-medium">No se registraron gastos en este periodo</p>
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="(expense, idx) in topExpenses"
                :key="expense.id"
                class="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent/40"
              >
                <div class="flex items-center gap-3">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-500/10 font-bold text-xs text-rose-600 dark:text-rose-400">
                    #{{ idx + 1 }}
                  </div>
                  <div>
                    <p class="text-sm font-medium leading-none text-foreground">
                      {{ expense.description || 'Gasto sin descripción' }}
                    </p>
                    <div class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span class="inline-flex items-center rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
                        {{ expense.categories?.name || 'General' }}
                      </span>
                      <span>•</span>
                      <span>{{ formatShortDate(expense.date || expense.created_at) }}</span>
                    </div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-sm font-bold text-rose-600 dark:text-rose-400">
                    -{{ formatCurrency(expense.amount) }}
                  </div>
                  <BsHint :value="expense.amount" />
                  <span class="text-[11px] text-muted-foreground">
                    {{ totalExpenses > 0 ? formatPercentage((expense.amount / totalExpenses) * 100) : '0%' }} del total
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Recent Transactions -->
        <Card class="border shadow-xs">
          <CardHeader class="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle class="text-base font-semibold">Movimientos Recientes</CardTitle>
              <CardDescription>Últimas transacciones registradas en este periodo</CardDescription>
            </div>
            <Button as-child variant="ghost" size="sm" class="h-8 gap-1 text-xs">
              <RouterLink to="/transactions">
                <span>Ver todas</span>
                <ArrowRight class="h-3 w-3" />
              </RouterLink>
            </Button>
          </CardHeader>
          <CardContent>
            <div v-if="recentTransactions.length === 0" class="flex h-48 flex-col items-center justify-center text-center text-muted-foreground">
              <AlertCircle class="h-8 w-8 opacity-30 mb-2" />
              <p class="text-sm font-medium">Sin transacciones recientes</p>
            </div>
            <div v-else class="space-y-2.5">
              <div
                v-for="tx in recentTransactions"
                :key="tx.id"
                class="flex items-center justify-between rounded-lg border p-2.5 transition-colors hover:bg-accent/40"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    :class="tx.categories?.type === 1 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'"
                  >
                    <ArrowUpRight v-if="tx.categories?.type === 1" class="h-4 w-4" />
                    <ArrowDownRight v-else class="h-4 w-4" />
                  </div>
                  <div>
                    <p class="text-sm font-medium leading-none text-foreground">
                      {{ tx.description || (tx.categories?.type === 1 ? 'Ingreso' : 'Gasto') }}
                    </p>
                    <div class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span class="font-medium text-foreground/80">
                        {{ tx.categories?.name || 'General' }}
                      </span>
                      <span>•</span>
                      <span>{{ formatShortDate(tx.date || tx.created_at) }}</span>
                    </div>
                  </div>
                </div>
                <div class="text-right">
                  <div
                    class="text-sm font-bold"
                    :class="tx.categories?.type === 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
                  >
                    {{ tx.categories?.type === 1 ? '+' : '-' }}{{ formatCurrency(tx.amount) }}
                  </div>
                  <BsHint :value="tx.amount" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- 5. CATEGORY DETAILED BREAKDOWN LIST -->
      <Card class="border shadow-xs">
        <CardHeader class="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle class="text-base font-semibold">Desglose Detallado de Gastos por Categoría</CardTitle>
            <CardDescription>Resumen de egresos clasificados con barras de participación</CardDescription>
          </div>
          <Button as-child variant="outline" size="sm" class="h-8 text-xs">
            <RouterLink to="/categories">Gestionar Categorías</RouterLink>
          </Button>
        </CardHeader>
        <CardContent>
          <div v-if="expenseCategories.length === 0" class="py-6 text-center text-muted-foreground text-sm">
            No hay gastos categorizados en este periodo.
          </div>
          <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="cat in expenseCategories"
              :key="cat.name"
              class="rounded-lg border bg-card/60 p-3.5 space-y-2"
            >
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-foreground">{{ cat.name }}</span>
                <span class="flex flex-col items-end">
                  <span class="text-sm font-bold text-rose-600 dark:text-rose-400">
                    {{ formatCurrency(cat.total) }}
                  </span>
                  <BsHint :value="cat.total" inline />
                </span>
              </div>

              <!-- Progress Bar -->
              <div class="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  class="h-full rounded-full bg-rose-500 transition-all duration-500"
                  :style="{ width: `${totalExpenses > 0 ? (cat.total / totalExpenses) * 100 : 0}%` }"
                ></div>
              </div>

              <div class="flex items-center justify-between text-xs text-muted-foreground">
                <span>{{ cat.count }} {{ cat.count === 1 ? 'transacción' : 'transacciones' }}</span>
                <span class="font-medium">
                  {{ totalExpenses > 0 ? formatPercentage((cat.total / totalExpenses) * 100) : '0%' }}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </template>
  </div>
</template>