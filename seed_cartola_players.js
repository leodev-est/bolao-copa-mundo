/**
 * Seed de jogadores da Copa 2026 para testes.
 * Usa jogadores reais com preços estimados por reputação.
 * Rode ANTES do sync_cartola_players.js (que sobrescreve com preços reais).
 *
 * Uso: node seed_cartola_players.js
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PLAYERS = [
  // ── Brazil ──────────────────────────────────────────────
  { name: 'Alisson',          position: 'GK',  team_name: 'Brazil', price: 14.0 },
  { name: 'Ederson',          position: 'GK',  team_name: 'Brazil', price: 11.0 },
  { name: 'Marquinhos',       position: 'DEF', team_name: 'Brazil', price: 12.0 },
  { name: 'Militão',          position: 'DEF', team_name: 'Brazil', price: 11.5 },
  { name: 'Danilo',           position: 'DEF', team_name: 'Brazil', price:  9.0 },
  { name: 'Alex Sandro',      position: 'DEF', team_name: 'Brazil', price:  8.0 },
  { name: 'Lucas Paquetá',    position: 'MID', team_name: 'Brazil', price: 13.0 },
  { name: 'Bruno Guimarães',  position: 'MID', team_name: 'Brazil', price: 13.5 },
  { name: 'Gerson',           position: 'MID', team_name: 'Brazil', price:  9.5 },
  { name: 'Raphinha',         position: 'FWD', team_name: 'Brazil', price: 15.0 },
  { name: 'Vinicius Jr',      position: 'FWD', team_name: 'Brazil', price: 19.0 },
  { name: 'Rodrygo',          position: 'FWD', team_name: 'Brazil', price: 14.5 },
  { name: 'Endrick',          position: 'FWD', team_name: 'Brazil', price: 12.0 },

  // ── Argentina ───────────────────────────────────────────
  { name: 'Dibu Martínez',    position: 'GK',  team_name: 'Argentina', price: 14.5 },
  { name: 'Romero',           position: 'DEF', team_name: 'Argentina', price: 11.0 },
  { name: 'Otamendi',         position: 'DEF', team_name: 'Argentina', price:  9.5 },
  { name: 'Tagliafico',       position: 'DEF', team_name: 'Argentina', price:  9.0 },
  { name: 'Molina',           position: 'DEF', team_name: 'Argentina', price: 10.5 },
  { name: 'De Paul',          position: 'MID', team_name: 'Argentina', price: 12.5 },
  { name: 'Mac Allister',     position: 'MID', team_name: 'Argentina', price: 13.0 },
  { name: 'Enzo Fernández',   position: 'MID', team_name: 'Argentina', price: 12.0 },
  { name: 'Messi',            position: 'FWD', team_name: 'Argentina', price: 20.0 },
  { name: 'Lautaro Martínez', position: 'FWD', team_name: 'Argentina', price: 16.0 },
  { name: 'Julián Álvarez',   position: 'FWD', team_name: 'Argentina', price: 14.0 },

  // ── France ──────────────────────────────────────────────
  { name: 'Maignan',          position: 'GK',  team_name: 'France', price: 13.0 },
  { name: 'Theo Hernández',   position: 'DEF', team_name: 'France', price: 12.0 },
  { name: 'Saliba',           position: 'DEF', team_name: 'France', price: 12.5 },
  { name: 'Upamecano',        position: 'DEF', team_name: 'France', price: 10.5 },
  { name: 'Camavinga',        position: 'MID', team_name: 'France', price: 12.0 },
  { name: 'Tchouaméni',       position: 'MID', team_name: 'France', price: 12.5 },
  { name: 'Griezmann',        position: 'MID', team_name: 'France', price: 14.0 },
  { name: 'Mbappé',           position: 'FWD', team_name: 'France', price: 20.0 },
  { name: 'Dembélé',          position: 'FWD', team_name: 'France', price: 14.0 },
  { name: 'Thuram',           position: 'FWD', team_name: 'France', price: 13.5 },

  // ── Spain ─────────────────────────────────────────────
  { name: 'Unai Simón',       position: 'GK',  team_name: 'Spain', price: 11.5 },
  { name: 'Carvajal',         position: 'DEF', team_name: 'Spain', price: 11.5 },
  { name: 'Le Normand',       position: 'DEF', team_name: 'Spain', price: 10.0 },
  { name: 'Laporte',          position: 'DEF', team_name: 'Spain', price:  9.5 },
  { name: 'Cucurella',        position: 'DEF', team_name: 'Spain', price:  9.0 },
  { name: 'Pedri',            position: 'MID', team_name: 'Spain', price: 14.0 },
  { name: 'Rodri',            position: 'MID', team_name: 'Spain', price: 14.5 },
  { name: 'Gavi',             position: 'MID', team_name: 'Spain', price: 13.0 },
  { name: 'Yamal',            position: 'FWD', team_name: 'Spain', price: 17.0 },
  { name: 'Morata',           position: 'FWD', team_name: 'Spain', price: 12.0 },
  { name: 'Williams',         position: 'FWD', team_name: 'Spain', price: 12.5 },

  // ── England ──────────────────────────────────────────────
  { name: 'Pickford',         position: 'GK',  team_name: 'England', price: 11.0 },
  { name: 'Alexander-Arnold', position: 'DEF', team_name: 'England', price: 12.0 },
  { name: 'Stones',           position: 'DEF', team_name: 'England', price: 10.5 },
  { name: 'Maguire',          position: 'DEF', team_name: 'England', price:  8.5 },
  { name: 'Trippier',         position: 'DEF', team_name: 'England', price: 11.0 },
  { name: 'Bellingham',       position: 'MID', team_name: 'England', price: 17.5 },
  { name: 'Rice',             position: 'MID', team_name: 'England', price: 13.5 },
  { name: 'Saka',             position: 'FWD', team_name: 'England', price: 15.5 },
  { name: 'Kane',             position: 'FWD', team_name: 'England', price: 18.0 },
  { name: 'Foden',            position: 'FWD', team_name: 'England', price: 15.0 },

  // ── Germany ────────────────────────────────────────────────
  { name: 'Neuer',            position: 'GK',  team_name: 'Germany', price: 12.0 },
  { name: 'Rüdiger',          position: 'DEF', team_name: 'Germany', price: 12.0 },
  { name: 'Schlotterbeck',    position: 'DEF', team_name: 'Germany', price: 10.0 },
  { name: 'Kimmich',          position: 'MID', team_name: 'Germany', price: 14.0 },
  { name: 'Kroos',            position: 'MID', team_name: 'Germany', price: 13.5 },
  { name: 'Wirtz',            position: 'MID', team_name: 'Germany', price: 15.5 },
  { name: 'Musiala',          position: 'MID', team_name: 'Germany', price: 15.0 },
  { name: 'Havertz',          position: 'FWD', team_name: 'Germany', price: 13.5 },

  // ── Portugal ────────────────────────────────────────────
  { name: 'Rui Patrício',     position: 'GK',  team_name: 'Portugal', price: 10.5 },
  { name: 'Cancelo',          position: 'DEF', team_name: 'Portugal', price: 12.0 },
  { name: 'Rúben Dias',       position: 'DEF', team_name: 'Portugal', price: 12.5 },
  { name: 'Bernardo Silva',   position: 'MID', team_name: 'Portugal', price: 14.5 },
  { name: 'Vitinha',          position: 'MID', team_name: 'Portugal', price: 13.0 },
  { name: 'Bruno Fernandes',  position: 'MID', team_name: 'Portugal', price: 14.0 },
  { name: 'Ronaldo',          position: 'FWD', team_name: 'Portugal', price: 16.0 },
  { name: 'Rafael Leão',      position: 'FWD', team_name: 'Portugal', price: 14.5 },

  // ── Netherlands ─────────────────────────────────────────
  { name: 'Verbruggen',       position: 'GK',  team_name: 'Netherlands', price: 11.0 },
  { name: 'Van Dijk',         position: 'DEF', team_name: 'Netherlands', price: 13.5 },
  { name: 'Dumfries',         position: 'DEF', team_name: 'Netherlands', price: 10.5 },
  { name: 'De Jong',          position: 'MID', team_name: 'Netherlands', price: 13.5 },
  { name: 'Reijnders',        position: 'MID', team_name: 'Netherlands', price: 12.5 },
  { name: 'Gakpo',            position: 'FWD', team_name: 'Netherlands', price: 14.0 },
  { name: 'Depay',            position: 'FWD', team_name: 'Netherlands', price: 12.0 },

  // ── Uruguay ─────────────────────────────────────────────
  { name: 'Rochet',           position: 'GK',  team_name: 'Uruguay', price:  9.0 },
  { name: 'Giménez',          position: 'DEF', team_name: 'Uruguay', price: 11.0 },
  { name: 'Araújo',           position: 'DEF', team_name: 'Uruguay', price: 12.0 },
  { name: 'Valverde',         position: 'MID', team_name: 'Uruguay', price: 15.0 },
  { name: 'De Arrascaeta',    position: 'MID', team_name: 'Uruguay', price: 12.5 },
  { name: 'Núñez',            position: 'FWD', team_name: 'Uruguay', price: 13.5 },
  { name: 'Suárez',           position: 'FWD', team_name: 'Uruguay', price: 11.0 },

  // ── Colombia ────────────────────────────────────────────
  { name: 'Vargas',           position: 'GK',  team_name: 'Colombia', price:  9.0 },
  { name: 'Dávinson Sánchez', position: 'DEF', team_name: 'Colombia', price: 10.0 },
  { name: 'Muñoz',            position: 'DEF', team_name: 'Colombia', price:  9.5 },
  { name: 'James Rodríguez',  position: 'MID', team_name: 'Colombia', price: 13.0 },
  { name: 'Cardona',          position: 'MID', team_name: 'Colombia', price: 10.0 },
  { name: 'Díaz',             position: 'FWD', team_name: 'Colombia', price: 14.5 },
  { name: 'Córdoba',          position: 'FWD', team_name: 'Colombia', price: 11.0 },

  // ── Morocco ────────────────────────────────────────────
  { name: 'Bono',             position: 'GK',  team_name: 'Morocco', price: 12.0 },
  { name: 'Hakimi',           position: 'DEF', team_name: 'Morocco', price: 14.0 },
  { name: 'Aguerd',           position: 'DEF', team_name: 'Morocco', price: 10.5 },
  { name: 'Ounahi',           position: 'MID', team_name: 'Morocco', price: 11.5 },
  { name: 'Ziyech',           position: 'MID', team_name: 'Morocco', price: 12.0 },
  { name: 'En-Nesyri',        position: 'FWD', team_name: 'Morocco', price: 12.5 },
]

async function main() {
  console.log(`🌍 Inserindo ${PLAYERS.length} jogadores da Copa 2026...\n`)

  const rows = PLAYERS.map(p => ({
    api_player_id: null,
    name:          p.name,
    position:      p.position,
    team_name:     p.team_name,
    team_id:       null,
    price:         p.price,
    avg_points:    0,
    available:     true,
  }))

  // Tenta upsert por nome+time (seguro, não duplica ao rodar várias vezes).
  // Requer migration_cartola_constraints.sql aplicada no Supabase.
  const { error: upsertErr } = await supabase
    .from('cartola_players')
    .upsert(rows, { onConflict: 'name,team_name', ignoreDuplicates: false })

  if (upsertErr) {
    if (upsertErr.message.includes('unique') || upsertErr.message.includes('constraint')) {
      console.error('❌ Falta a constraint UNIQUE(name, team_name).')
      console.error('   Rode a migration supabase/migration_cartola_constraints.sql no Supabase SQL Editor primeiro.')
    } else {
      console.error('❌ Erro:', upsertErr.message)
    }
    process.exit(1)
  }

  console.log(`✅ ${rows.length} jogadores inseridos/atualizados com sucesso!`)
  console.log('\nDistribuição por posição:')
  ;['GK','DEF','MID','FWD'].forEach(pos => {
    const count = rows.filter(r => r.position === pos).length
    console.log(`  ${pos}: ${count}`)
  })
  console.log('\nAgora abra /cartola no app e teste o Cartola 🎮')
}

main().catch(err => { console.error('❌', err); process.exit(1) })
