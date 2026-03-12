import { motion } from 'framer-motion'
import { FileText, Download, Eye, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../database/supabase'

function DocumentAttachment({ documents = [], title = 'Attachments', storageFolder = 'general' }) {
  const defaultDocs = [
    { id: '1', name: 'Receipt-OR-2026-045.pdf', source: 'Logistics', date: 'Feb 20, 2026' },
    { id: '2', name: 'Invoice-PROC-1122.pdf', source: 'HR', date: 'Feb 19, 2026' },
  ]
  const [files, setFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const list = documents.length ? documents : files.length ? files : defaultDocs

  useEffect(() => {
    const loadFiles = async () => {
      try {
        const { data, error } = await supabase.storage.from('fin-documents').list(storageFolder, {
          limit: 50,
          sortBy: { column: 'created_at', order: 'desc' },
        })
        if (error) throw error
        const mapped = (data ?? []).map((file) => ({
          id: file.id || file.name,
          name: file.name,
          source: storageFolder,
          date: file.created_at ? new Date(file.created_at).toLocaleDateString('en-PH') : '—',
          path: `${storageFolder}/${file.name}`,
        }))
        setFiles(mapped)
      } catch (err) {
        const message = err?.message || err
        console.error('Failed to load attachments', message)
      }
    }
    loadFiles()
  }, [storageFolder])

  const handleUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    setUploadError('')
    try {
      const path = `${storageFolder}/${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from('fin-documents').upload(path, file, {
        upsert: false,
      })
      if (error) throw error
      const updated = {
        id: path,
        name: file.name,
        source: storageFolder,
        date: new Date().toLocaleDateString('en-PH'),
        path,
      }
      setFiles((prev) => [updated, ...prev])
    } catch (err) {
      const message = err?.message || err
      console.error('Failed to upload attachment', message)
      setUploadError('Upload failed')
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border border-gray-100 bg-white overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <FileText className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-semibold text-gray-700">{title}</span>
        <label className="ml-auto inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
          <Upload className="w-4 h-4" />
          <span>{isUploading ? 'Uploading...' : 'Upload'}</span>
          <input type="file" className="hidden" onChange={handleUpload} />
        </label>
      </div>
      {uploadError && <div className="px-4 py-2 text-xs text-red-600">{uploadError}</div>}
      <div className="divide-y divide-gray-50">
        {list.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
                <p className="text-[10px] text-gray-400">{doc.source} · {doc.date}</p>
              </div>
            </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                  title="View"
                  onClick={async () => {
                    if (!doc.path) return
                    const { data, error } = await supabase.storage
                      .from('fin-documents')
                      .createSignedUrl(doc.path, 60)
                    if (error) {
                      console.error('Failed to generate file URL', error.message)
                      return
                    }
                    window.open(data.signedUrl, '_blank')
                  }}
                >
                <Eye className="w-4 h-4" />
              </button>
                <button
                  type="button"
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                  title="Download"
                  onClick={async () => {
                    if (!doc.path) return
                    const { data, error } = await supabase.storage
                      .from('fin-documents')
                      .createSignedUrl(doc.path, 60)
                    if (error) {
                      console.error('Failed to generate download URL', error.message)
                      return
                    }
                    const link = document.createElement('a')
                    link.href = data.signedUrl
                    link.download = doc.name
                    link.click()
                  }}
                >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export default DocumentAttachment
