import { currentGitHubUser } from '../../lib/auth';
import { getPrivateProfile } from '../../lib/profile';
import { DashboardDemo } from '../page';
import { SiteHeader } from '../ui/site-header';
import Link from '../ui/native-link';

export const dynamic = 'force-dynamic';
export default async function DashboardPage() {
  const user = await currentGitHubUser();
  if (user) {
    const profile = await getPrivateProfile(user.userId);
    if (profile) return <DashboardDemo profile={profile}/>;
    return <main className="marketing-page"><SiteHeader user={user}/><section className="narrow-hero"><p className="eyebrow">Private cloud dashboard</p><h1>Your card is ready for live stats.</h1><p>One guided command connects every supported coding tool and refreshes the card after the first sync.</p><Link className="primary-link dashboard-signin" href="/share?onboarding=1">Open my card</Link></section></main>;
  }
  return <main className="marketing-page"><SiteHeader/><section className="narrow-hero"><p className="eyebrow">Private cloud dashboard</p><h1>Your AI build story. One live card.</h1><p>Connect GitHub, add source-labelled coding activity, and choose exactly when your card becomes public.</p><Link className="primary-link dashboard-signin" href="/api/auth/github/start?return_to=/share?onboarding=1">Make my card</Link></section></main>;
}
