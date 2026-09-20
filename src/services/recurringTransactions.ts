import supabase from "@/lib/supabase";
import type { RecurringTransaction, RecurringFrequency } from "@/types";
import * as transactionsService from "./transactions";

const recurringSelect = `
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

export interface RecurringTransactionInput {
  amount: number
  description?: string
  category_id: number
  account_id?: number | null
  frequency: RecurringFrequency
  start_date: string
  user_id: string
}

export const getAll = async (): Promise<RecurringTransaction[]> => {
  try {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .select(recurringSelect)
      .order('next_run_date', { ascending: true });

    if (error) throw error;
    if (!data) return [];
    return data;
  } catch (err) {
    console.error('Error fetching recurring transactions:', err);
    return [];
  }
};

export const create = async (input: RecurringTransactionInput): Promise<RecurringTransaction> => {
  const { data, error } = await supabase
    .from('recurring_transactions')
    .insert({
      amount: input.amount,
      description: input.description ?? '',
      category_id: input.category_id,
      account_id: input.account_id ?? null,
      frequency: input.frequency,
      start_date: input.start_date,
      next_run_date: input.start_date,
      active: true,
      user_id: input.user_id,
    })
    .select(recurringSelect)
    .single();

  if (error) throw error;
  return data;
};

export const update = async (
  id: number,
  input: Pick<RecurringTransactionInput, 'amount' | 'description' | 'category_id' | 'account_id' | 'frequency'>
): Promise<RecurringTransaction> => {
  const { data, error } = await supabase
    .from('recurring_transactions')
    .update({
      amount: input.amount,
      description: input.description ?? '',
      category_id: input.category_id,
      account_id: input.account_id ?? null,
      frequency: input.frequency,
    })
    .eq('id', id)
    .select(recurringSelect)
    .single();

  if (error) throw error;
  return data;
};

export const setActive = async (id: number, active: boolean): Promise<RecurringTransaction> => {
  const { data, error } = await supabase
    .from('recurring_transactions')
    .update({ active })
    .eq('id', id)
    .select(recurringSelect)
    .single();

  if (error) throw error;
  return data;
};

export const remove = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('recurring_transactions')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function advance(dateStr: string, frequency: RecurringFrequency): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));

  if (frequency === 'weekly') {
    date.setUTCDate(date.getUTCDate() + 7);
  } else if (frequency === 'monthly') {
    date.setUTCMonth(date.getUTCMonth() + 1);
  } else {
    date.setUTCFullYear(date.getUTCFullYear() + 1);
  }

  return toISODate(date);
}

// Máximo de ocurrencias generadas por recurrencia en una sola llamada, para no
// crear cientos de transacciones si la app estuvo cerrada mucho tiempo. Si se
// alcanza el límite, el resto se genera en la próxima visita.
const MAX_OCCURRENCES_PER_RUN = 60;

// Crea las transacciones vencidas de las recurrencias activas y avanza su
// próxima fecha de ejecución. Se ejecuta en el cliente al abrir la app.
export const generateDueTransactions = async (): Promise<number> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const todayISO = toISODate(new Date());

  const { data: due, error } = await supabase
    .from('recurring_transactions')
    .select('*')
    .eq('active', true)
    .lte('next_run_date', todayISO);

  if (error) {
    console.error('Error checking due recurring transactions:', error);
    return 0;
  }
  if (!due || due.length === 0) return 0;

  let generatedCount = 0;

  for (const item of due) {
    let cursor = item.next_run_date as string;
    let occurrences = 0;

    while (cursor <= todayISO && occurrences < MAX_OCCURRENCES_PER_RUN) {
      await transactionsService.create({
        amount: item.amount,
        description: item.description,
        category_id: item.category_id,
        account_id: item.account_id,
        user_id: user.id,
        date: new Date(`${cursor}T00:00:00.000Z`).toISOString(),
      });

      generatedCount++;
      occurrences++;
      cursor = advance(cursor, item.frequency);
    }

    await supabase
      .from('recurring_transactions')
      .update({ next_run_date: cursor, last_generated_at: new Date().toISOString() })
      .eq('id', item.id);
  }

  return generatedCount;
};
