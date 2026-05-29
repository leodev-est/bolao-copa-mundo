import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { LIVE_STATUSES, FINISHED_STATUSES } from '../lib/api-football'

async function fetchMatches() {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('match_date', { ascending: true })

  if (error) throw error
  return data
}

async function fetchMatch(matchId) {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single()

  if (error) throw error
  return data
}

async function fetchBetOptions(matchId) {
  const { data, error } = await supabase
    .from('bet_options')
    .select('*')
    .eq('match_id', matchId)
    .order('type')
    .order('odd', { ascending: true })

  if (error) throw error
  return data
}

export function useMatches() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['matches'],
    queryFn: fetchMatches,
    staleTime: 1000 * 30,   // 30 segundos
  })

  // Realtime: atualiza quando status/placar muda
  useEffect(() => {
    const channel = supabase
      .channel('matches-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        queryClient.invalidateQueries({ queryKey: ['matches'] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  const matches = query.data ?? []

  return {
    ...query,
    matches,
    liveMatches:     matches.filter(m => LIVE_STATUSES.includes(m.status)),
    upcomingMatches: matches.filter(m => m.status === 'NS'),
    finishedMatches: matches.filter(m => FINISHED_STATUSES.includes(m.status)),
  }
}

export function useMatch(matchId) {
  const queryClient = useQueryClient()

  const matchQuery = useQuery({
    queryKey: ['match', matchId],
    queryFn:  () => fetchMatch(matchId),
    enabled:  !!matchId,
  })

  const optionsQuery = useQuery({
    queryKey: ['bet-options', matchId],
    queryFn:  () => fetchBetOptions(matchId),
    enabled:  !!matchId,
    staleTime: 1000 * 60,
  })

  // Realtime: atualiza opções quando resultado é definido
  useEffect(() => {
    if (!matchId) return
    const channel = supabase
      .channel(`bet-options-${matchId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'bet_options',
        filter: `match_id=eq.${matchId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['bet-options', matchId] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [matchId, queryClient])

  return {
    match: matchQuery.data,
    betOptions: optionsQuery.data ?? [],
    isLoading: matchQuery.isLoading || optionsQuery.isLoading,
    error: matchQuery.error || optionsQuery.error,
  }
}
