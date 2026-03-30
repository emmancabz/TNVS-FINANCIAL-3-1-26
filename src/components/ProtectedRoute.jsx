import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { supabase } from '../../database/supabase'

const ProtectedRoute = () => {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Kunin ang current session sa simula
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    // 2. Mag-subscribe sa auth state changes para ma-update ang session kapag nag-login o nag-logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  // Kung walang session, i-redirect sa login page
  if (!session) {
    return <Navigate to="/" replace />
  }

  // Kung merong session, payagan siyang makita ang mga pages sa loob
  return <Outlet />
}

export default ProtectedRoute