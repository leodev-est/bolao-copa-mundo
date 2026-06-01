import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Trophy, Calendar, BarChart2, User, LogOut, Shirt } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const LINKS = [
  { to: '/jogos',   label: 'Jogos',   icon: Calendar  },
  { to: '/ranking', label: 'Ranking', icon: BarChart2  },
  { to: '/cartola', label: 'Cartola', icon: Shirt      },
  { to: '/perfil',  label: 'Perfil',  icon: User       },
]

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-gray-900 border-r border-gray-800 min-h-screen p-4 fixed left-0 top-0 bottom-0 z-10">
        <div className="flex items-center gap-2 mb-8 px-2">
          <Trophy className="text-emerald-400 w-6 h-6" />
          <span className="font-bold text-white text-lg leading-tight">
            Bolão <br />
            <span className="text-emerald-400 text-sm font-semibold">Copa 2026</span>
          </span>
        </div>

        <nav className="flex-1 flex flex-col gap-1">
          {LINKS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith(to)
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-gray-800 pt-4">
          <div className="flex items-center gap-3 px-2 mb-3">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-white text-xs font-bold">
                {(profile?.username ?? user?.email ?? '?')[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {profile?.username ?? user?.email?.split('@')[0]}
              </p>
              <p className="text-gray-500 text-xs truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-10 bg-gray-900 border-t border-gray-800 flex">
        {LINKS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
              pathname.startsWith(to)
                ? 'text-emerald-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        ))}
      </nav>
    </>
  )
}
