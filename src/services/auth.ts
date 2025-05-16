import supabase from "@/lib/supabase"
import router from "@/router";

export async function signOut() {
  const result = await supabase.auth.signOut();
  if(!result.error) router.push({path: '/login', replace: true})
  return result
}