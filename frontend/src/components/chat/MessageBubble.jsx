// src/components/chat/MessageBubble.jsx
// Design matches Home.jsx / RideCard.jsx conventions: rounded-2xl, blue-600 primary,
// amber for the moderation system-warning pill (Milestone 5 tie-in).

import React from 'react';
import Icon from '../../components/ui/Icon.jsx';

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export default function MessageBubble({ message, isOwn }) {
  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-3">
        <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-100 text-amber-700 text-xs font-medium px-3 py-1.5 rounded-full max-w-[85%] text-center">
          <Icon name="Info" size="xs" className="text-amber-500 flex-shrink-0" />
          {message.text}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
          isOwn
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-900 rounded-bl-sm border border-gray-100'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
        <span className={`block text-[10px] mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-400'}`}>
          {formatTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
}