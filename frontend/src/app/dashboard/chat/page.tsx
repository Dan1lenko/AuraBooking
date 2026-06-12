'use client';

import React from 'react';
import { MessageSquare } from 'lucide-react';

export default function ChatPlaceholderPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4 shadow-inner animate-pulse">
        <MessageSquare className="w-8 h-8" />
      </div>
      <h3 className="text-base font-bold text-slate-800">Your Messages</h3>
      <p className="text-slate-400 text-xs mt-1 max-w-xs leading-relaxed">
        Select a conversation from the sidebar to view historical messages and start chatting in real-time.
      </p>
    </div>
  );
}
