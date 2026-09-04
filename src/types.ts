// types/transaction.ts
export interface TransactionCategory {
  id: number,
  name: string,
  type: number
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