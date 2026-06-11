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

async function fetchMatchPlayers(homeTeam, awayTeam) {
  const { data, error } = await supabase
    .from('cartola_players')
    .select('id, api_player_id, name, position, team_name')
    .in('team_name', [homeTeam, awayTeam])
    .eq('available', true)
    .order('position')
    .order('name')
  if (error) throw error
  return data ?? []
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

  const match = matchQuery.data
  const playersQuery = useQuery({
    queryKey: ['match-players', match?.home_team, match?.away_team],
    queryFn:  () => fetchMatchPlayers(match.home_team, match.away_team),
    enabled:  !!match?.home_team && !!match?.away_team,
    staleTime: 0,
  })

  // Realtime: atualiza placar ao vivo da partida específica
  useEffect(() => {
    if (!matchId) return
    const matchChannel = supabase
      .channel(`match-row-${matchId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'matches',
        filter: `id=eq.${matchId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['match', matchId] })
      })
      .subscribe()

    return () => { supabase.removeChannel(matchChannel) }
  }, [matchId, queryClient])

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
    matchPlayers: playersQuery.data ?? [],
    isLoading: matchQuery.isLoading || optionsQuery.isLoading,
    error: matchQuery.error || optionsQuery.error,
  }
}
