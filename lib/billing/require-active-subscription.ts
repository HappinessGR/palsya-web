import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { hasActiveAccess } from './trial-subscription.service';

export async function requireActiveSubscription() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const active = await hasActiveAccess(userId);
  if (!active) redirect('/pricing?reason=trial_ended');
}
