import { redirect } from 'next/navigation';

export default async function ProblemRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/rooms/${slug}`);
}
