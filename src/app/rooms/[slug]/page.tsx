import VoiceRoom from '@/components/VoiceRoom';

export default async function RoomPage({ params }: { params: { slug: string } }) {
    const roomSlug = await params.slug
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">

      <VoiceRoom slug={roomSlug} />
    </div>
  );
}
