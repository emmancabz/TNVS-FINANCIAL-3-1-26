import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Message from './pages/Message'
import Disbursement from './pages/Disbursement'
import GeneralLedger from './pages/GeneralLedger'
import BudgetManagement from './pages/BudgetManagement'
import Collections from './pages/Collections'
import AccountsPayable from './pages/AccountsPayable'
import AccountsReceivable from './pages/AccountsReceivable'
import ErrorBoundary from './components/ErrorBoundary'
import Shortcuts from './pages/Shortcuts'
import HelpCenter from './pages/HelpCenter'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/message" element={<Message />} />
        <Route path="/disbursement" element={<Disbursement />} />
        <Route path="/general-ledger" element={<GeneralLedger />} />
        <Route path="/shortcuts" element={<Shortcuts />} />
        <Route path="/help-center" element={<HelpCenter />} />  
        <Route
          path="/accounts-payable"
          element={
            <ErrorBoundary>
              <AccountsPayable />
            </ErrorBoundary>
          }
        />
        <Route path="/accounts-receivable" element={<AccountsReceivable />} />
        <Route path="/budget-management" element={<BudgetManagement />} />
        <Route path="/collections" element={<Collections />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App