"use client";

import Notifications from "./Notifications";
import { Shield, Download, History, Upload } from "lucide-react";

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Financial Management System</h2>
        </div>
        <div className="flex items-center gap-4">
          {/* System-wide features */}
          <div className="flex items-center gap-2">
            <button
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              title="Document Attachment"
            >
              <Upload className="w-5 h-5" />
            </button>
            <button
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              title="Export PDF/Excel"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              title="Audit Trail"
            >
              <History className="w-5 h-5" />
            </button>
            <button
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              title="Security Settings"
            >
              <Shield className="w-5 h-5" />
            </button>
          </div>
          <Notifications />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              A
            </div>
            <span className="text-sm text-gray-700">Admin User</span>
          </div>
        </div>
      </div>
    </header>
  );
}
