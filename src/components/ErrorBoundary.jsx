import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-white font-bold text-lg mb-1">Algo deu errado</p>
          <p className="text-gray-500 text-sm mb-6 max-w-sm">
            {this.state.error?.message ?? 'Erro inesperado. Tente recarregar a página.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Recarregar página
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
