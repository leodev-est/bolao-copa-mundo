import { supabase } from './supabase'
import { PRICE_CONFIG, calculateRawScore, normalizeScoresToPrices, parseApiStats } from './cartola_pricing'

export const BASE_PRICES = PRICE_CONFIG.BASE

/**
 * Marca todos os jogadores de um time eliminado como indisponíveis.
 * Chamado após confirmar eliminação via API ou manualmente.
 *
 * @param {number} teamId - team_id (API id) da seleção eliminada
 */
export async function markTeamEliminated(teamId) {
  const { error } = await supabase
    .from('cartola_players')
    .update({ available: false, updated_at: new Date().toISOString() })
    .eq('team_id', teamId)
    .eq('available', true)

  if (error) throw error
}

/**
 * Reativa jogadores de uma seleção (caso de correção/erro).
 *
 * @param {number} teamId - team_id da seleção
 */
export async function restoreTeamAvailability(teamId) {
  const { error } = await supabase
    .from('cartola_players')
    .update({ available: true, updated_at: new Date().toISOString() })
    .eq('team_id', teamId)

  if (error) throw error
}

/**
 * Atualiza os preços dos jogadores ao fechar cada rodada.
 * Usa normalização relativa: score baseado nos pontos do Cartola acumulados,
 * normalizado dentro do pool de jogadores de cada posição.
 */
export async function updatePlayerPrices() {
  const { data: scores, error } = await supabase
    .from('cartola_player_scores')
    .select(`
      player_id,
      goals, assists, clean_sheet, yellow_card, red_card, penalty_saved, own_goal,
      total_points,
      cartola_rounds!inner ( status )
    `)
    .eq('cartola_rounds.status', 'finished')

  if (error) throw error

  // Acumula stats do Cartola por jogador (como proxy de stats da temporada)
  const accumulated = {}
  for (const s of scores ?? []) {
    if (!accumulated[s.player_id]) {
      accumulated[s.player_id] = { goals: 0, assists: 0, cleanSheets: 0, appearances: 0, minutesPlayed: 0, total_points: 0 }
    }
    const a = accumulated[s.player_id]
    a.goals       += s.goals        ?? 0
    a.assists     += s.assists      ?? 0
    a.cleanSheets += s.clean_sheet  ? 1 : 0
    a.appearances += 1
    a.minutesPlayed += 90
    a.total_points  += s.total_points ?? 0
  }

  const playerIds = Object.keys(accumulated)
  if (playerIds.length === 0) return

  const { data: players } = await supabase
    .from('cartola_players')
    .select('id, position')
    .in('id', playerIds)

  // Usa o módulo de precificação para normalização relativa
  const input = (players ?? []).map(p => ({
    id:       p.id,
    position: p.position,
    apiStats: accumulated[p.id] ?? {},
  }))

  const withScores = input.map(p => ({
    ...p,
    rawScore: calculateRawScore(p.position, parseApiStats(p.apiStats)),
  }))

  const priced = normalizeScoresToPrices(withScores)

  const updates = priced.map(p => ({
    id:         p.id,
    price:      p.price,
    avg_points: parseFloat((accumulated[p.id]?.total_points / Math.max(accumulated[p.id]?.appearances ?? 1, 1)).toFixed(1)),
    updated_at: new Date().toISOString(),
  }))

  if (updates.length > 0) {
    const { error: upsertErr } = await supabase
      .from('cartola_players')
      .upsert(updates, { onConflict: 'id' })
    if (upsertErr) throw upsertErr
  }
}

/**
 * Fecha uma rodada: muda status para 'finished' e atualiza preços.
 *
 * @param {string} roundId - UUID da rodada
 */
export async function closeRound(roundId) {
  const { error } = await supabase
    .from('cartola_rounds')
    .update({ status: 'finished' })
    .eq('id', roundId)

  if (error) throw error
  await updatePlayerPrices()
}

/**
 * Detecta seleções eliminadas comparando as equipes da fase anterior
 * com as que avançaram para a próxima fase.
 * Retorna lista de team_ids eliminados.
 *
 * @param {number[]} advancingTeamIds - IDs (API) das seleções que avançaram
 * @param {number[]} allTeamIds       - IDs de todas as seleções da fase
 */
export function detectEliminatedTeams(advancingTeamIds, allTeamIds) {
  const advancing = new Set(advancingTeamIds)
  return allTeamIds.filter(id => !advancing.has(id))
}
