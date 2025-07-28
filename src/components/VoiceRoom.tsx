"use client"
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import UserBubble from './UserBubble';
import { Room, AudioPreset } from 'livekit-client';

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
  const [room, setRoom] = useState<Room | null>(null);

  useEffect(() => {
    setUsername(getRandomUsername());
  }, []);

  // Request microphone permission on mount
  useEffect(() => {
    const requestMicrophonePermission = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          console.log('Requesting microphone permission...');
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 48000,
              channelCount: 1
            } 
          });
          console.log('Microphone permission granted');
          
          // List available audio devices
          const devices = await navigator.mediaDevices.enumerateDevices();
          const audioDevices = devices.filter(device => device.kind === 'audioinput');
          console.log('Available audio devices:', audioDevices);
        }
      } catch (error) {
        console.error('Microphone permission error:', error);
        if (error instanceof Error && error.name === 'NotAllowedError') {
          console.error('Microphone permission denied by user');
        }
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

  // Fetch LiveKit token when username is available
  useEffect(() => {
    const fetchToken = async () => {
      if (!username) return;
      
      console.log('Fetching token for:', { roomName: slug, username });
      
      try {
        const response = await fetch('/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomName: slug, username })
        });
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Response data:', data);
          
          if (data.token) {
            console.log('Token received, length:', data.token.length);
            setToken(data.token);
          } else {
            console.error('No token in response:', data);
          }
        } else {
          const errorData = await response.json();
          console.error('Failed to fetch token:', errorData);
        }
      } catch (error) {
        console.error('Error fetching token:', error);
      }
    };

    fetchToken();
  }, [username, slug]);

  // Connect to LiveKit room when token is available
  useEffect(() => {
    if (!token) return;

    const connectToRoom = async () => {
      try {
        const newRoom = new Room({
          adaptiveStream: true,
          dynacast: true
        });
        
        // Add event listeners for debugging
        newRoom.on('participantConnected', (participant) => {
          console.log('Participant connected:', participant.identity);
        });
        
        newRoom.on('participantDisconnected', (participant) => {
          console.log('Participant disconnected:', participant.identity);
        });
        
        newRoom.on('trackSubscribed', (track, publication, participant) => {
          console.log('Track subscribed:', track.kind, 'from', participant.identity);
          
          // Subscribe to audio tracks
          if (track.kind === 'audio') {
            const audioElement = document.createElement('audio');
            audioElement.id = `audio-${participant.identity}`;
            audioElement.autoplay = true;
            audioElement.style.display = 'none';
            document.body.appendChild(audioElement);
            
            track.attach(audioElement);
            console.log('Audio track attached for:', participant.identity);
            
            // Monitor audio quality
            track.on('ended', () => {
              console.log('Audio track ended for:', participant.identity);
            });
            
            track.on('muted', () => {
              console.log('Audio track muted for:', participant.identity);
            });
            
            track.on('unmuted', () => {
              console.log('Audio track unmuted for:', participant.identity);
            });
          }
        });
        
        newRoom.on('trackUnsubscribed', (track, publication, participant) => {
          console.log('Track unsubscribed:', track.kind, 'from', participant.identity);
          
          // Remove audio element when track is unsubscribed
          if (track.kind === 'audio') {
            const audioElement = document.getElementById(`audio-${participant.identity}`);
            if (audioElement) {
              audioElement.remove();
            }
          }
        });
        
        await newRoom.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, token);
        setRoom(newRoom);
        console.log('Connected to LiveKit room:', newRoom.name);
        console.log('Local participant:', newRoom.localParticipant.identity);
        console.log('Remote participants:', newRoom.numParticipants);
        
        // Publish local audio track
        try {
          await newRoom.localParticipant.setMicrophoneEnabled(true);
          console.log('Local microphone enabled and published');
        } catch (error) {
          console.error('Failed to enable microphone:', error);
        }
      } catch (error) {
        console.error('Failed to connect to LiveKit room:', error);
      }
    };

    connectToRoom();

    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, [token, room]);

  // Sync mute state with LiveKit
  useEffect(() => {
    if (!room) return;
    
    if (muted) {
      room.localParticipant.setMicrophoneEnabled(false);
    } else {
      room.localParticipant.setMicrophoneEnabled(true);
    }
  }, [muted, room]);

  // Fetch all users in the room on mount
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
          setRoomUsers((prev) => [...prev, payload.new as RoomUser]);
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
              user.id === payload.new.id ? { ...user, muted: (payload.new as RoomUser).muted } : user
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
  }, [username, userId, slug, muted]);

  useEffect(() => {
    if (!userId || !slug) return;

    const handleLeave = async () => {
      await supabase
        .from('room_users')
        .delete()
        .eq('user_id', userId)
        .eq('slug', slug);
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