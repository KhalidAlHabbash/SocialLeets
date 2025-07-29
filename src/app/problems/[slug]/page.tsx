import { redirect } from 'next/navigation';

// Redirects /problems/[slug] to /rooms/[slug]
export default async function ProblemRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/rooms/${slug}`);
}
