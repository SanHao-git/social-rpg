import { useState } from 'react';
import { PhaserGame } from './game/PhaserGame';
import { ChatBox } from './ui/ChatBox';
import { connectWithName } from './net/socket';

export default function App() {
  const [joined, setJoined] = useState(false);
  const [name, setName] = useState('');

  const join = () => {
    connectWithName(name.trim());
    setJoined(true);
  };

  if (!joined) {
    return (
      <div style={styles.center}>
        <div style={styles.card}>
          <h2 style={{ margin: 0 }}>Vào thế giới</h2>
          <input
            autoFocus
            value={name}
            maxLength={16}
            placeholder="Tên nhân vật"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && join()}
            style={styles.input}
          />
          <button onClick={join} style={styles.button}>
            Vào
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <PhaserGame />
      <ChatBox />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  center: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontFamily: 'sans-serif',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: 24,
    background: '#1d2330',
    borderRadius: 8,
    width: 260,
  },
  input: { padding: 8, fontSize: 16, borderRadius: 4, border: 'none' },
  button: {
    padding: 8,
    fontSize: 16,
    borderRadius: 4,
    border: 'none',
    background: '#4f9dff',
    color: '#fff',
    cursor: 'pointer',
  },
};