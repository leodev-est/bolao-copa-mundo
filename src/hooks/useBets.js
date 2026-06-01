import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { calcExactScoreOdd, deriveResult } from '../lib/odds'

// ─── Queries ──────────────────────────────────────────────────────────────────

async function fetchUserBets(userId) {
  const { data, error } = await supabase
    .from('bets')
    .select(`
      *,
      bet_options ( type, description, odd, result ),
      matches ( home_team, away_team, match_date, status, score_home, score_away ),
      bet_scorers ( slot_index, team, player_id, player_name, is_correct )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

async function fetchMainBet(userId, matchId) {
  const { data, error } = await supabase
    .from('bets')
    .select(`*, bet_scorers ( slot_index, team, player_id, player_name, is_correct )`)
    .eq('user_id', userId)
    .eq('match_id', matchId)
    .is('bet_option_id', null)
    .maybeSingle()

  if (error) throw error
  return data
}

async function fetchMatchExtraBets(userId, matchId) {
  const { data, error } = await supabase
    .from('bets')
    .select('*, bet_options ( type, description, odd, result )')
    .eq('user_id', userId)
    .eq('match_id', matchId)
    .not('bet_option_id', 'is', null)

  if (error) throw error
  const betMap = {}
  data.forEach(b => { betMap[b.bet_option_id] = b })
  return { bets: data, betMap }
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useUserBets() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['user-bets', user?.id],
    queryFn:  () => fetchUserBets(user.id),
    enabled:  !!user?.id,
  })

  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel(`user-bets-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bets', filter: `user_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['user-bets', user.id] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id, queryClient])

  return query
}

/** Palpite principal (placar) de uma partida */
export function useMainBet(matchId) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['main-bet', user?.id, matchId],
    queryFn:  () => fetchMainBet(user.id, matchId),
    enabled:  !!user?.id && !!matchId,
  })
}

/** Apostas extras (total_goals, etc.) de uma partida */
export function useMatchBets(matchId) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['match-bets', user?.id, matchId],
    queryFn:  () => fetchMatchExtraBets(user.id, matchId),
    enabled:  !!user?.id && !!matchId,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Salva (cria ou atualiza) o palpite principal de uma partida.
 * scorers: [{ team: 'home'|'away', slot_index, player_id?, player_name }]
 */
export function usePlaceMainBet() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ matchId, scoreHome, scoreAway, scorers = [] }) => {
      const predictedResult = deriveResult(scoreHome, scoreAway)
      const odd = calcExactScoreOdd(scoreHome, scoreAway)

      // Verifica se já existe palpite principal
      const { data: existing } = await supabase
        .from('bets')
        .select('id')
        .eq('user_id', user.id)
        .eq('match_id', matchId)
        .is('bet_option_id', null)
        .maybeSingle()

      let betId

      if (existing) {
        await supabase
          .from('bets')
          .update({ score_home: scoreHome, score_away: scoreAway, predicted_result: predictedResult, odd, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
        betId = existing.id
        // Limpa scorers antigos
        await supabase.from('bet_scorers').delete().eq('bet_id', betId)
      } else {
        const { data: newBet, error } = await supabase
          .from('bets')
          .insert({
            user_id:          user.id,
            match_id:         matchId,
            bet_option_id:    null,
            score_home:       scoreHome,
            score_away:       scoreAway,
            predicted_result: predictedResult,
            odd,
            points_wagered:   1,
            status:           'pending',
          })
          .select('id')
          .single()
        if (error) throw error
        betId = newBet.id
      }

      // Insere scorers
      if (scorers.length > 0) {
        const { error } = await supabase.from('bet_scorers').insert(
          scorers.map(s => ({
            bet_id:      betId,
            slot_index:  s.slot_index,
            team:        s.team,
            player_id:   s.player_id ?? null,
            player_name: s.player_name,
          }))
        )
        if (error) throw error
      }

      return betId
    },
    onSuccess: (_, { matchId }) => {
      queryClient.invalidateQueries({ queryKey: ['main-bet', user.id, matchId] })
      queryClient.invalidateQueries({ queryKey: ['user-bets', user.id] })
    },
  })
}

/** Aposta extra (total_goals, etc.) */
export function usePlaceBet() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ betOptionId, matchId }) => {
      const { data, error } = await supabase
        .from('bets')
        .insert({
          user_id:       user.id,
          bet_option_id: betOptionId,
          match_id:      matchId,
          points_wagered: 1,
          status:        'pending',
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, { matchId }) => {
      queryClient.invalidateQueries({ queryKey: ['match-bets', user.id, matchId] })
      queryClient.invalidateQueries({ queryKey: ['user-bets', user.id] })
    },
  })
}

// ─── Estatísticas ─────────────────────────────────────────────────────────────

export function useBetStats(bets) {
  if (!bets) return null
  const resolved  = bets.filter(b => b.status !== 'pending')
  const won       = bets.filter(b => b.status === 'won')
  const totalPts  = won.reduce((acc, b) => acc + (b.points_won ?? 0), 0)
  const wagered   = bets.reduce((acc, b) => acc + (b.points_wagered ?? 0), 0)
  return {
    total:       bets.length,
    resolved:    resolved.length,
    won:         won.length,
    lost:        resolved.length - won.length,
    pending:     bets.filter(b => b.status === 'pending').length,
    totalPoints: parseFloat(totalPts.toFixed(2)),
    totalWagered: wagered,
    winRate:     resolved.length ? parseFloat((won.length / resolved.length * 100).toFixed(1)) : 0,
    profit:      parseFloat((totalPts - wagered).toFixed(2)),
  }
}
