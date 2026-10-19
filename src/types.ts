// types/transaction.ts
export interface TransactionCategory {
  id: number,
  name: string,
  type: number,
  user_id?: string
}

export type TransactionCurrency = 'USD' | 'VES'

export interface Transaction {
  id: number
  amount: number
  /** Equivalente en Bs: exacto si se digitó en Bs, si no amount × exchange_rate. Null = solo dólares. */
  bs_amount: number | null
  /** Tasa Bs/USD aplicada al registrar la transacción. Null = solo dólares. */
  exchange_rate: number | null
  /** Moneda en que se digitó la transacción. */
  input_currency: TransactionCurrency
  description: string
  created_at: string
  user_id: string
  date: string
  category_id: number
  categories: TransactionCategory
  account_id?: number | null
  accounts?: Account | null
}

// Tipos para los errores de Supabase
export type SupabaseError = {
  message: string
  details?: string
  hint?: string
  code?: string
}

export interface Account {
  id: number
  name: string
  percentage: number
  created_at?: string,
  user_id: string
}

export interface BudgetGoal {
  id: number
  category_id: number
  categories?: TransactionCategory | null
  amount: number
  created_at?: string
  user_id: string
}

export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly'

export interface RecurringTransaction {
  id: number
  amount: number
  description: string
  category_id: number
  categories?: TransactionCategory | null
  account_id?: number | null
  accounts?: Account | null
  frequency: RecurringFrequency
  start_date: string
  next_run_date: string
  last_generated_at?: string | null
  active: boolean
  created_at?: string
  user_id: string
}