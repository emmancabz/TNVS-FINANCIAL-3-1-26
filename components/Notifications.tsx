"use client";

import { Bell, X } from "lucide-react";
import { useState } from "react";

export default function Notifications() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications] = useState([
    { id: 1, message: "DV-2026-044 requires your approval", time: "5 mins ago", type: "approval" },
    { id: 2, message: "Budget alert: IT department over budget", time: "1 hour ago", type: "alert" },
    { id: 3, message: "Collection OR-2026-045 generated", time: "2 hours ago", type: "info" },
    { id: 4, message: "New message received", time: "3 hours ago", type: "info" },
    { id: 3, message: "Collection OR-2026-045 generated", time: "2 hours ago", type: "info" },
  ]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
      >
        <Bell className="w-5 h-5" />
        {notifications.length > 0 && (
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
        )}
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No notifications</div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                >
                  <p className="text-sm text-gray-900">{notif.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
