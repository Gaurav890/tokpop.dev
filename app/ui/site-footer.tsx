import Link from './native-link';

export function SiteFooter() {
  return <footer className="site-footer">
    <div className="footer-brand"><span className="brand-mark">tokpop.dev</span><span><small>Make your AI build story visible.</small></span></div>
    <nav aria-label="Footer navigation">
      <Link href="/leaderboard">Leaderboard</Link>
      <Link href="/methodology">How scoring works</Link>
      <a href="https://github.com/Gaurav890/ai-native-profile" target="_blank" rel="noreferrer">Open-source repo ↗</a>
    </nav>
    <p>Source-labelled activity. No prompts, code, or credentials.</p>
  </footer>;
}
