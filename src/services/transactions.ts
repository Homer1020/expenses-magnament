import supabase from "@/lib/supabase";
import type { Transaction } from "@/types";

const transactionSelect = `
  *,
  categories(
    name,
    type
  )
`;

export interface TransactionFilters {
  startISO: string
  endISO: string
}

export interface TransactionInput {
  amount: number
  description?: string
  category_id: number
  user_id: string
  date?: string
}

export const getAll = async (filters: TransactionFilters): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select(transactionSelect)
    .gte('date', filters.startISO)
    .lt('date', filters.endISO)
    .order('id', { ascending: false });

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
  input: Pick<TransactionInput, 'amount' | 'description' | 'category_id'>
): Promise<Transaction> => {
  const { data, error } = await supabase
    .from('transactions')
    .update({
      amount: input.amount,
      description: input.description ?? '',
      category_id: input.category_id,
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
