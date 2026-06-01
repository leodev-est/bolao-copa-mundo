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
  // ── Brasil ──────────────────────────────────────────────
  { name: 'Alisson',          position: 'GK',  team_name: 'Brasil', price: 14.0 },
  { name: 'Ederson',          position: 'GK',  team_name: 'Brasil', price: 11.0 },
  { name: 'Marquinhos',       position: 'DEF', team_name: 'Brasil', price: 12.0 },
  { name: 'Militão',          position: 'DEF', team_name: 'Brasil', price: 11.5 },
  { name: 'Danilo',           position: 'DEF', team_name: 'Brasil', price:  9.0 },
  { name: 'Alex Sandro',      position: 'DEF', team_name: 'Brasil', price:  8.0 },
  { name: 'Lucas Paquetá',    position: 'MID', team_name: 'Brasil', price: 13.0 },
  { name: 'Bruno Guimarães',  position: 'MID', team_name: 'Brasil', price: 13.5 },
  { name: 'Gerson',           position: 'MID', team_name: 'Brasil', price:  9.5 },
  { name: 'Raphinha',         position: 'FWD', team_name: 'Brasil', price: 15.0 },
  { name: 'Vinicius Jr',      position: 'FWD', team_name: 'Brasil', price: 19.0 },
  { name: 'Rodrygo',          position: 'FWD', team_name: 'Brasil', price: 14.5 },
  { name: 'Endrick',          position: 'FWD', team_name: 'Brasil', price: 12.0 },

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

  // ── França ──────────────────────────────────────────────
  { name: 'Maignan',          position: 'GK',  team_name: 'França', price: 13.0 },
  { name: 'Theo Hernández',   position: 'DEF', team_name: 'França', price: 12.0 },
  { name: 'Saliba',           position: 'DEF', team_name: 'França', price: 12.5 },
  { name: 'Upamecano',        position: 'DEF', team_name: 'França', price: 10.5 },
  { name: 'Camavinga',        position: 'MID', team_name: 'França', price: 12.0 },
  { name: 'Tchouaméni',       position: 'MID', team_name: 'França', price: 12.5 },
  { name: 'Griezmann',        position: 'MID', team_name: 'França', price: 14.0 },
  { name: 'Mbappé',           position: 'FWD', team_name: 'França', price: 20.0 },
  { name: 'Dembélé',          position: 'FWD', team_name: 'França', price: 14.0 },
  { name: 'Thuram',           position: 'FWD', team_name: 'França', price: 13.5 },

  // ── Espanha ─────────────────────────────────────────────
  { name: 'Unai Simón',       position: 'GK',  team_name: 'Espanha', price: 11.5 },
  { name: 'Carvajal',         position: 'DEF', team_name: 'Espanha', price: 11.5 },
  { name: 'Le Normand',       position: 'DEF', team_name: 'Espanha', price: 10.0 },
  { name: 'Laporte',          position: 'DEF', team_name: 'Espanha', price:  9.5 },
  { name: 'Cucurella',        position: 'DEF', team_name: 'Espanha', price:  9.0 },
  { name: 'Pedri',            position: 'MID', team_name: 'Espanha', price: 14.0 },
  { name: 'Rodri',            position: 'MID', team_name: 'Espanha', price: 14.5 },
  { name: 'Gavi',             position: 'MID', team_name: 'Espanha', price: 13.0 },
  { name: 'Yamal',            position: 'FWD', team_name: 'Espanha', price: 17.0 },
  { name: 'Morata',           position: 'FWD', team_name: 'Espanha', price: 12.0 },
  { name: 'Williams',         position: 'FWD', team_name: 'Espanha', price: 12.5 },

  // ── Inglaterra ──────────────────────────────────────────
  { name: 'Pickford',         position: 'GK',  team_name: 'Inglaterra', price: 11.0 },
  { name: 'Alexander-Arnold', position: 'DEF', team_name: 'Inglaterra', price: 12.0 },
  { name: 'Stones',           position: 'DEF', team_name: 'Inglaterra', price: 10.5 },
  { name: 'Maguire',          position: 'DEF', team_name: 'Inglaterra', price:  8.5 },
  { name: 'Trippier',         position: 'DEF', team_name: 'Inglaterra', price: 11.0 },
  { name: 'Bellingham',       position: 'MID', team_name: 'Inglaterra', price: 17.5 },
  { name: 'Rice',             position: 'MID', team_name: 'Inglaterra', price: 13.5 },
  { name: 'Saka',             position: 'FWD', team_name: 'Inglaterra', price: 15.5 },
  { name: 'Kane',             position: 'FWD', team_name: 'Inglaterra', price: 18.0 },
  { name: 'Foden',            position: 'FWD', team_name: 'Inglaterra', price: 15.0 },

  // ── Alemanha ────────────────────────────────────────────
  { name: 'Neuer',            position: 'GK',  team_name: 'Alemanha', price: 12.0 },
  { name: 'Rüdiger',          position: 'DEF', team_name: 'Alemanha', price: 12.0 },
  { name: 'Schlotterbeck',    position: 'DEF', team_name: 'Alemanha', price: 10.0 },
  { name: 'Kimmich',          position: 'MID', team_name: 'Alemanha', price: 14.0 },
  { name: 'Kroos',            position: 'MID', team_name: 'Alemanha', price: 13.5 },
  { name: 'Wirtz',            position: 'MID', team_name: 'Alemanha', price: 15.5 },
  { name: 'Musiala',          position: 'MID', team_name: 'Alemanha', price: 15.0 },
  { name: 'Havertz',          position: 'FWD', team_name: 'Alemanha', price: 13.5 },

  // ── Portugal ────────────────────────────────────────────
  { name: 'Rui Patrício',     position: 'GK',  team_name: 'Portugal', price: 10.5 },
  { name: 'Cancelo',          position: 'DEF', team_name: 'Portugal', price: 12.0 },
  { name: 'Rúben Dias',       position: 'DEF', team_name: 'Portugal', price: 12.5 },
  { name: 'Bernardo Silva',   position: 'MID', team_name: 'Portugal', price: 14.5 },
  { name: 'Vitinha',          position: 'MID', team_name: 'Portugal', price: 13.0 },
  { name: 'Bruno Fernandes',  position: 'MID', team_name: 'Portugal', price: 14.0 },
  { name: 'Ronaldo',          position: 'FWD', team_name: 'Portugal', price: 16.0 },
  { name: 'Rafael Leão',      position: 'FWD', team_name: 'Portugal', price: 14.5 },

  // ── Holanda ─────────────────────────────────────────────
  { name: 'Verbruggen',       position: 'GK',  team_name: 'Holanda', price: 11.0 },
  { name: 'Van Dijk',         position: 'DEF', team_name: 'Holanda', price: 13.5 },
  { name: 'Dumfries',         position: 'DEF', team_name: 'Holanda', price: 10.5 },
  { name: 'De Jong',          position: 'MID', team_name: 'Holanda', price: 13.5 },
  { name: 'Reijnders',        position: 'MID', team_name: 'Holanda', price: 12.5 },
  { name: 'Gakpo',            position: 'FWD', team_name: 'Holanda', price: 14.0 },
  { name: 'Depay',            position: 'FWD', team_name: 'Holanda', price: 12.0 },

  // ── Uruguai ─────────────────────────────────────────────
  { name: 'Rochet',           position: 'GK',  team_name: 'Uruguai', price:  9.0 },
  { name: 'Giménez',          position: 'DEF', team_name: 'Uruguai', price: 11.0 },
  { name: 'Araújo',           position: 'DEF', team_name: 'Uruguai', price: 12.0 },
  { name: 'Valverde',         position: 'MID', team_name: 'Uruguai', price: 15.0 },
  { name: 'De Arrascaeta',    position: 'MID', team_name: 'Uruguai', price: 12.5 },
  { name: 'Núñez',            position: 'FWD', team_name: 'Uruguai', price: 13.5 },
  { name: 'Suárez',           position: 'FWD', team_name: 'Uruguai', price: 11.0 },

  // ── Colômbia ────────────────────────────────────────────
  { name: 'Vargas',           position: 'GK',  team_name: 'Colômbia', price:  9.0 },
  { name: 'Dávinson Sánchez', position: 'DEF', team_name: 'Colômbia', price: 10.0 },
  { name: 'Muñoz',            position: 'DEF', team_name: 'Colômbia', price:  9.5 },
  { name: 'James Rodríguez',  position: 'MID', team_name: 'Colômbia', price: 13.0 },
  { name: 'Cardona',          position: 'MID', team_name: 'Colômbia', price: 10.0 },
  { name: 'Díaz',             position: 'FWD', team_name: 'Colômbia', price: 14.5 },
  { name: 'Córdoba',          position: 'FWD', team_name: 'Colômbia', price: 11.0 },

  // ── Marrocos ────────────────────────────────────────────
  { name: 'Bono',             position: 'GK',  team_name: 'Marrocos', price: 12.0 },
  { name: 'Hakimi',           position: 'DEF', team_name: 'Marrocos', price: 14.0 },
  { name: 'Aguerd',           position: 'DEF', team_name: 'Marrocos', price: 10.5 },
  { name: 'Ounahi',           position: 'MID', team_name: 'Marrocos', price: 11.5 },
  { name: 'Ziyech',           position: 'MID', team_name: 'Marrocos', price: 12.0 },
  { name: 'En-Nesyri',        position: 'FWD', team_name: 'Marrocos', price: 12.5 },
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

  const { error } = await supabase
    .from('cartola_players')
    .insert(rows)

  if (error) {
    console.error('❌ Erro:', error.message)
    process.exit(1)
  }

  console.log(`✅ ${rows.length} jogadores inseridos com sucesso!`)
  console.log('\nDistribuição por posição:')
  ;['GK','DEF','MID','FWD'].forEach(pos => {
    const count = rows.filter(r => r.position === pos).length
    console.log(`  ${pos}: ${count}`)
  })
  console.log('\nAgora abra /cartola no app e teste o Cartola 🎮')
}

main().catch(err => { console.error('❌', err); process.exit(1) })
