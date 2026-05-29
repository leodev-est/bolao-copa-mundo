// Edge Function: generate-bet-options
// Gera as opções de palpite para uma partida com base na escalação
// Chamar antes do jogo começar (manualmente ou via webhook)
// Deploy: supabase functions deploy generate-bet-options
// POST body: { match_id: "uuid-da-partida" }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { match_id } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const apiKey = Deno.env.get('API_FOOTBALL_KEY')!

  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', match_id)
    .single()

  if (!match) {
    return new Response(JSON.stringify({ error: 'Match not found' }), { status: 404 })
  }

  // Buscar escalação
  const lineupsRes = await fetch(
    `https://v3.football.api-sports.io/fixtures/lineups?fixture=${match.api_match_id}`,
    {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'v3.football.api-sports.io',
      },
    }
  )
  const lineupsData = await lineupsRes.json()
  const lineups = lineupsData.response ?? []

  const options = []

  // 1. Vencedor da partida
  options.push(
    { match_id, type: 'winner', description: `${match.home_team} vence`,        odd: 1.80, metadata: { predicted_winner: 'home' } },
    { match_id, type: 'winner', description: 'Empate',                           odd: 3.20, metadata: { predicted_winner: 'draw' } },
    { match_id, type: 'winner', description: `${match.away_team} vence`,         odd: 2.10, metadata: { predicted_winner: 'away' } },
  )

  // 2. Placares exatos comuns
  const commonScores = [
    ['1-0', 6.50], ['0-1', 7.00], ['1-1', 5.50], ['2-1', 8.00], ['1-2', 8.50],
    ['2-0', 8.00], ['0-2', 9.00], ['0-0', 9.50], ['2-2', 11.0], ['3-1', 12.0],
    ['3-0', 12.0], ['0-3', 14.0],
  ]
  for (const [score, odd] of commonScores) {
    const [h, a] = (score as string).split('-')
    options.push({
      match_id,
      type: 'exact_score',
      description: `${match.home_team} ${h} x ${a} ${match.away_team}`,
      odd,
      metadata: { score },
    })
  }

  // 3. Totais de cartões
  options.push(
    { match_id, type: 'total_yellows', description: 'Mais de 3 cartões amarelos', odd: 1.85, metadata: { threshold: 4, direction: 'over' } },
    { match_id, type: 'total_yellows', description: 'Menos de 3 cartões amarelos', odd: 2.10, metadata: { threshold: 3, direction: 'under' } },
    { match_id, type: 'total_goals',  description: 'Mais de 2.5 gols',              odd: 1.90, metadata: { threshold: 3, direction: 'over' } },
    { match_id, type: 'total_goals',  description: 'Menos de 2.5 gols',             odd: 2.00, metadata: { threshold: 3, direction: 'under' } },
  )

  // 4. Artilheiros e cartões por jogador (da escalação)
  for (const teamLineup of lineups) {
    const teamName = teamLineup.team.name
    const players = [
      ...(teamLineup.startXI ?? []).map((p: { player: unknown }) => p.player),
      ...(teamLineup.substitutes ?? []).map((p: { player: unknown }) => p.player),
    ]

    for (const player of players.slice(0, 5)) {  // top 5 por time
      const p = player as { id: number; name: string; pos?: string }
      if (!p.id || !p.name) continue

      // Goleador (atacantes e meias têm odd menor)
      const isForward = ['F', 'M'].includes(p.pos ?? '')
      const goalOdd = isForward ? parseFloat((Math.random() * 1.5 + 2.5).toFixed(2)) : parseFloat((Math.random() * 2 + 4).toFixed(2))
      options.push({
        match_id,
        type: 'goalscorer',
        description: `${p.name} marca gol`,
        odd: Math.min(goalOdd, 8.0),
        metadata: { player_id: p.id, player_name: p.name, team: teamName },
      })

      // Cartão amarelo (defensores e volantes têm odd menor)
      const isDefMid = ['D', 'M'].includes(p.pos ?? '')
      const cardOdd = isDefMid ? parseFloat((Math.random() * 2 + 3.5).toFixed(2)) : parseFloat((Math.random() * 2 + 5).toFixed(2))
      options.push({
        match_id,
        type: 'yellow_card',
        description: `${p.name} leva cartão amarelo`,
        odd: Math.min(cardOdd, 9.0),
        metadata: { player_id: p.id, player_name: p.name, team: teamName },
      })
    }
  }

  // Inserir no banco (ignorar duplicatas)
  const { error } = await supabase
    .from('bet_options')
    .upsert(options, { ignoreDuplicates: true })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ created: options.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
