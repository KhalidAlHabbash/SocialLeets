import VoiceRoom from '@/components/VoiceRoom';
import ParticipantCounter from '../../../components/ParticipantCounter';
import localFont from 'next/font/local';
import { supabase } from '../../../../lib/supabase';

const superFunky = localFont({
  src: '../../../../public/super-funky-font/SuperFunky-lgmWw.ttf',
  display: 'swap',
});

const MAX_PARTICIPANTS = 60;

export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  // Check current participant count
  const { data: roomUsers, error } = await supabase
    .from('room_users')
    .select('id')
    .eq('slug', slug);

  const currentParticipants = roomUsers?.length || 0;
  const isRoomFull = currentParticipants >= MAX_PARTICIPANTS;

  if (isRoomFull) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center" style={{ background: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)' }}>
        <div className="text-center">
          <h1 className={`text-8xl font-extrabold text-white drop-shadow-lg mb-8 ${superFunky.className}`}>
            Room Full!
          </h1>
          <p className={`text-3xl font-bold text-white/90 drop-shadow-md ${superFunky.className}`}>
            This room has reached the maximum capacity of {MAX_PARTICIPANTS} participants.
          </p>
          <p className={`text-xl font-bold text-white/80 drop-shadow-md mt-4 ${superFunky.className}`}>
            Please try again later.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen w-full flex flex-col" style={{ background: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)' }}>
      <header className="w-full py-4 px-4 sticky top-0 z-10 flex justify-center">
        <div className="flex items-baseline gap-2">
          <h1 className={`text-6xl font-extrabold text-white drop-shadow-sm ${superFunky.className}`}>
            Room for: {slug}
          </h1>
          <ParticipantCounter slug={slug} maxParticipants={MAX_PARTICIPANTS} className={superFunky.className} />
        </div>
      </header>
      <main className="flex-1 px-4 pb-4">
        <VoiceRoom slug={slug} maxParticipants={MAX_PARTICIPANTS} />
      </main>
    </div>
  );
}
