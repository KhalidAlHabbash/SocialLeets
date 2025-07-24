import { redirect } from 'next/navigation';

// Redirects user to room once "room" is appeneded to the start of the leetcode problem
export default function ProblemRedirect({ params }: { params: { slug: string } }) {
  redirect(`/rooms/${params.slug}`);
  return null;
}
