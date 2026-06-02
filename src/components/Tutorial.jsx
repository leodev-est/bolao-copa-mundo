/**
 * Tutorial interativo de primeiro acesso.
 * Mostra as telas reais com overlay + spotlight nas abas de navegação.
 * O usuário é forçado a clicar nas abas para navegar.
 * Apenas 3 pop-ups: boas-vindas, pontuação do Cartola e tela final.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Trophy, MousePointer } from 'lucide-react'

const TUTORIAL_KEY = 'bolao_tutorial_v1'
const PAD = 10 // padding em torno do elemento destacado

// ── Utilitários ─────────────────────────────────────────────────────

function getFirstVisible(selector) {
  const els = document.querySelectorAll(selector)
  for (const el of els) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0 && r.top >= 0) return { el, r }
  }
  return null
}

function useSpotlightRect(selector) {
  const [rect, setRect] = useState(null)

  useEffect(() => {
    if (!selector) { setRect(null); return }
    let raf

    function update() {
      const found = getFirstVisible(selector)
      if (found) {
        const r = found.r
        setRect({ top: r.top - PAD, left: r.left - PAD, bottom: r.bottom + PAD, right: r.right + PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 })
      } else {
        // Tenta de novo se o elemento ainda não renderizou
        raf = requestAnimationFrame(update)
      }
    }

    update()
    window.addEventListener('resize', update)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', update) }
  }, [selector])

  return rect
}

// ── Overlay com spotlight (4 peças ao redor do buraco) ──────────────

function SpotlightOverlay({ rect, opacity = 0.82, onBlockedClick }) {
  const dark = `rgba(0,0,0,${opacity})`

  if (!rect) return (
    <div
      onClick={onBlockedClick}
      style={{ position: 'fixed', inset: 0, background: dark, zIndex: 200 }}
    />
  )

  const { top, left, bottom, right, width, height } = rect

  return (
    <>
      {/* Topo */}
      <div onClick={onBlockedClick} style={{ position: 'fixed', top: 0, left: 0, right: 0, height: top, background: dark, zIndex: 200 }} />
      {/* Baixo */}
      <div onClick={onBlockedClick} style={{ position: 'fixed', top: bottom, left: 0, right: 0, bottom: 0, background: dark, zIndex: 200 }} />
      {/* Esquerda */}
      <div onClick={onBlockedClick} style={{ position: 'fixed', top, left: 0, width: left, height, background: dark, zIndex: 200 }} />
      {/* Direita */}
      <div onClick={onBlockedClick} style={{ position: 'fixed', top, left: right, right: 0, height, background: dark, zIndex: 200 }} />
      {/* Borda luminosa ao redor do spotlight */}
      <div
        style={{
          position: 'fixed', top, left, width, height, zIndex: 200,
          border: '2px solid rgba(52,211,153,0.9)',
          borderRadius: 14,
          boxShadow: '0 0 0 4px rgba(52,211,153,0.15), 0 0 24px rgba(52,211,153,0.35)',
          pointerEvents: 'none',
        }}
      />
    </>
  )
}

// ── Tooltip posicionado acima ou abaixo do spotlight ─────────────────

function Tooltip({ rect, title, desc, action, onNext, onBack, stepN, totalN }) {
  const isAbove = rect ? rect.top > window.innerHeight / 2 : false
  const centerX = rect ? (rect.left + rect.right) / 2 : window.innerWidth / 2

  const style = {
    position: 'fixed',
    zIndex: 201,
    width: Math.min(320, window.innerWidth - 32),
    left: Math.max(16, Math.min(centerX - 160, window.innerWidth - 336)),
  }
  if (isAbove) {
    style.bottom = `calc(100vh - ${rect ? rect.top - 12 : window.innerHeight / 2}px)`
  } else {
    style.top = rect ? rect.bottom + 12 : window.innerHeight / 2 + 80
  }

  return (
    <div style={style}>
      {/* Seta apontando para o elemento */}
      {rect && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          order: isAbove ? 1 : -1,
          marginBottom: isAbove ? 0 : -1,
          marginTop: isAbove ? -1 : 0,
        }}>
          <div style={{
            width: 0, height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            ...(isAbove
              ? { borderTop: '9px solid #1f2937' }
              : { borderBottom: '9px solid #1f2937' }),
          }} />
        </div>
      )}

      <div style={{
        background: '#111827',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 18,
        padding: 20,
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
      }}>
        {/* Progresso */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Passo {stepN} de {totalN}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: totalN }).map((_, i) => (
              <div key={i} style={{
                borderRadius: 9999, transition: 'all 0.3s',
                width: i === stepN - 1 ? 18 : 6, height: 6,
                background: i < stepN ? '#34d399' : '#374151',
              }} />
            ))}
          </div>
        </div>

        <p style={{ color: '#fff', fontWeight: 800, fontSize: 15, marginBottom: 6 }}>{title}</p>
        <p style={{ color: '#9ca3af', fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>{desc}</p>

        {/* CTA */}
        {action === 'click' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 12, padding: '10px 14px' }}>
            <div style={{ width: 8, height: 8, borderRadius: 9999, background: '#34d399', animation: 'pulse 1.5s infinite' }} />
            <MousePointer style={{ width: 14, height: 14, color: '#34d399' }} />
            <span style={{ color: '#34d399', fontSize: 12, fontWeight: 700 }}>Clique no item destacado para continuar</span>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            {onBack && (
              <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '10px 14px', background: 'transparent', border: '1px solid #374151', borderRadius: 12, color: '#9ca3af', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <ChevronLeft style={{ width: 14, height: 14 }} /> Voltar
              </button>
            )}
            <button onClick={onNext} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', background: '#059669', border: 'none', borderRadius: 12, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Entendi, próximo! <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Pop-ups (boas-vindas, cartola e final) ────────────────────────────

function PopupCard({ children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 360, background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 28, padding: 28, boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>
        {children}
      </div>
    </div>
  )
}

function WelcomePopup({ onNext }) {
  return (
    <PopupCard>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ width: 76, height: 76, background: 'linear-gradient(135deg,#059669,#047857)', borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 12px 30px rgba(5,150,105,0.35)' }}>
          <Trophy style={{ width: 38, height: 38, color: '#fff' }} />
        </div>
        <h2 style={{ color: '#fff', fontWeight: 900, fontSize: 24, margin: '0 0 8px' }}>Bolão da Gangue! 🤙</h2>
        <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
          Vamos te guiar pelas telas do app para você conhecer tudo antes da Copa começar.
        </p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24, fontSize: 22 }}>
        {['🇧🇷','🇦🇷','🇫🇷','🏴󠁧󠁢󠁥󠁮󠁧󠁿','🇩🇪','🇵🇹','🇪🇸'].map(f => <span key={f}>{f}</span>)}
      </div>
      <button onClick={onNext} style={{ width: '100%', padding: '14px 0', background: '#059669', border: 'none', borderRadius: 16, color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        Começar o tour <ChevronRight style={{ width: 18, height: 18 }} />
      </button>
    </PopupCard>
  )
}

function CartolaScoringPopup({ onNext, onBack }) {
  const rows = [
    ['⚽ Gol (Atacante/Meia)', '+8 pts',  '#34d399'],
    ['⚽ Gol (Defensor)',      '+12 pts', '#60a5fa'],
    ['⚽ Gol (Goleiro)',       '+15 pts', '#fbbf24'],
    ['🎯 Assistência',         '+5 pts',  '#34d399'],
    ['🧤 Clean Sheet (GOL)',    '+5 pts',  '#34d399'],
    ['🛡️ Clean Sheet (DEF)',    '+3 pts',  '#60a5fa'],
    ['🟨 Cartão Amarelo',       '−2 pts',  '#f59e0b'],
    ['🟥 Cartão Vermelho',      '−5 pts',  '#f87171'],
    ['© Capitão',              '× 2',     '#fb923c'],
  ]
  return (
    <PopupCard>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>⚽</div>
        <h2 style={{ color: '#fff', fontWeight: 900, fontSize: 20, margin: '0 0 6px' }}>Pontuação do Cartola</h2>
        <p style={{ color: '#9ca3af', fontSize: 13, margin: 0 }}>Seus jogadores pontuam de verdade!</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {rows.map(([ev, pts, c]) => (
          <div key={ev} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#d1d5db', fontSize: 13 }}>{ev}</span>
            <span style={{ color: c, fontWeight: 800, fontSize: 15 }}>{pts}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '12px 16px', background: 'transparent', border: '1px solid #374151', borderRadius: 14, color: '#9ca3af', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <ChevronLeft style={{ width: 14, height: 14 }} /> Voltar
        </button>
        <button onClick={onNext} style={{ flex: 1, padding: '12px 0', background: '#059669', border: 'none', borderRadius: 14, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          Próximo <ChevronRight style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </PopupCard>
  )
}

function DonePopup({ onDone }) {
  return (
    <PopupCard>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🎉</div>
        <h2 style={{ color: '#fff', fontWeight: 900, fontSize: 24, margin: '0 0 8px' }}>Tudo pronto!</h2>
        <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.7, margin: '0 0 12px' }}>
          Agora você conhece o app! Faça seus palpites antes de cada jogo e monte seu Cartola antes das rodadas.
        </p>
        <p style={{ color: '#34d399', fontWeight: 700, fontSize: 14, margin: 0 }}>🏆 Copa começa em 11 de junho!</p>
      </div>
      <button onClick={onDone} style={{ width: '100%', padding: '14px 0', background: 'linear-gradient(135deg,#059669,#047857)', border: 'none', borderRadius: 16, color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 8px 20px rgba(5,150,105,0.35)' }}>
        Começar a jogar 🚀
      </button>
    </PopupCard>
  )
}

// ── Configuração dos passos ──────────────────────────────────────────

// type: 'popup-welcome' | 'popup-cartola' | 'popup-done'
//       'spotlight-click' (clique forçado na aba)
//       'spotlight-info'  (mostra a tela, avança com botão)
const STEPS = [
  { type: 'popup-welcome' },

  {
    type: 'spotlight-click',
    selector: 'a[href="/jogos"]',
    navigateTo: '/jogos',
    title: '📅 Aba Jogos',
    desc: 'Todos os 72 jogos da Copa ficam aqui. Clique para conhecer a página!',
  },
  {
    type: 'spotlight-info',
    selector: 'main',
    title: '📋 Lista de Jogos',
    desc: 'Essa é a lista com todos os jogos! Antes de cada partida você pode apostar no placar, resultado e artilheiros. Os palpites fecham no apito inicial.',
    showBack: false,
  },

  {
    type: 'spotlight-click',
    selector: 'a[href="/ranking"]',
    navigateTo: '/ranking',
    title: '🏆 Aba Ranking',
    desc: 'Veja onde você está no ranking! Os pontos atualizam automaticamente após cada jogo. Clique para ver!',
  },
  {
    type: 'spotlight-info',
    selector: 'main',
    title: '📊 Ranking ao Vivo',
    desc: 'Aqui aparece todo mundo do bolão em tempo real. Quanto mais palpites certos, mais você sobe no ranking.',
    showBack: true,
  },

  {
    type: 'spotlight-click',
    selector: 'a[href="/cartola"]',
    navigateTo: '/cartola',
    title: '👕 Aba Cartola',
    desc: 'Monte um time de 11 jogadores com C$100 de orçamento. Eles pontuam de verdade nos jogos da Copa! Clique para ver!',
  },
  {
    type: 'spotlight-info',
    selector: 'main',
    title: '⚽ Cartola da Copa',
    desc: 'Escolha jogadores de qualquer seleção dentro do orçamento de C$100. Defina seu capitão — ele pontua em dobro! Cada rodada tem uma data limite.',
    showBack: true,
  },

  { type: 'popup-cartola' },
  { type: 'popup-done' },
]

// total de "passos visuais" para a barra de progresso (excluindo welcome e done)
const VISUAL_STEPS = STEPS.length

// ── Componente principal ─────────────────────────────────────────────

export default function Tutorial() {
  const [step, setStep]       = useState(0)
  const [visible, setVisible] = useState(false)
  const navigate              = useNavigate()

  useEffect(() => {
    if (!localStorage.getItem(TUTORIAL_KEY)) {
      const t = setTimeout(() => setVisible(true), 700)
      return () => clearTimeout(t)
    }
  }, [])

  const current = STEPS[step]
  const selector = current?.selector ?? null
  const rect     = useSpotlightRect(selector)

  const advance = useCallback(() => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
  }, [step])

  const goBack = useCallback(() => {
    if (step > 0) setStep(s => s - 1)
  }, [step])

  const finish = useCallback(() => {
    localStorage.setItem(TUTORIAL_KEY, '1')
    setVisible(false)
  }, [])

  const handleSpotlightClick = useCallback(() => {
    if (current?.type === 'spotlight-click' && current.navigateTo) {
      navigate(current.navigateTo)
      setStep(s => s + 1)
    }
  }, [current, navigate])

  if (!visible) return null

  // ── Pop-ups ──────────────────────────────────────────────────────
  if (current.type === 'popup-welcome') {
    return <WelcomePopup onNext={advance} />
  }
  if (current.type === 'popup-cartola') {
    return <CartolaScoringPopup onNext={advance} onBack={goBack} />
  }
  if (current.type === 'popup-done') {
    return <DonePopup onDone={finish} />
  }

  // ── Spotlight steps ───────────────────────────────────────────────
  const isClickStep = current.type === 'spotlight-click'
  const showBack    = current.showBack ?? false

  return (
    <>
      <SpotlightOverlay
        rect={isClickStep ? rect : null}
        opacity={isClickStep ? 0.82 : 0.55}
        onBlockedClick={() => {}} // bloqueia cliques fora
      />

      {/* Interceptor de clique no elemento destacado */}
      {isClickStep && rect && (
        <div
          onClick={handleSpotlightClick}
          style={{
            position: 'fixed',
            top: rect.top, left: rect.left,
            width: rect.width, height: rect.height,
            zIndex: 201, cursor: 'pointer',
            borderRadius: 14,
          }}
        />
      )}

      <Tooltip
        rect={isClickStep ? rect : null}
        title={current.title}
        desc={current.desc}
        action={isClickStep ? 'click' : 'next'}
        onNext={advance}
        onBack={showBack ? goBack : null}
        stepN={step}
        totalN={VISUAL_STEPS}
      />
    </>
  )
}
