import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Edit2, Check, X, TrendingUp, Target, Award, Zap } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useUserBets, useBetStats } from '../hooks/useBets'
import { BET_TYPE_LABELS, BET_TYPE_ICONS, formatOdd } from '../lib/odds'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

function StatCard({ icon: Icon, label, value, sub, color = 'emerald' }) {
  const colors = {
    emerald: 'text-emerald-400 bg-emerald-900/20',
    blue:    'text-blue-400 bg-blue-900/20',
    yellow:  'text-yellow-400 bg-yellow-900/20',
    red:     'text-red-400 bg-red-900/20',
  }
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className={`inline-flex p-2 rounded-lg mb-3 ${colors[color]}`}>
        <Icon className={`w-4 h-4 ${colors[color].split(' ')[0]}`} />
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
    </div>
  )
}

const BET_STATUS_LABELS = {
  won:     { label: 'Acertou',    className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' },
  lost:    { label: 'Errou',      className: 'bg-red-500/15 text-red-400 border border-red-500/30'            },
  pending: { label: 'Aguardando', className: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'   },
}

export default function Perfil() {
  const { user, profile, updateProfile } = useAuth()
  const { data: bets, isLoading }        = useUserBets()
  const stats                            = useBetStats(bets)

  const [editing, setEditing]   = useState(false)
  const [username, setUsername] = useState(profile?.username ?? '')
  const [saving, setSaving]     = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')

  const handleSave = async () => {
    setSaving(true)
    await updateProfile({ username })
    setSaving(false)
    setEditing(false)
  }

  const filteredBets = (bets ?? []).filter(b =>
    filterStatus === 'all' ? true : b.status === filterStatus
  )

  // Dados para o gráfico de evolução de pontos
  const chartData = (bets ?? [])
    .filter(b => b.status === 'won')
    .sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at))
    .reduce((acc, bet) => {
      const prev = acc[acc.length - 1]?.points ?? 0
      return [...acc, {
        date:   format(new Date(bet.updated_at), 'dd/MM'),
        points: parseFloat((prev + (bet.points_won ?? 0)).toFixed(2)),
      }]
    }, [{ date: 'Início', points: 0 }])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="avatar" className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-emerald-700 flex items-center justify-center text-2xl font-black text-white border-2 border-emerald-500">
            {(profile?.username ?? user?.email ?? '?')[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500 flex-1"
                maxLength={30}
              />
              <button onClick={handleSave} disabled={saving} className="p-1.5 text-emerald-400 hover:bg-emerald-900/30 rounded-lg">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setEditing(false)} className="p-1.5 text-gray-500 hover:bg-gray-800 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white">
                {profile?.username ?? user?.email?.split('@')[0]}
              </h1>
              <button onClick={() => { setUsername(profile?.username ?? ''); setEditing(true) }} className="text-gray-600 hover:text-emerald-400 transition-colors">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <p className="text-gray-500 text-sm mt-0.5">{user?.email}</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard icon={Award}    label="Pontos totais"  value={stats.totalPoints.toFixed(2)}  color="emerald" />
          <StatCard icon={Target}   label="Taxa de acerto" value={`${stats.winRate}%`}           color="blue"    />
          <StatCard icon={Zap}      label="Palpites feitos" value={stats.total}                  color="yellow"  />
          <StatCard icon={TrendingUp} label="Lucro"        value={`${stats.profit > 0 ? '+' : ''}${stats.profit.toFixed(2)}`} color={stats.profit >= 0 ? 'emerald' : 'red'} sub={`${stats.won}W · ${stats.lost}L`} />
        </div>
      )}

      {/* Gráfico de evolução */}
      {chartData.length > 1 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">
            Evolução de pontos
          </h2>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#9ca3af' }}
                itemStyle={{ color: '#34d399' }}
              />
              <Line type="monotone" dataKey="points" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Histórico de palpites */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Histórico de palpites
          </h2>
          <div className="flex gap-1">
            {['all', 'won', 'lost', 'pending'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-2 py-1 text-xs rounded-lg font-medium transition-colors ${
                  filterStatus === s ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {s === 'all' ? 'Todos' : s === 'won' ? '✓' : s === 'lost' ? '✗' : '⏳'}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-900 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredBets.length === 0 ? (
          <div className="text-center py-12 bg-gray-900 rounded-xl border border-gray-800">
            <p className="text-gray-500">Nenhum palpite {filterStatus !== 'all' ? `com status "${filterStatus}"` : 'ainda'}.</p>
            <p className="text-gray-600 text-sm mt-1">Vá em Jogos e faça seu primeiro palpite!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredBets.map(bet => {
              const statusCfg = BET_STATUS_LABELS[bet.status] ?? BET_STATUS_LABELS.pending
              const match = bet.matches
              const opt = bet.bet_options
              return (
                <div key={bet.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <span className="text-lg mt-0.5 shrink-0">{BET_TYPE_ICONS[opt?.type] ?? '🎲'}</span>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{opt?.description}</p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {match?.home_team} vs {match?.away_team}
                          {match?.match_date && (
                            <span className="text-gray-600"> · {format(new Date(match.match_date), "d MMM", { locale: ptBR })}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusCfg.className}`}>
                        {statusCfg.label}
                      </span>
                      <p className="text-white font-bold text-sm mt-1">
                        {bet.status === 'won'
                          ? `+${bet.points_won?.toFixed(2)}`
                          : bet.status === 'lost'
                          ? '-1'
                          : '?'} pts
                      </p>
                      <p className="text-gray-600 text-xs">odd {formatOdd(opt?.odd)}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
