import supabase from "@/lib/supabase";
import type { Transaction, TransactionCurrency } from "@/types";

const transactionSelect = `
  *,
  categories(
    name,
    type
  ),
  accounts(
    id,
    name,
    percentage
  )
`;

export interface TransactionFilters {
  startISO?: string
  endISO?: string
}

function getTodayDateString(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export interface TransactionInput {
  amount: number
  bs_amount: number | null
  exchange_rate: number | null
  input_currency: TransactionCurrency
  description?: string
  category_id: number
  account_id?: number | null
  user_id: string
  /** Fecha real de la transacción (YYYY-MM-DD). Si no se pasa, usa hoy. */
  date?: string
}

export const getAll = async (filters?: TransactionFilters): Promise<Transaction[]> => {
  let query = supabase
    .from('transactions')
    .select(transactionSelect)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters?.startISO) {
    const startDate = filters.startISO.includes('T') ? filters.startISO.split('T')[0] : filters.startISO;
    query = query.gte('date', startDate);
  }
  if (filters?.endISO) {
    const endDate = filters.endISO.includes('T') ? filters.endISO.split('T')[0] : filters.endISO;
    query = query.lt('date', endDate);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
};

export const create = async (input: TransactionInput): Promise<Transaction> => {
  const txDate = input.date ? (input.date.includes('T') ? input.date.split('T')[0] : input.date) : getTodayDateString();

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      amount: input.amount,
      bs_amount: input.bs_amount,
      exchange_rate: input.exchange_rate,
      input_currency: input.input_currency,
      description: input.description ?? '',
      category_id: input.category_id,
      account_id: input.account_id ?? null,
      user_id: input.user_id,
      date: txDate,
    })
    .select(transactionSelect)
    .single();

  if (error) throw error;
  return data;
};

export const update = async (
  id: number,
  input: Pick<TransactionInput, 'amount' | 'bs_amount' | 'exchange_rate' | 'input_currency' | 'description' | 'category_id' | 'account_id' | 'date'>
): Promise<Transaction> => {
  const txDate = input.date ? (input.date.includes('T') ? input.date.split('T')[0] : input.date) : undefined;

  const { data, error } = await supabase
    .from('transactions')
    .update({
      amount: input.amount,
      bs_amount: input.bs_amount,
      exchange_rate: input.exchange_rate,
      input_currency: input.input_currency,
      description: input.description ?? '',
      category_id: input.category_id,
      account_id: input.account_id ?? null,
      ...(txDate ? { date: txDate } : {}),
    })
    .eq('id', id)
    .select(transactionSelect)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('No se pudo actualizar la transacción (no existe o no tienes permiso)');
  return data;
};

export const remove = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
