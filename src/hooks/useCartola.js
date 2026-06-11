import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// ── Formações suportadas ────────────────────────────────────
export const FORMATIONS = {
  '4-3-3':   { GK: 1, DEF: 4, MID: 3, FWD: 3 },
  '4-4-2':   { GK: 1, DEF: 4, MID: 4, FWD: 2 },
  '3-5-2':   { GK: 1, DEF: 3, MID: 5, FWD: 2 },
  '4-2-3-1': { GK: 1, DEF: 4, MID: 5, FWD: 1 },
}

/**
 * Retorna lista de slots { position, slotIndex } para uma formação.
 * Slot 0 sempre = GK, depois DEF, MID, FWD sequencialmente.
 */
export function buildSlots(formation) {
  const counts = FORMATIONS[formation] ?? FORMATIONS['4-3-3']
  const slots = []
  let idx = 0
  for (const pos of ['GK', 'DEF', 'MID', 'FWD']) {
    for (let i = 0; i < (counts[pos] ?? 0); i++) {
      slots.push({ position: pos, slotIndex: idx++ })
    }
  }
  return slots
}

/**
 * Retorna linhas do campo para exibição (FWD no topo, GK na base).
 */
export function buildFieldRows(formation) {
  const slots = buildSlots(formation)
  const rows = []
  for (const pos of ['FWD', 'MID', 'DEF', 'GK']) {
    const row = slots.filter(s => s.position === pos)
    if (row.length > 0) rows.push(row)
  }
  return rows
}

export const BUDGET = 100

// Configuração do sistema de orçamento dinâmico entre rodadas
const BUDGET_FACTOR = 0.5   // 1 pt = C$0,50 de ajuste
const BUDGET_MIN    = 80    // orçamento mínimo (pior caso)
const BUDGET_MAX    = 120   // orçamento máximo (melhor caso)

// ── Rodada atual ────────────────────────────────────────────
async function fetchCurrentRound() {
  // Pega a rodada ativa mais antiga (start_date ASC = a que está acontecendo agora,
  // não a Final que também pode estar 'open' no futuro)
  const { data, error } = await supabase
    .from('cartola_rounds')
    .select('*')
    .in('status', ['open', 'closed'])
    .order('start_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

async function fetchAllRounds() {
  const { data, error } = await supabase
    .from('cartola_rounds')
    .select('*')
    .order('start_date', { ascending: true })
  if (error) throw error
  return data ?? []
}

export function useCartolaRound() {
  return useQuery({
    queryKey: ['cartola-current-round'],
    queryFn:  fetchCurrentRound,
    staleTime: 60_000,
  })
}

// ── Próximo jogo de cada seleção (independente de rodada do Cartola) ──────────
async function fetchNextFixtures() {
  // Busca todos os jogos ainda não iniciados, ordenados por data
  const { data } = await supabase
    .from('matches')
    .select('home_team, away_team, match_date')
    .eq('status', 'NS')
    .order('match_date', { ascending: true })

  // Mapa: team_name → { opponent, matchDate }
  // Primeiro jogo encontrado por time = próximo jogo
  const map = {}
  for (const m of data ?? []) {
    if (m.home_team && !map[m.home_team]) {
      map[m.home_team] = { opponent: m.away_team, matchDate: m.match_date }
    }
    if (m.away_team && !map[m.away_team]) {
      map[m.away_team] = { opponent: m.home_team, matchDate: m.match_date }
    }
  }
  return map
}

export function useRoundFixtures() {
  return useQuery({
    queryKey: ['next-fixtures'],
    queryFn:  fetchNextFixtures,
    staleTime: 300_000,
  })
}

export function useCartolaRounds() {
  return useQuery({
    queryKey: ['cartola-rounds'],
    queryFn:  fetchAllRounds,
    staleTime: 60_000,
  })
}

// ── Jogadores ───────────────────────────────────────────────
async function fetchCartolaPlayers({ position, search, sortBy } = {}) {
  let q = supabase
    .from('cartola_players')
    .select('*')
    .eq('available', true)
    .order(sortBy === 'price' ? 'price' : 'avg_points', { ascending: false })

  if (position) q = q.eq('position', position)
  if (search)   q = q.ilike('name', `%${search}%`)

  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export function useCartolaPlayers({ position, search, sortBy = 'avg_points' } = {}) {
  return useQuery({
    queryKey: ['cartola-players', position, search, sortBy],
    queryFn:  () => fetchCartolaPlayers({ position, search, sortBy }),
    staleTime: 30_000,
  })
}

// ── Time do usuário na rodada ───────────────────────────────
async function fetchMyTeam(userId, roundId) {
  if (!userId || !roundId) return null

  const { data, error } = await supabase
    .from('cartola_teams')
    .select(`
      *,
      cartola_team_players (
        id,
        player_id,
        position_slot,
        is_captain,
        cartola_players (
          id, api_player_id, name, position, team_id, team_name,
          price, avg_points, available
        )
      )
    `)
    .eq('user_id', userId)
    .eq('round_id', roundId)
    .maybeSingle()

  if (error) throw error
  return data
}

export function useMyCartolaTeam(roundId) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['my-cartola-team', user?.id, roundId],
    queryFn:  () => fetchMyTeam(user.id, roundId),
    enabled:  !!user?.id && !!roundId,
  })

  useEffect(() => {
    if (!user?.id || !roundId) return
    const channel = supabase
      .channel(`cartola-team-${user.id}-${roundId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'cartola_teams',
        filter: `user_id=eq.${user.id}`,
      }, () => queryClient.invalidateQueries({ queryKey: ['my-cartola-team', user.id, roundId] }))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id, roundId, queryClient])

  return query
}

// ── Pontuações de jogadores na rodada ───────────────────────
async function fetchRoundPlayerScores(roundId) {
  if (!roundId) return []
  const { data, error } = await supabase
    .from('cartola_player_scores')
    .select('player_id, goals, assists, clean_sheet, yellow_card, red_card, penalty_saved, own_goal, total_points')
    .eq('round_id', roundId)
  if (error) throw error
  // Agrupa por jogador (pode ter múltiplos jogos na rodada)
  const map = {}
  for (const s of data ?? []) {
    if (!map[s.player_id]) {
      map[s.player_id] = { ...s }
    } else {
      map[s.player_id].goals         += s.goals
      map[s.player_id].assists       += s.assists
      map[s.player_id].total_points  += s.total_points
    }
  }
  return map
}

export function useRoundPlayerScores(roundId) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['cartola-player-scores', roundId],
    queryFn:  () => fetchRoundPlayerScores(roundId),
    enabled:  !!roundId,
    staleTime: 30_000,
  })

  // Realtime: atualiza pontuações durante a rodada ao vivo
  useEffect(() => {
    if (!roundId) return
    const channel = supabase
      .channel(`cartola-scores-${roundId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'cartola_player_scores',
        filter: `round_id=eq.${roundId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['cartola-player-scores', roundId] })
        queryClient.invalidateQueries({ queryKey: ['cartola-leaderboard'] })
        queryClient.invalidateQueries({ queryKey: ['cartola-round-leaderboard', roundId] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [roundId, queryClient])

  return query
}

// ── Leaderboard ─────────────────────────────────────────────
async function fetchCartolaLeaderboard() {
  const { data, error } = await supabase
    .from('cartola_leaderboard')
    .select('*')
    .order('position', { ascending: true })
  if (error) throw error
  return data ?? []
}

async function fetchRoundLeaderboard(roundId) {
  const { data, error } = await supabase
    .from('cartola_teams')
    .select(`
      user_id,
      round_id,
      formation,
      total_points,
      profiles ( username, avatar_url )
    `)
    .eq('round_id', roundId)
    .order('total_points', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row, i) => ({
    ...row,
    username:   row.profiles?.username,
    avatar_url: row.profiles?.avatar_url,
    position:   i + 1,
  }))
}

export function useCartolaLeaderboard() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['cartola-leaderboard'],
    queryFn:  fetchCartolaLeaderboard,
    staleTime: 30_000,
  })

  useEffect(() => {
    const channel = supabase
      .channel('cartola-leaderboard-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cartola_teams' }, () => {
        queryClient.invalidateQueries({ queryKey: ['cartola-leaderboard'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  return query
}

export function useRoundLeaderboard(roundId) {
  return useQuery({
    queryKey: ['cartola-round-leaderboard', roundId],
    queryFn:  () => fetchRoundLeaderboard(roundId),
    enabled:  !!roundId,
    staleTime: 30_000,
  })
}

export function useRoundTeam(userId, roundId) {
  return useQuery({
    queryKey: ['cartola-round-team', userId, roundId],
    queryFn:  () => fetchMyTeam(userId, roundId),
    enabled:  !!userId && !!roundId,
    staleTime: 30_000,
  })
}

// ── Orçamento dinâmico baseado na rodada anterior ───────────
async function fetchUserBudget(userId, currentRound, allRounds) {
  if (!userId || !currentRound || !allRounds?.length) return { budget: BUDGET, prevPoints: null }

  const sorted = [...allRounds].sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
  const currentIdx = sorted.findIndex(r => r.id === currentRound.id)
  if (currentIdx <= 0) return { budget: BUDGET, prevPoints: null }

  const prevRound = sorted[currentIdx - 1]
  const { data: prevTeam } = await supabase
    .from('cartola_teams')
    .select('total_points')
    .eq('user_id', userId)
    .eq('round_id', prevRound.id)
    .maybeSingle()

  if (!prevTeam) return { budget: BUDGET, prevPoints: null }

  const pts       = prevTeam.total_points ?? 0
  const raw       = BUDGET + pts * BUDGET_FACTOR
  // Piso dinâmico: max(80, custo mínimo do time mais barato da rodada atual)
  const dynamicMin = Math.max(BUDGET_MIN, currentRound.min_budget ?? BUDGET_MIN)
  const budget     = Math.round(Math.min(BUDGET_MAX, Math.max(dynamicMin, raw)) * 2) / 2
  return { budget, prevPoints: pts, prevRoundName: prevRound.name }
}

export function useCartolaUserBudget(currentRound) {
  const { user }          = useAuth()
  const { data: allRounds } = useCartolaRounds()

  return useQuery({
    queryKey: ['cartola-user-budget', user?.id, currentRound?.id, allRounds?.length],
    queryFn:  () => fetchUserBudget(user?.id, currentRound, allRounds),
    enabled:  !!user?.id && !!currentRound && !!allRounds?.length,
    staleTime: 60_000,
  })
}

// ── Salvar time ─────────────────────────────────────────────
export function useSaveCartolaTeam() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ roundId, formation, players, captainSlot }) => {
      // players: { [slotIndex]: player }
      const totalSpent = Object.values(players).reduce((acc, p) => acc + (p?.price ?? 0), 0)

      // Cria ou atualiza o cartola_team
      const { data: existing, error: selectErr } = await supabase
        .from('cartola_teams')
        .select('id')
        .eq('user_id', user.id)
        .eq('round_id', roundId)
        .maybeSingle()
      if (selectErr) throw selectErr

      let teamId

      // Faz backup dos jogadores atuais ANTES de qualquer alteração.
      // Se o save falhar, restauramos o backup e o time não perde nada.
      let backup = []
      if (existing) {
        const { data: bk } = await supabase
          .from('cartola_team_players')
          .select('player_id, position_slot, is_captain')
          .eq('cartola_team_id', existing.id)
        backup = bk ?? []
      }

      if (existing) {
        const { error: updErr } = await supabase
          .from('cartola_teams')
          .update({ formation, total_spent: totalSpent, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
        if (updErr) throw updErr
        teamId = existing.id
      } else {
        const { data: newTeam, error } = await supabase
          .from('cartola_teams')
          .insert({ user_id: user.id, round_id: roundId, formation, total_spent: totalSpent })
          .select('id')
          .single()
        if (error) throw error
        teamId = newTeam.id
      }

      // Monta lista de novos jogadores
      const teamPlayers = Object.entries(players)
        .filter(([, p]) => p != null)
        .map(([slotIndex, p]) => ({
          cartola_team_id: teamId,
          player_id:       p.id,
          position_slot:   parseInt(slotIndex),
          is_captain:      parseInt(slotIndex) === captainSlot,
        }))

      if (teamPlayers.length === 0) throw new Error('Selecione os 11 jogadores antes de confirmar.')

      // Tenta upsert atômico por slot (funciona se a migration de constraints foi aplicada).
      // Se não tiver a constraint, cai no fallback com backup/restore abaixo.
      const { error: upsertErr } = await supabase
        .from('cartola_team_players')
        .upsert(teamPlayers, { onConflict: 'cartola_team_id,position_slot' })

      if (!upsertErr) {
        // Upsert funcionou: remove possíveis slots extras de formação anterior
        const usedSlots = teamPlayers.map(p => p.position_slot).join(',')
        await supabase.from('cartola_team_players')
          .delete()
          .eq('cartola_team_id', teamId)
          .not('position_slot', 'in', `(${usedSlots})`)
      } else {
        // Fallback com backup: delete → insert, restaura se insert falhar
        await supabase.from('cartola_team_players').delete().eq('cartola_team_id', teamId)
        const { error: insErr } = await supabase.from('cartola_team_players').insert(teamPlayers)
        if (insErr) {
          // Restaura o time original para não perder a escalação
          if (backup.length > 0) {
            await supabase.from('cartola_team_players')
              .insert(backup.map(p => ({ ...p, cartola_team_id: teamId })))
          }
          throw insErr
        }
      }

      return teamId
    },
    onSuccess: (_, { roundId }) => {
      queryClient.invalidateQueries({ queryKey: ['my-cartola-team', user.id, roundId] })
      queryClient.invalidateQueries({ queryKey: ['cartola-leaderboard'] })
    },
  })
}
