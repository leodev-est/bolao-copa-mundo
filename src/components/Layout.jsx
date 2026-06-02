import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Tutorial from './Tutorial'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <main className="md:ml-56 pb-20 md:pb-0">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Outlet />
        </div>
      </main>
      <Tutorial />
    </div>
  )
}
