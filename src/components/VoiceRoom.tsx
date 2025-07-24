"use client"
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import UserBubble from './UserBubble';

function getRandomUsername() {
  return `Solver#${Math.floor(1000 + Math.random() * 9000)}`;
}

export default function VoiceRoom({ slug }: { slug: string }) {
  const [username, setUsername] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [roomUsers, setRoomUsers] = useState<any[]>([]);

  useEffect(() => {
    setUsername(getRandomUsername());
  }, []);

  useEffect(() => {
    const signIn = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      let uid = session?.user?.id;
      if (!session) {
        const { data } = await supabase.auth.signInAnonymously();
        uid = data?.user?.id;
      }
      setUserId(uid ?? null);
    };
    signIn();
  }, []);

  // Fetch all users in the room on mount
  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('room_users')
        .select('*')
        .eq('slug', slug);
      if (data) setRoomUsers(data);
    };
    fetchUsers();
  }, [slug]);

  // Subscribe to new users joining the room
  useEffect(() => {
    const channel = supabase
      .channel('room_users-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_users',
          filter: `slug=eq.${slug}`,
        },
        (payload) => {
          setRoomUsers((prev) => [...prev, payload.new]);
        }
      )
        // Subscribe to changes for a users mute status to update UI
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'room_users',
          filter: `slug=eq.${slug}`,
        },
        (payload) => {
          setRoomUsers((prev) =>
            prev.map((user) =>
              user.id === payload.new.id ? { ...user, muted: payload.new.muted } : user
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [slug]);

  useEffect(() => {
    const joinRoom = async () => {
      if (!username || !userId) return;
      // Check if already in room to avoid duplicate insert
      const { data: existing } = await supabase
        .from('room_users')
        .select('id')
        .eq('user_id', userId)
        .eq('slug', slug)
        .maybeSingle();

      if (!existing) {
        await supabase.from('room_users').insert({
          user_id: userId,
          username,
          muted,
          slug,
        });
      }
    };
    joinRoom();
  }, [username, userId, slug]);

  const handleMuteToggle = async () => {
    setMuted((m) => !m);
    if (userId) {
      await supabase
        .from('room_users')
        .update({ muted: !muted })
        .eq('user_id', userId)
        .eq('slug', slug);
    }
  };


  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex gap-4">
        {roomUsers.map((user, idx) => (
          <UserBubble key={user.id || idx} username={user.username} muted={user.muted} />
        ))}
      </div>
      <button
        className={`mt-6 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition ${muted ? 'opacity-50' : ''}`}
        onClick={handleMuteToggle}
      >
        {muted ? 'Unmute' : 'Mute'}
      </button>
    </div>
  );
} 