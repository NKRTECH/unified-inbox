import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { auth } from '@/lib/auth';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const incomingHeaders = await headers();
  const requestHeaders = new Headers();
  incomingHeaders.forEach((value, key) => {
    requestHeaders.append(key, value);
  });

  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session?.user) {
    redirect('/login');
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}