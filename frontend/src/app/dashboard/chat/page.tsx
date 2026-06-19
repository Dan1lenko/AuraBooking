'use client';

import React from 'react';
import { MessageSquare } from 'lucide-react';

export default function ChatPlaceholderPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-50/20">
      <div className="w-16 h-16 bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 text-blue-600 rounded-full flex items-center justify-center mb-4 shadow-sm relative">
        <MessageSquare className="w-6 h-6 animate-pulse" />
        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-600 rounded-full border-2 border-white animate-ping" />
        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-600 rounded-full border-2 border-white" />
      </div>
      <h3 className="text-sm font-bold text-slate-800">Your Messages</h3>
      <p className="text-slate-400 text-xs mt-1.5 max-w-xs leading-relaxed">
        Select a conversation from the sidebar to view historical messages and start chatting in real-time.
      </p>
    </div>
  );
}
