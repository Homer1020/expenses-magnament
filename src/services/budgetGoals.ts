import supabase from "@/lib/supabase";
import type { BudgetGoal } from "@/types";

const budgetGoalSelect = `
  *,
  categories(
    name,
    type
  )
`;

export const getAll = async (): Promise<BudgetGoal[]> => {
  try {
    const { data, error } = await supabase
      .from('budget_goals')
      .select(budgetGoalSelect)
      .order('id', { ascending: false });

    if (error) throw error;
    if (!data) return [];
    return data;
  } catch (err) {
    console.error('Error fetching budget goals:', err);
    return [];
  }
};

export const create = async (
  goal: Pick<BudgetGoal, 'category_id' | 'amount'>
): Promise<BudgetGoal> => {
  const { data, error } = await supabase
    .from('budget_goals')
    .insert(goal)
    .select(budgetGoalSelect)
    .single();

  if (error) throw error;
  return data;
};

export const update = async (
  id: number,
  goal: Pick<BudgetGoal, 'category_id' | 'amount'>
): Promise<BudgetGoal> => {
  const { data, error } = await supabase
    .from('budget_goals')
    .update(goal)
    .eq('id', id)
    .select(budgetGoalSelect)
    .single();

  if (error) throw error;
  return data;
};

export const remove = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('budget_goals')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
