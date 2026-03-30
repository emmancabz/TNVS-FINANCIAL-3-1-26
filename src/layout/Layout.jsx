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
        
        {/* Pinalaki ko ng konti yung padding para hindi sobrang sagad sa gilid */}
        <main className="flex-1 overflow-y-auto px-6 md:px-8 lg:px-10 py-8">
          {/* TINANGGAL ANG max-w-6xl DITO */}
          <div className="w-full mx-auto transition-all duration-300 ease-in-out">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}