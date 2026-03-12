import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'

export default function Layout() {
  const [isExpanded, setIsExpanded] = useState(true)

  const toggleSidebar = () => setIsExpanded(!isExpanded)
  const marginWidth = isExpanded ? '260px' : '72px'

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Pass state and toggle to Sidebar */}
      <Sidebar isExpanded={isExpanded} toggleSidebar={toggleSidebar} />
      
      {/* Main Content Area */}
      <div 
        className="flex-1 flex flex-col transition-all duration-300 ease-in-out"
        style={{ marginLeft: marginWidth }}
      >
        <Header />
        
        <main className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
          <div className="w-full max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
