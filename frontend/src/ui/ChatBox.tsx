import { useState } from 'react';
import { EVENTS, type ChatRequest } from '../net/events';
import { socket } from '../net/socket';

export function ChatBox() {
  const [text, setText] = useState('');

  const send = () => {
    const t = text.trim();
    if (!t) return;
    const req: ChatRequest = { text: t };
    socket.emit(EVENTS.CHAT_SEND, req);
    setText('');
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 12,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <input
        value={text}
        maxLength={120}
        placeholder="Nhấn Enter để chat..."
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') send();
          if (e.key === 'Escape') (e.target as HTMLInputElement).blur();
        }}
        style={{
          pointerEvents: 'auto',
          width: 360,
          padding: 8,
          fontSize: 14,
          borderRadius: 4,
          border: 'none',
          background: 'rgba(0,0,0,0.6)',
          color: '#fff',
        }}
      />
    </div>
  );
}