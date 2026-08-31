import supabase from "@/lib/supabase";
import type { Transaction } from "@/types";

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

export interface TransactionInput {
  amount: number
  description?: string
  category_id: number
  account_id?: number | null
  user_id: string
  date?: string
}

export const getAll = async (filters?: TransactionFilters): Promise<Transaction[]> => {
  let query = supabase
    .from('transactions')
    .select(transactionSelect)
    .order('date', { ascending: false });

  if (filters?.startISO) {
    query = query.gte('date', filters.startISO);
  }
  if (filters?.endISO) {
    query = query.lt('date', filters.endISO);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
};

export const create = async (input: TransactionInput): Promise<Transaction> => {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      amount: input.amount,
      description: input.description ?? '',
      category_id: input.category_id,
      account_id: input.account_id ?? null,
      user_id: input.user_id,
      date: input.date ?? new Date().toISOString(),
    })
    .select(transactionSelect)
    .single();

  if (error) throw error;
  return data;
};

export const update = async (
  id: number,
  input: Pick<TransactionInput, 'amount' | 'description' | 'category_id' | 'account_id'>
): Promise<Transaction> => {
  const { data, error } = await supabase
    .from('transactions')
    .update({
      amount: input.amount,
      description: input.description ?? '',
      category_id: input.category_id,
      account_id: input.account_id ?? null,
    })
    .eq('id', id)
    .select(transactionSelect)
    .single();

  if (error) throw error;
  return data;
};

export const remove = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
