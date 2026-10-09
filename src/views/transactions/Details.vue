<script setup lang="ts">
import { computed } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import BsHint from '@/components/BsHint.vue'
import { formatCurrency, formatDateTime } from '@/lib/formatters'
import type { Transaction } from '@/types'
import { ArrowDownRight, ArrowUpRight, CalendarDays, FileText, Pencil, PiggyBank, Tag } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  transaction: Transaction | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'edit', transaction: Transaction): void
}>()

const isIncome = computed(() => props.transaction?.categories?.type === 1)
const amount = computed(() => Number(props.transaction?.amount) || 0)
</script>

<template>
  <Dialog :open="open" @update:open="!$event && emit('close')">
    <DialogContent class="sm:max-w-[440px]">
      <template v-if="transaction">
        <DialogHeader>
          <DialogTitle>Detalle de transacción</DialogTitle>
          <DialogDescription>Registro #{{ transaction.id }}</DialogDescription>
        </DialogHeader>

        <div class="flex flex-col items-center gap-1.5 rounded-lg border bg-muted/30 py-5">
          <div
            class="rounded-full p-2.5"
            :class="isIncome ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-500'"
          >
            <component :is="isIncome ? ArrowUpRight : ArrowDownRight" class="h-5 w-5" />
          </div>
          <span
            class="text-3xl font-bold tracking-tight"
            :class="isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'"
          >
            {{ isIncome ? '+' : '-' }}{{ formatCurrency(amount) }}
          </span>
          <BsHint :value="amount" :exact-bs="transaction.bs_amount" class="!mt-0" />
          <span class="text-xs font-medium text-muted-foreground">{{ isIncome ? 'Ingreso' : 'Egreso' }}</span>
        </div>

        <dl class="divide-y text-sm">
          <div class="flex items-center justify-between gap-4 py-2.5">
            <dt class="flex items-center gap-2 text-muted-foreground"><Tag class="h-4 w-4" />Categoría</dt>
            <dd class="font-medium">{{ transaction.categories?.name ?? '-' }}</dd>
          </div>
          <div class="flex items-center justify-between gap-4 py-2.5">
            <dt class="flex items-center gap-2 text-muted-foreground"><PiggyBank class="h-4 w-4" />Presupuesto</dt>
            <dd>
              <span
                v-if="transaction.accounts"
                class="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20"
              >
                {{ transaction.accounts.name }} · {{ transaction.accounts.percentage }}%
              </span>
              <span v-else class="text-muted-foreground">Sin asignar</span>
            </dd>
          </div>
          <div class="flex items-center justify-between gap-4 py-2.5">
            <dt class="flex items-center gap-2 text-muted-foreground"><CalendarDays class="h-4 w-4" />Fecha</dt>
            <dd class="font-medium">{{ formatDateTime(transaction.date) }}</dd>
          </div>
          <div class="space-y-1.5 py-2.5">
            <dt class="flex items-center gap-2 text-muted-foreground"><FileText class="h-4 w-4" />Descripción</dt>
            <dd class="whitespace-pre-wrap break-words">
              {{ transaction.description || 'Sin descripción' }}
            </dd>
          </div>
        </dl>

        <DialogFooter class="flex justify-end gap-2">
          <Button type="button" variant="outline" @click="emit('close')">Cerrar</Button>
          <Button type="button" class="gap-1.5" @click="emit('edit', transaction)">
            <Pencil class="h-4 w-4" />
            Editar
          </Button>
        </DialogFooter>
      </template>
    </DialogContent>
  </Dialog>
</template>
