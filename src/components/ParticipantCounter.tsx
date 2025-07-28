"use client"
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface ParticipantCounterProps {
  slug: string;
  maxParticipants: number;
  className?: string;
}

export default function ParticipantCounter({ slug, maxParticipants, className }: ParticipantCounterProps) {
  const [participantCount, setParticipantCount] = useState(0);

  useEffect(() => {
    // Initial fetch
    const fetchCount = async () => {
      const { data } = await supabase
        .from('room_users')
        .select('id')
        .eq('slug', slug);
      setParticipantCount(data?.length || 0);
    };
    fetchCount();

    // Real-time subscription
    const channel = supabase
      .channel('participant-counter')
      .on('postgres_changes', {
        event: 'INSERT', 
        schema: 'public', 
        table: 'room_users', 
        filter: `slug=eq.${slug}`
      }, () => {
        setParticipantCount(prev => prev + 1);
      })
      .on('postgres_changes', {
        event: 'DELETE', 
        schema: 'public', 
        table: 'room_users', 
        filter: `slug=eq.${slug}`
      }, () => {
        setParticipantCount(prev => Math.max(0, prev - 1));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [slug]);

  return (
    <span className={`text-2xl font-bold text-white/80 drop-shadow-sm ${className}`}>
      ({participantCount}/{maxParticipants})
    </span>
  );
} 