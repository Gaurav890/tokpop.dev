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
    return <main className="marketing-page dashboard-empty-page"><SiteHeader user={user}/><section className="narrow-hero"><p className="eyebrow">Your private build console</p><h1>Your card is ready for its stats.</h1><p>One guided command finds every supported coding tool and brings the card to life after the first sync.</p><Link className="primary-link dashboard-signin" href="/share?onboarding=1">Power up my card →</Link></section></main>;
  }
  return <main className="marketing-page dashboard-empty-page"><SiteHeader/><section className="narrow-hero"><p className="eyebrow">Your private build console</p><h1>One live card. Your whole build story.</h1><p>Start with GitHub, add source-labelled coding activity, and choose exactly when the world gets to see it.</p><Link className="primary-link dashboard-signin" href="/api/auth/github/start?return_to=/share?onboarding=1">Make my card →</Link></section></main>;
}
