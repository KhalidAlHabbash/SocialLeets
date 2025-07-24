import VoiceRoom from '@/components/VoiceRoom';
import localFont from 'next/font/local';

const superFunky = localFont({
  src: '../../../../public/super-funky-font/SuperFunky-lgmWw.ttf',
  display: 'swap',
});

export default function RoomPage({ params }: { params: { slug: string } }) {
  return (
    <div className="min-h-screen w-full flex flex-col" style={{ background: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)' }}>
      <header className="w-full py-6 px-4 sticky top-0 z-10 flex justify-center">
        <h1 className={`text-7xl font-extrabold text-white drop-shadow-sm ${superFunky.className}`}>Room for: {params.slug}</h1>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center">
        <VoiceRoom slug={params.slug} />
      </main>
    </div>
  );
}
