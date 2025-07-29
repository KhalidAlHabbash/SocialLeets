import { redirect } from 'next/navigation';

export default async function ProblemCatchAllRedirect({ 
  params 
}: { 
  params: Promise<{ slug: string; rest: string[] }> 
}) {
  const { slug } = await params;
  redirect(`/rooms/${slug}`);
} 