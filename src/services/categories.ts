import supabase from "@/lib/supabase";
import type { TransactionCategory } from "@/types";

export const getAll = async (): Promise<TransactionCategory[]> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('id', { ascending: false });

    if (error) throw error;
    if (!data) return [];
    return data;
  } catch (err) {
    console.error(err);
    return [];
  }
};

export const create = async (
  category: Pick<TransactionCategory, 'name' | 'type'>
): Promise<TransactionCategory> => {
  const { data, error } = await supabase
    .from('categories')
    .insert(category)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const update = async (
  id: number,
  category: Pick<TransactionCategory, 'name' | 'type'>
): Promise<TransactionCategory> => {
  const { data, error } = await supabase
    .from('categories')
    .update(category)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const remove = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
