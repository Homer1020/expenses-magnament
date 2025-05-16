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
  categories: TransactionCategory
  // Agrega otros campos según tu base de datos
}

// Tipos para los errores de Supabase
export type SupabaseError = {
  message: string
  details?: string
  hint?: string
  code?: string
}