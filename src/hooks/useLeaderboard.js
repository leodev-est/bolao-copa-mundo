import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

async function fetchUnifiedLeaderboard() {
  const { data, error } = await supabase
    .from('unified_leaderboard')
    .select('*')
    .order('position', { ascending: true })
  if (error) throw error
  return data ?? []
}

export function useUnifiedLeaderboard() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['unified-leaderboard'],
    queryFn:  fetchUnifiedLeaderboard,
    staleTime: 30_000,
  })

  useEffect(() => {
    const channel = supabase
      .channel('unified-leaderboard-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bets' }, () => {
        queryClient.invalidateQueries({ queryKey: ['unified-leaderboard'] })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cartola_teams' }, () => {
        queryClient.invalidateQueries({ queryKey: ['unified-leaderboard'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  return { ...query, leaderboard: query.data ?? [] }
}

async function fetchLeaderboard() {
  const { data, error } = await supabase
    .from('leaderboard_with_change')
    .select('*')
    .order('position', { ascending: true })

  if (error) {
    // Fallback para a view simples se leaderboard_with_change não existir ainda
    const { data: fallback, error: e2 } = await supabase
      .from('leaderboard')
      .select('*')
      .order('position', { ascending: true })

    if (e2) throw e2
    return fallback.map(r => ({ ...r, position_change: 0, prev_position: r.position }))
  }

  return data
}

export function useLeaderboard() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['leaderboard'],
    queryFn:  fetchLeaderboard,
    staleTime: 1000 * 30,
  })

  // Realtime: atualiza ranking quando qualquer palpite é resolvido
  useEffect(() => {
    const channel = supabase
      .channel('leaderboard-realtime')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'bets',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  return {
    ...query,
    leaderboard: query.data ?? [],
  }
}
