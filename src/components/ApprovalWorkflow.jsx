import { motion } from 'framer-motion'
import { UserPlus, UserCheck, FileCheck } from 'lucide-react'

const STEPS = [
  { id: 'create', label: 'Finance Staff creates entry', icon: UserPlus },
  { id: 'approve', label: 'Manager approves', icon: UserCheck },
  { id: 'post', label: 'System posts to GL', icon: FileCheck },
]

function ApprovalWorkflow({ status = { create: true, approve: false, post: false } }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border border-gray-100 bg-white overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">Approval Workflow</div>
      <div className="p-4 space-y-3">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const done = status[s.id]
          return (
            <div key={s.id} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${done ? 'bg-[#2ecc71]/20 text-[#2ecc71]' : 'bg-gray-100 text-gray-400'}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${done ? 'text-gray-900' : 'text-gray-500'}`}>{s.label}</p>
                <p className="text-[10px] text-gray-400">{done ? 'Done' : 'Pending'}</p>
              </div>
              {i < STEPS.length - 1 && (
                <div className="w-px h-6 bg-gray-200 self-stretch mx-1" />
              )}
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

export default ApprovalWorkflow
