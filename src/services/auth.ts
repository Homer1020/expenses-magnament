import supabase from '@/lib/supabase'
import router from '@/router'
import type { User } from '@supabase/supabase-js'

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    console.error('Error fetching user:', error)
    return null
  }
  return user
}

export async function updateProfile(metadata: {
  display_name?: string
  full_name?: string
  phone?: string
  bio?: string
  currency?: string
  avatar_url?: string
  exchange_rate_source?: 'bcv' | 'manual'
  manual_exchange_rate?: number
  show_bs_equivalent?: boolean
}) {
  const { data, error } = await supabase.auth.updateUser({
    data: metadata,
  })

  if (error) throw error
  return data
}

export async function updatePassword(password: string) {
  const { data, error } = await supabase.auth.updateUser({
    password,
  })

  if (error) throw error
  return data
}

export async function signOut() {
  const result = await supabase.auth.signOut()
  if (!result.error) router.push({ path: '/login', replace: true })
  return result
}