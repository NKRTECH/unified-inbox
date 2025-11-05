import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function Home() {
  const incomingHeaders = await headers();
  const requestHeaders = new Headers();
  incomingHeaders.forEach((value, key) => {
    requestHeaders.append(key, value);
  });

  const session = await auth.api.getSession({ headers: requestHeaders });

  if (session?.user) {
    redirect('/inbox');
  }

  redirect('/login');
}
