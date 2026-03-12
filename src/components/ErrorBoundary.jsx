import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error('Error boundary caught an error', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 m-4 border border-red-200 bg-red-50 rounded-lg text-red-700">
          <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
          <p className="text-sm">Please try refreshing the page or contact support if the problem persists.</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium transition-colors"
          >
            Refresh Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
