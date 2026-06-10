import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import Login from './pages/Login'
import Jogos from './pages/Jogos'
import Palpite from './pages/Palpite'
import Ranking from './pages/Ranking'
import Perfil from './pages/Perfil'
import Cartola from './pages/Cartola'
import CartolaRanking from './pages/CartolaRanking'
import Historico from './pages/Historico'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/jogos" replace />} />
            <Route path="/jogos" element={<ErrorBoundary><Jogos /></ErrorBoundary>} />
            <Route path="/jogos/:matchId/palpite" element={<ErrorBoundary><Palpite /></ErrorBoundary>} />
            <Route path="/ranking" element={<ErrorBoundary><Ranking /></ErrorBoundary>} />
            <Route path="/historico" element={<ErrorBoundary><Historico /></ErrorBoundary>} />
            <Route path="/perfil" element={<ErrorBoundary><Perfil /></ErrorBoundary>} />
            <Route path="/cartola" element={<ErrorBoundary><Cartola /></ErrorBoundary>} />
            <Route path="/cartola/ranking" element={<ErrorBoundary><CartolaRanking /></ErrorBoundary>} />
          </Route>
        </Route>

        {/* 404 → jogos */}
        <Route path="*" element={<Navigate to="/jogos" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
