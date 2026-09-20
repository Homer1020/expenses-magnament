// types/transaction.ts
export interface TransactionCategory {
  id: number,
  name: string,
  type: number,
  user_id?: string
}

export interface Transaction {
  id: number
  amount: number
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