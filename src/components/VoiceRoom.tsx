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

interface UserPosition {
  user: RoomUser;
  idx: number;
  x: number;
  y: number;
}

function getRandomUsername() {
  return `Solver#${Math.floor(1000 + Math.random() * 9000)}`;
}

export default function VoiceRoom({ slug, maxParticipants }: { slug: string, maxParticipants: number   }) {
  const [username, setUsername] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [roomUsers, setRoomUsers] = useState<RoomUser[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [locallyMutedUsers, setLocallyMutedUsers] = useState<Set<string>>(new Set());
  const roomRef = useRef<Room | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
  const [isRoomFull, setIsRoomFull] = useState(false);

  const MAX_PARTICIPANTS = maxParticipants;

  useEffect(() => {
    setUsername(getRandomUsername());
  }, []);

  useEffect(() => {
    const requestMicrophonePermission = async () => {
      try {
        // Step 1: Log all available audio input devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        console.log('[Audio Inputs]', audioInputs);
  
        // Step 2: Try to find a headset mic (optional condition, tweak as needed)
        const preferredMic = audioInputs.find(device =>
          device.label.toLowerCase().includes('airpods') ||
          device.label.toLowerCase().includes('bluetooth') ||
          device.label.toLowerCase().includes('hands-free') ||
          device.label.toLowerCase().includes('headset')
        );
  
        // Step 3: Request microphone stream using preferred mic or fallback to default
        await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: preferredMic?.deviceId || undefined
          }
        });
  
        console.log('Microphone permission granted');
  
      } catch (error) {
        console.error('Microphone permission error:', error);
      }
    };
  
    requestMicrophonePermission();
    // re-run when media devices change
    navigator.mediaDevices.addEventListener('devicechange', requestMicrophonePermission);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', requestMicrophonePermission);
    };
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

        // Listen for active speakers, this handles speaking detection automatically
        newRoom.on('activeSpeakersChanged', (speakers) => {
          setSpeakingUsers(new Set(speakers.map(speaker => speaker.identity)));
        });

        newRoom.on('trackSubscribed', (track, publication, participant) => {
          if (track.kind === 'audio') {
            const el = document.createElement('audio');
            el.id = `audio-${participant.identity}`;
            el.autoplay = true;
            el.style.display = 'none';
            track.attach(el);
            document.body.appendChild(el);
            
            // Store reference to audio element
            audioElementsRef.current.set(participant.identity, el);
            
            // Apply local mute state if this user is locally muted
            if (locallyMutedUsers.has(participant.identity)) {
              el.volume = 0;
            }
          }
        });

        newRoom.on('trackUnsubscribed', (track, publication, participant) => {
          const el = document.getElementById(`audio-${participant.identity}`);
          if (el) el.remove();
          audioElementsRef.current.delete(participant.identity);
        });

        await newRoom.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, token);

        const audioTrack = await createLocalAudioTrack();
        await newRoom.localParticipant.publishTrack(audioTrack);

        console.log('Connected and published local audio');
      } catch (error) {
        console.error('LiveKit connection error:', error);
      }
    };

    connectToRoom();

    const disconnectAndCleanUp = async () => {
      try {
        roomRef.current?.disconnect();
        if (userId && slug) {
          await fetch('/api/disconnect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, slug }),
          });
        }
      } catch (err) {
        console.error("Disconnect cleanup error:", err);
      }
    };

    window.addEventListener('beforeunload', () => {
        if (userId && slug) {
          const payload = JSON.stringify({ user_id: userId, slug });
          navigator.sendBeacon('/api/disconnect', new Blob([payload], { type: 'application/json' }));
        }
      });
      

    return () => {
      window.removeEventListener('beforeunload', disconnectAndCleanUp);
      disconnectAndCleanUp();
    };
  }, [token, userId, slug]);

  // Effect to handle local mute changes for existing audio elements
  useEffect(() => {
    locallyMutedUsers.forEach((username) => {
      const audioEl = audioElementsRef.current.get(username);
      if (audioEl) {
        audioEl.volume = 0;
      }
    });
    
    // Unmute users that are no longer in the locally muted set
    audioElementsRef.current.forEach((audioEl, username) => {
      if (!locallyMutedUsers.has(username)) {
        audioEl.volume = 1;
      }
    });
  }, [locallyMutedUsers]);

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
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'room_users', filter: `slug=eq.${slug}`
      }, (payload) => {
        setRoomUsers((prev) =>
          prev.filter((user) => user.id !== payload.old.id)
        );
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [slug]);

  useEffect(() => {
    const joinRoom = async () => {
      if (!username || !userId) return;
      
      // Check current participant count before joining
      const { data: existingUsers } = await supabase
        .from('room_users')
        .select('id')
        .eq('slug', slug);
      
      const currentCount = existingUsers?.length || 0;
      
      // Check if room is full and user is not already in the room
      const { data: userExists } = await supabase
        .from('room_users')
        .select('id')
        .eq('user_id', userId)
        .eq('slug', slug)
        .maybeSingle();

      if (!userExists && currentCount >= MAX_PARTICIPANTS) {
        setIsRoomFull(true);
        return;
      }

      if (!userExists && currentCount < MAX_PARTICIPANTS) {
        await supabase.from('room_users').insert({ user_id: userId, username, muted, slug });
      }
    };
    joinRoom();
  }, [username, userId, slug]);

  const handleMuteToggle = async () => {
    setMuted((m) => !m);
    if (userId) {
      await supabase.from('room_users').update({ muted: !muted }).eq('user_id', userId).eq('slug', slug);
    }
  };

  const handleLocalMuteToggle = (targetUsername: string) => {
    setLocallyMutedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(targetUsername)) {
        newSet.delete(targetUsername);
        // Unmute audio
        const audioEl = audioElementsRef.current.get(targetUsername);
        if (audioEl) {
          audioEl.volume = 1;
        }
      } else {
        newSet.add(targetUsername);
        // Mute audio
        const audioEl = audioElementsRef.current.get(targetUsername);
        if (audioEl) {
          audioEl.volume = 0;
        }
      }
      return newSet;
    });
  };

  if (isRoomFull) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
          <h2 className="text-4xl font-bold text-white mb-4">Room Full!</h2>
          <p className="text-xl text-white/90 mb-2">
            This room has reached the maximum capacity of {MAX_PARTICIPANTS} participants.
          </p>
          <p className="text-lg text-white/80">
            Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <div className="relative w-full h-[calc(100vh-120px)]">
        {(() => {
          // Calculate grid dimensions based on screen size and user count
          const containerWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
          const containerHeight = typeof window !== 'undefined' ? window.innerHeight - 120 : 600;
          
          // User bubble size + padding
          const bubbleSize = 100;
          const cols = Math.floor((containerWidth * 0.88) / bubbleSize);
          const rows = Math.floor((containerHeight * 0.84) / bubbleSize);
          
          // Create positions array to track occupied spots
          const occupiedPositions = new Set<string>();
          const userPositions: UserPosition[] = [];
          
          // Hash function for consistent randomization
          const hash = (str: string, salt: number = 0) => {
            let hash = salt;
            for (let i = 0; i < str.length; i++) {
              const char = str.charCodeAt(i);
              hash = ((hash << 5) - hash) + char;
              hash = hash & hash;
            }
            return Math.abs(hash);
          };
          
          // Assign positions to users
          roomUsers.forEach((user, idx) => {
            const userSeed = user.id || `user-${idx}`;
            let attempts = 0;
            let gridX, gridY, posKey;
            
            // Try to find an unoccupied position
            do {
              const hashValue = hash(userSeed, attempts);
              gridX = hashValue % cols;
              gridY = Math.floor(hashValue / cols) % rows;
              posKey = `${gridX}-${gridY}`;
              attempts++;
            } while (occupiedPositions.has(posKey) && attempts < 100);
            
            // If all attempts failed, use a fallback position
            if (attempts >= 100) {
              gridX = idx % cols;
              gridY = Math.floor(idx / cols) % rows;
              posKey = `${gridX}-${gridY}`;
            }
            
            occupiedPositions.add(posKey);
            
            // Add slight random offset within grid cell for that natural look
            const offsetSeed = hash(userSeed, 999);
            const offsetX = ((offsetSeed % 40) - 20) / 100; 
            const offsetY = (((offsetSeed * 3) % 40) - 20) / 100;
            
            // Convert grid position to percentage
            const x = 6 + (gridX / (cols - 1)) * 88 + offsetX * (88 / cols);
            const y = 8 + (gridY / (rows - 1)) * 84 + offsetY * (84 / rows);
            
            userPositions.push({
              user,
              idx,
              x: Math.max(6, Math.min(94, x)),
              y: Math.max(8, Math.min(92, y))
            });
          });
          
          return userPositions.map(({ user, idx, x, y }) => (
            <div
              key={user.id || idx}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-in-out"
              style={{
                left: `${x}%`,
                top: `${y}%`,
              }}
            >
              <UserBubble 
                username={user.username} 
                muted={user.muted} 
                isLocallyMuted={locallyMutedUsers.has(user.username)}
                isCurrentUser={user.user_id === userId}
                isSpeaking={speakingUsers.has(user.username)}
                onToggleMute={handleMuteToggle}
                onToggleLocalMute={() => handleLocalMuteToggle(user.username)}
              />
            </div>
          ));
        })()}
      </div>
    </div>
  );
}