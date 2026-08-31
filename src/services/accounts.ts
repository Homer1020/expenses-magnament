import supabase from "@/lib/supabase";
import type { Account } from "@/types";

export const getAll = async (): Promise<Account[]> => {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('id', { ascending: false });

    if (error) throw error;
    if (!data) return [];
    return data;
  } catch (err) {
    console.error('Error fetching accounts:', err);
    return [];
  }
};

export const create = async (
  account: Pick<Account, 'name' | 'percentage'>
): Promise<Account> => {
  const { data, error } = await supabase
    .from('accounts')
    .insert(account)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const update = async (
  id: number,
  account: Pick<Account, 'name' | 'percentage'>
): Promise<Account> => {
  const { data, error } = await supabase
    .from('accounts')
    .update(account)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const remove = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
