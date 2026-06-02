import { useState, useEffect } from 'react'
import { ChevronRight, ChevronLeft, Trophy, Calendar, BarChart2, Shirt } from 'lucide-react'

const TUTORIAL_KEY = 'bolao_tutorial_v1'

// ── Visuais de cada etapa ───────────────────────────────────────────

function MatchMini() {
  return (
    <div className="bg-gray-900 rounded-2xl p-4 border border-gray-700 w-full max-w-[300px] mx-auto">
      <p className="text-[10px] text-gray-500 text-center mb-3 uppercase tracking-wider font-semibold">Copa do Mundo · Grupo C</p>
      <div className="flex items-center justify-between px-2">
        <div className="flex flex-col items-center gap-2 flex-1">
          <div className="w-12 h-12 rounded-full bg-emerald-900/60 border-2 border-emerald-500/40 flex items-center justify-center">
            <span className="text-lg">🇧🇷</span>
          </div>
          <span className="text-white text-xs font-bold">Brasil</span>
        </div>
        <div className="flex flex-col items-center gap-1 px-2">
          <div className="bg-gray-800 rounded-xl px-4 py-2 border border-gray-700">
            <span className="text-gray-400 font-black text-xl">×</span>
          </div>
          <span className="text-[10px] text-gray-500">12 Jun · 18h</span>
        </div>
        <div className="flex flex-col items-center gap-2 flex-1">
          <div className="w-12 h-12 rounded-full bg-red-900/40 border-2 border-red-500/30 flex items-center justify-center">
            <span className="text-lg">🇲🇦</span>
          </div>
          <span className="text-white text-xs font-bold">Marrocos</span>
        </div>
      </div>
      {/* Pulsing CTA */}
      <div className="mt-4 flex justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-30" />
          <div className="relative bg-emerald-600 text-white text-xs font-bold px-5 py-2 rounded-full flex items-center gap-1.5">
            Fazer Palpite <ChevronRight className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  )
}

function BetMini() {
  return (
    <div className="bg-gray-900 rounded-2xl p-4 border border-gray-700 w-full max-w-[300px] mx-auto space-y-3">
      <div>
        <p className="text-[10px] text-gray-500 text-center mb-2 uppercase tracking-wider font-semibold">① Palpite de Placar</p>
        <div className="flex items-center justify-center gap-3">
          <div className="bg-gray-800 rounded-xl px-5 py-2.5 border border-emerald-500/40">
            <span className="text-white font-black text-2xl">2</span>
          </div>
          <span className="text-gray-600 font-bold text-lg">×</span>
          <div className="bg-gray-800 rounded-xl px-5 py-2.5 border border-gray-600">
            <span className="text-white font-black text-2xl">1</span>
          </div>
        </div>
      </div>
      <div>
        <p className="text-[10px] text-gray-500 text-center mb-2 uppercase tracking-wider font-semibold">② Resultado</p>
        <div className="flex gap-2 justify-center flex-wrap">
          <span className="bg-emerald-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-full ring-2 ring-emerald-400/40">Brasil ✓</span>
          <span className="bg-gray-800 text-gray-400 text-[10px] font-bold px-3 py-1.5 rounded-full border border-gray-700">Empate</span>
          <span className="bg-gray-800 text-gray-400 text-[10px] font-bold px-3 py-1.5 rounded-full border border-gray-700">Marrocos</span>
        </div>
      </div>
      <div>
        <p className="text-[10px] text-gray-500 text-center mb-2 uppercase tracking-wider font-semibold">③ Artilheiro (bônus)</p>
        <div className="bg-gray-800 rounded-xl p-2.5 border border-gray-700 flex items-center gap-2.5">
          <span className="text-xl">⚽</span>
          <div>
            <p className="text-white text-[11px] font-semibold">Vinicius Jr.</p>
            <p className="text-emerald-400 text-[10px]">+0.5 pts se marcar</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ScoringMini() {
  return (
    <div className="bg-gray-900 rounded-2xl p-4 border border-gray-700 w-full max-w-[300px] mx-auto space-y-3">
      {[
        { icon: '🎯', label: 'Placar exato', pts: 'odd × aposta', sub: 'Mais difícil, mais pontos', c: 'text-yellow-400', bg: 'bg-yellow-500/10' },
        { icon: '✅', label: 'Resultado certo', pts: '1.3× aposta', sub: 'Só o vencedor/empate', c: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { icon: '⚽', label: 'Artilheiro certo', pts: '+0.5 pts', sub: 'Bônus por acerto', c: 'text-blue-400', bg: 'bg-blue-500/10' },
      ].map(r => (
        <div key={r.label} className={`flex items-center gap-3 rounded-xl p-3 ${r.bg}`}>
          <span className="text-2xl">{r.icon}</span>
          <div className="flex-1">
            <p className="text-white text-xs font-semibold">{r.label}</p>
            <p className="text-gray-500 text-[10px]">{r.sub}</p>
          </div>
          <span className={`text-sm font-black ${r.c}`}>{r.pts}</span>
        </div>
      ))}
      <p className="text-center text-gray-600 text-[10px]">Odds variam por jogo — quanto maior o favorito, menor a odd</p>
    </div>
  )
}

function RankingMini() {
  const rows = [
    { pos: '🥇', name: 'Você 🏆', pts: '145.5', hi: true },
    { pos: '🥈', name: 'João',    pts: '132.0' },
    { pos: '🥉', name: 'Maria',   pts: '118.5' },
    { pos: '4º', name: 'Pedro',   pts: '98.0'  },
  ]
  return (
    <div className="bg-gray-900 rounded-2xl p-4 border border-gray-700 w-full max-w-[300px] mx-auto space-y-2">
      <p className="text-[10px] text-gray-500 text-center mb-3 uppercase tracking-wider font-semibold">Ranking ao vivo</p>
      {rows.map(r => (
        <div key={r.name} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${r.hi ? 'bg-emerald-900/40 border border-emerald-600/40 shadow-lg shadow-emerald-900/20' : 'bg-gray-800/60'}`}>
          <span className="text-sm w-6 text-center">{r.pos}</span>
          <span className={`flex-1 text-xs font-semibold ${r.hi ? 'text-white' : 'text-gray-300'}`}>{r.name}</span>
          <span className={`text-xs font-bold ${r.hi ? 'text-emerald-400' : 'text-gray-400'}`}>{r.pts} pts</span>
        </div>
      ))}
    </div>
  )
}

function FieldMini() {
  return (
    <div className="rounded-2xl overflow-hidden w-full max-w-[260px] mx-auto border border-white/10" style={{ background: 'linear-gradient(180deg, #14532d 0%, #15803d 35%, #16a34a 50%, #15803d 65%, #14532d 100%)' }}>
      <div className="relative py-5 px-3 space-y-3">
        <div className="absolute top-1/2 left-4 right-4 h-px bg-white/10 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full border border-white/10 pointer-events-none" />
        {[
          { players: [{ n: 'Vini Jr', pos: 'ATA', c: 'red' }, { n: 'Mbappé', pos: 'ATA', c: 'red' }] },
          { players: [{ n: 'Pedri', pos: 'MEI', c: 'emerald' }, { n: 'Bell.', pos: 'MEI', c: 'emerald' }, { n: 'De B.', pos: 'MEI', c: 'emerald' }] },
          { players: [{ n: 'T.Silva', pos: 'DEF', c: 'blue' }, { n: 'Militão', pos: 'DEF', c: 'blue' }, { n: 'R.Dias', pos: 'DEF', c: 'blue' }] },
          { players: [{ n: 'Alisson', pos: 'GOL', c: 'yellow', captain: true }] },
        ].map((row, ri) => (
          <div key={ri} className="flex justify-center gap-3">
            {row.players.map(p => (
              <div key={p.n} className="flex flex-col items-center gap-1">
                <div className={`w-10 h-10 rounded-full bg-${p.c}-500/20 border-2 border-${p.c}-500/60 flex items-center justify-center relative`}>
                  <span className={`text-[9px] font-bold text-${p.c}-300`}>{p.pos}</span>
                  {p.captain && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center shadow-md">
                      <span className="text-[7px] text-white font-black">C</span>
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-white/80 font-medium">{p.n}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="bg-black/20 px-3 py-2 flex justify-between items-center">
        <span className="text-[10px] text-white/60">Orçamento</span>
        <span className="text-[10px] text-emerald-400 font-bold">C$ 100 disponível</span>
      </div>
    </div>
  )
}

function CartolaScoreMini() {
  const rows = [
    { ev: '⚽ Gol (ATA/MEI)',      pts: '+8',  c: 'text-emerald-400' },
    { ev: '⚽ Gol (DEF)',           pts: '+12', c: 'text-blue-400'    },
    { ev: '⚽ Gol (GOL)',           pts: '+15', c: 'text-yellow-400'  },
    { ev: '🎯 Assistência',         pts: '+5',  c: 'text-emerald-400' },
    { ev: '🧤 Clean Sheet (GOL)',    pts: '+5',  c: 'text-emerald-400' },
    { ev: '🛡️ Clean Sheet (DEF)',    pts: '+3',  c: 'text-blue-400'   },
    { ev: '🟨 Cartão Amarelo',       pts: '−2',  c: 'text-yellow-500' },
    { ev: '🟥 Cartão Vermelho',      pts: '−5',  c: 'text-red-500'    },
    { ev: '© Capitão',              pts: '×2',  c: 'text-orange-400' },
  ]
  return (
    <div className="bg-gray-900 rounded-2xl p-4 border border-gray-700 w-full max-w-[300px] mx-auto">
      <p className="text-[10px] text-gray-500 text-center mb-3 uppercase tracking-wider font-semibold">Tabela de pontuação</p>
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.ev} className="flex items-center justify-between gap-2">
            <span className="text-gray-300 text-[11px]">{r.ev}</span>
            <span className={`text-sm font-black tabular-nums ${r.c}`}>{r.pts}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Seta apontando para a barra de navegação ────────────────────────

function NavArrow({ tab, icon: Icon, label }) {
  return (
    <div className="flex flex-col items-center gap-1 mt-1">
      {/* Linha + seta animada */}
      <div className="flex flex-col items-center gap-0.5 animate-bounce">
        <div className="w-0.5 h-6 bg-gradient-to-b from-transparent to-emerald-400" />
        <svg width="14" height="8" viewBox="0 0 14 8" fill="none">
          <path d="M7 8L0 0h14L7 8z" fill="#34d399" />
        </svg>
      </div>
      {/* Mini nav tab mock */}
      <div className="flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg shadow-emerald-900/50">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <p className="text-gray-500 text-[10px] mt-1">Toque aqui na barra de navegação</p>
    </div>
  )
}

// ── Definição dos passos ────────────────────────────────────────────

const STEPS = [
  {
    id: 'welcome',
    visual: () => (
      <div className="flex flex-col items-center gap-3">
        <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-900/50 ring-4 ring-emerald-500/20">
          <Trophy className="w-10 h-10 text-white" />
        </div>
        <div className="flex gap-2">
          {['🇧🇷', '🇦🇷', '🇫🇷', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🇩🇪', '🇵🇹'].map(f => (
            <span key={f} className="text-xl">{f}</span>
          ))}
        </div>
      </div>
    ),
    title: 'Bem-vindo ao Bolão! 🏆',
    description: 'Faça palpites nos jogos, monte seu time no Cartola e dispute o ranking com os amigos. Vamos te mostrar tudo em menos de 2 minutos!',
    arrow: null,
  },
  {
    id: 'jogos',
    visual: () => <MatchMini />,
    title: 'Encontre os Jogos',
    description: 'Na aba Jogos você vê todos os 72 jogos da Copa. Toque em qualquer partida antes do apito para fazer seu palpite.',
    arrow: <NavArrow tab="jogos" icon={Calendar} label="Jogos" />,
  },
  {
    id: 'palpite',
    visual: () => <BetMini />,
    title: 'Como Apostar',
    description: 'Cada palpite tem 3 partes: o placar exato que você acha que vai sair, o resultado (vitória/empate) e o artilheiro para pontos bônus.',
    arrow: null,
  },
  {
    id: 'regras',
    visual: () => <ScoringMini />,
    title: 'Como Ganhar Pontos',
    description: 'Placar exato dá mais pontos e usa as odds do jogo. Acertar só o resultado dá 1.3× os pontos apostados. Artilheiro é sempre bônus.',
    arrow: null,
  },
  {
    id: 'ranking',
    visual: () => <RankingMini />,
    title: 'Ranking em Tempo Real',
    description: 'Após cada jogo seus pontos atualizam automaticamente. Acompanhe sua posição e dos amigos na aba Ranking.',
    arrow: <NavArrow tab="ranking" icon={BarChart2} label="Ranking" />,
  },
  {
    id: 'cartola',
    visual: () => <FieldMini />,
    title: 'Cartola da Copa ⚽',
    description: 'Monte um time de 11 jogadores com C$100 de orçamento. Misture jogadores de qualquer seleção e defina seu capitão — ele pontua em dobro!',
    arrow: <NavArrow tab="cartola" icon={Shirt} label="Cartola" />,
  },
  {
    id: 'cartola-score',
    visual: () => <CartolaScoreMini />,
    title: 'Pontuação do Cartola',
    description: 'Seus jogadores pontuam de verdade com o que acontece nos jogos. Gols, assistências, clean sheet e cartões — tudo conta!',
    arrow: null,
  },
  {
    id: 'done',
    visual: () => (
      <div className="flex flex-col items-center gap-3">
        <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-900/60 ring-4 ring-emerald-500/20">
          <span className="text-4xl">🎉</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-white font-bold text-base">Tudo pronto!</p>
          <p className="text-gray-400 text-sm text-center">O bolão começa em 11 de junho</p>
        </div>
      </div>
    ),
    title: 'Boa sorte! 🌟',
    description: 'Faça seus palpites antes de cada jogo e monte seu Cartola. Que o melhor vença — e que seja você!',
    arrow: null,
    isLast: true,
  },
]

// ── Componente principal ────────────────────────────────────────────

export default function Tutorial() {
  const [step, setStep]       = useState(0)
  const [visible, setVisible] = useState(false)
  const [dir, setDir]         = useState(1) // 1 = avança, -1 = volta

  useEffect(() => {
    if (!localStorage.getItem(TUTORIAL_KEY)) {
      // Pequeno delay para a página carregar antes de mostrar
      const t = setTimeout(() => setVisible(true), 600)
      return () => clearTimeout(t)
    }
  }, [])

  if (!visible) return null

  const current = STEPS[step]
  const isFirst = step === 0
  const isLast  = step === STEPS.length - 1

  function advance() {
    if (isLast) {
      localStorage.setItem(TUTORIAL_KEY, '1')
      setVisible(false)
      return
    }
    setDir(1)
    setStep(s => s + 1)
  }

  function back() {
    if (isFirst) return
    setDir(-1)
    setStep(s => s - 1)
  }

  const Visual = current.visual

  return (
    /* Overlay — pointer-events bloqueiam cliques fora */
    <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4">

      {/* Card */}
      <div className="w-full max-w-sm bg-gray-900 border border-gray-700/80 rounded-3xl shadow-2xl overflow-hidden">

        {/* Barra de progresso */}
        <div className="h-1 bg-gray-800">
          <div
            className="h-full bg-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-5 space-y-4">
          {/* Dots de progresso */}
          <div className="flex justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === step
                    ? 'w-5 h-1.5 bg-emerald-400'
                    : i < step
                    ? 'w-1.5 h-1.5 bg-emerald-700'
                    : 'w-1.5 h-1.5 bg-gray-700'
                }`}
              />
            ))}
          </div>

          {/* Visual */}
          <div className="min-h-[160px] flex items-center justify-center">
            <Visual />
          </div>

          {/* Texto */}
          <div className="text-center space-y-1.5">
            <h2 className="text-white font-black text-xl leading-tight">{current.title}</h2>
            <p className="text-gray-400 text-sm leading-relaxed">{current.description}</p>
          </div>

          {/* Seta de navegação (quando aplicável) */}
          {current.arrow && (
            <div className="flex justify-center">
              {current.arrow}
            </div>
          )}

          {/* Botões */}
          <div className="flex items-center gap-3 pt-1">
            {!isFirst && (
              <button
                onClick={back}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </button>
            )}

            <button
              onClick={advance}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
                isLast
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-900/50'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isLast ? (
                <>Começar a jogar 🚀</>
              ) : (
                <>
                  Próximo
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Step counter */}
          <p className="text-center text-gray-600 text-[11px]">
            Passo {step + 1} de {STEPS.length}
          </p>
        </div>
      </div>
    </div>
  )
}
