import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

async function fetchUserBets(userId) {
  const { data, error } = await supabase
    .from('bets')
    .select(`
      *,
      bet_options ( type, description, odd, result ),
      matches ( home_team, away_team, match_date, status, score_home, score_away )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

async function fetchMatchBets(userId, matchId) {
  const { data, error } = await supabase
    .from('bets')
    .select('*, bet_options ( type, description, odd, result )')
    .eq('user_id', userId)
    .eq('match_id', matchId)

  if (error) throw error
  return data
}

async function placeBet({ userId, betOptionId, matchId, pointsWagered = 1 }) {
  const { data, error } = await supabase
    .from('bets')
    .insert({
      user_id:        userId,
      bet_option_id:  betOptionId,
      match_id:       matchId,
      points_wagered: pointsWagered,
      status:         'pending',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export function useUserBets() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['user-bets', user?.id],
    queryFn:  () => fetchUserBets(user.id),
    enabled:  !!user?.id,
  })

  // Realtime: atualiza quando palpite é resolvido
  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel(`user-bets-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'bets',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['user-bets', user.id] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id, queryClient])

  return query
}

export function useMatchBets(matchId) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: ['match-bets', user?.id, matchId],
    queryFn:  () => fetchMatchBets(user.id, matchId),
    enabled:  !!user?.id && !!matchId,
    select: (data) => {
      const betMap = {}
      data.forEach(b => { betMap[b.bet_option_id] = b })
      return { bets: data, betMap }
    },
  })
}

export function usePlaceBet() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ betOptionId, matchId, pointsWagered }) =>
      placeBet({ userId: user.id, betOptionId, matchId, pointsWagered }),
    onSuccess: (_, { matchId }) => {
      queryClient.invalidateQueries({ queryKey: ['match-bets', user.id, matchId] })
      queryClient.invalidateQueries({ queryKey: ['user-bets', user.id] })
    },
  })
}

// Estatísticas resumidas dos palpites do usuário
export function useBetStats(bets) {
  if (!bets) return null

  const resolved = bets.filter(b => b.status !== 'pending')
  const won      = bets.filter(b => b.status === 'won')
  const pending  = bets.filter(b => b.status === 'pending')

  const totalPoints = won.reduce((acc, b) => acc + (b.points_won ?? 0), 0)
  const totalWagered = bets.reduce((acc, b) => acc + (b.points_wagered ?? 0), 0)
  const winRate = resolved.length > 0 ? (won.length / resolved.length) * 100 : 0

  return {
    total:       bets.length,
    resolved:    resolved.length,
    won:         won.length,
    lost:        resolved.length - won.length,
    pending:     pending.length,
    totalPoints: parseFloat(totalPoints.toFixed(2)),
    totalWagered,
    winRate:     parseFloat(winRate.toFixed(1)),
    profit:      parseFloat((totalPoints - totalWagered).toFixed(2)),
  }
}
