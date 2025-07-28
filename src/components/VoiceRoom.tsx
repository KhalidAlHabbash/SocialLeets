"use client"
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import UserBubble from './UserBubble';
import { Room, createLocalAudioTrack } from 'livekit-client';

interface RoomUser {
  id: string;
  user_id: string;
  username: string;
  muted: boolean;
  joined_at: string;
  slug: string;
}

function getRandomUsername() {
  return `Solver#${Math.floor(1000 + Math.random() * 9000)}`;
}

export default function VoiceRoom({ slug }: { slug: string }) {
  const [username, setUsername] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [roomUsers, setRoomUsers] = useState<RoomUser[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    setUsername(getRandomUsername());
  }, []);

  useEffect(() => {
    const requestMicrophonePermission = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Microphone permission granted');
      } catch (error) {
        console.error('Microphone permission error:', error);
      }
    };
    requestMicrophonePermission();
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

  useEffect(() => {
    const fetchToken = async () => {
      if (!username) return;
      try {
        const response = await fetch('/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomName: slug, username })
        });
        const data = await response.json();
        if (data.token) setToken(data.token);
      } catch (error) {
        console.error('Error fetching token:', error);
      }
    };
    fetchToken();
  }, [username, slug]);

  useEffect(() => {
    if (!token) return;

    const connectToRoom = async () => {
      try {
        const newRoom = new Room({ adaptiveStream: true, dynacast: true });
        roomRef.current = newRoom;

        newRoom.on('participantConnected', (participant) => {
          console.log('Participant connected:', participant.identity);
        });

        newRoom.on('trackSubscribed', (track, publication, participant) => {
          if (track.kind === 'audio') {
            const el = document.createElement('audio');
            el.id = `audio-${participant.identity}`;
            el.autoplay = true;
            el.style.display = 'none';
            track.attach(el);
            document.body.appendChild(el);
          }
        });

        newRoom.on('trackUnsubscribed', (track, publication, participant) => {
          const el = document.getElementById(`audio-${participant.identity}`);
          if (el) el.remove();
        });

        await newRoom.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, token);

        const audioTrack = await createLocalAudioTrack();
        await newRoom.localParticipant.publishTrack(audioTrack);

        const localAudio = document.createElement('audio');
        localAudio.autoplay = true;
        localAudio.muted = true;
        localAudio.style.display = 'none';
        audioTrack.attach(localAudio);
        document.body.appendChild(localAudio);

        console.log('Connected and published local audio');
      } catch (error) {
        console.error('LiveKit connection error:', error);
      }
    };

    connectToRoom();

    return () => {
      roomRef.current?.disconnect();
    };
  }, [token]);

  useEffect(() => {
    if (!roomRef.current) return;
    roomRef.current.localParticipant.setMicrophoneEnabled(!muted);
  }, [muted]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('room_users')
        .select('*')
        .eq('slug', slug);
      if (data) setRoomUsers(data);
    };
    fetchUsers();
  }, [slug]);

  useEffect(() => {
    const channel = supabase
      .channel('room_users-realtime')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'room_users', filter: `slug=eq.${slug}`
      }, (payload) => {
        setRoomUsers((prev) => [...prev, payload.new as RoomUser]);
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'room_users', filter: `slug=eq.${slug}`
      }, (payload) => {
        setRoomUsers((prev) => prev.map((user) =>
          user.id === payload.new.id ? { ...user, muted: payload.new.muted } : user
        ));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [slug]);

  useEffect(() => {
    const joinRoom = async () => {
      if (!username || !userId) return;
      const { data: existing } = await supabase
        .from('room_users')
        .select('id')
        .eq('user_id', userId)
        .eq('slug', slug)
        .maybeSingle();

      if (!existing) {
        await supabase.from('room_users').insert({ user_id: userId, username, muted, slug });
      }
    };
    joinRoom();
  }, [username, userId, slug, muted]);

  useEffect(() => {
    if (!userId || !slug) return;
    const handleLeave = async () => {
      await supabase.from('room_users').delete().eq('user_id', userId).eq('slug', slug);
    };

    window.addEventListener('beforeunload', handleLeave);
    return () => {
      handleLeave();
      window.removeEventListener('beforeunload', handleLeave);
    };
  }, [userId, slug]);

  const handleMuteToggle = async () => {
    setMuted((m) => !m);
    if (userId) {
      await supabase.from('room_users').update({ muted: !muted }).eq('user_id', userId).eq('slug', slug);
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
