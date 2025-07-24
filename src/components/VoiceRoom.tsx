"use client"
import { useState, useEffect } from 'react';
import UserBubble from './UserBubble';

function getRandomUsername() {
  return `Solver#${Math.floor(1000 + Math.random() * 9000)}`;
}

export default function VoiceRoom({ slug }: { slug: string }) {
  const [username, setUsername] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setUsername(getRandomUsername());
  }, []);

  // Only render when username is set (client-side)
  if (!username) return null;

  const users = [
    { username, muted },
    // In the future, add other users here
  ];

  return (
    <div className="flex flex-col items-center gap-8">
      <h2 className="text-2xl font-semibold">Voice Room: {slug}</h2>
      <div className="flex gap-4">
        {users.map((user, idx) => (
          <UserBubble key={idx} username={user.username} muted={user.muted} />
        ))}
      </div>
      <button
        className={`mt-6 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition ${muted ? 'opacity-50' : ''}`}
        onClick={() => setMuted((m) => !m)}
      >
        {muted ? 'Unmute' : 'Mute'}
      </button>
    </div>
  );
} 