import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Jogos from './pages/Jogos'
import Palpite from './pages/Palpite'
import Ranking from './pages/Ranking'
import Perfil from './pages/Perfil'
import Cartola from './pages/Cartola'
import CartolaRanking from './pages/CartolaRanking'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/jogos" replace />} />
            <Route path="/jogos" element={<Jogos />} />
            <Route path="/jogos/:matchId/palpite" element={<Palpite />} />
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/cartola" element={<Cartola />} />
            <Route path="/cartola/ranking" element={<CartolaRanking />} />
          </Route>
        </Route>

        {/* 404 → jogos */}
        <Route path="*" element={<Navigate to="/jogos" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
