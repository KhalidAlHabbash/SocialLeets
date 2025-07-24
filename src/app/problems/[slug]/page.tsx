import { redirect } from 'next/navigation';

export default function ProblemRedirect({ params }: { params: { slug: string } }) {
  redirect(`/rooms/${params.slug}`);
  return null;
}
