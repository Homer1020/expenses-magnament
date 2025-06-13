import supabase from "@/lib/supabase";
import type { Account } from "@/types";

export const getAll = async (): Promise<Account[]> => {
  try {
    const categories = await supabase.from('categories').select('*');
    if(!categories.data) return []
    return categories.data.map(row => ({
      name: row.name,
      id: row.id
    }));
  } catch(err) {
    console.error(err)
    return []
  }
}