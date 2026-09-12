import { SiteHeader } from '../ui/site-header';

const rows = [
  ['Consistency', '30', '20 points for active coding days over 90 days (cap: 45); 10 for longest 90-day streak (cap: 14).'],
  ['Workflow depth', '25', 'Tool-using session rate (10), median tool calls/session (8), and advanced workflow sessions (7).'],
  ['Provider breadth', '15', '3 points for each active supported coding provider, up to five.'],
  ['Delivery', '30', 'commits + 3× merged PRs + 2× reviews + 5× releases, logarithmically normalized at 200 points.'],
];

export default function MethodologyPage() { return <main className="marketing-page"><SiteHeader/><section className="narrow-hero"><p className="eyebrow">Open methodology · v1</p><h1>A score designed around practice and delivery—not spending.</h1><p>The AI Workflow Index is deterministic, inspectable, and implemented in the open-source scoring package. Raw token volume never affects the score.</p></section><section className="method-table">{rows.map(([name, points, detail]) => <article key={name}><strong>{points}</strong><div><h2>{name}</h2><p>{detail}</p></div></article>)}</section><section className="formula-card"><p className="eyebrow">Eligibility</p><h2>GitHub + 30 covered days</h2><p>A ranked score requires a connected GitHub identity and at least 30 covered coding days. Otherwise the profile says “insufficient coverage.” Conversation imports, MCP observations, manual entries, and estimated metrics are always excluded.</p><code>deliveryPoints = commits + 3×mergedPRs + 2×reviews + 5×releases</code></section><section className="plain-section"><h2>Interpretation</h2><p>The score demonstrates attributable adoption of AI-assisted workflows and shipping cadence. It does not establish developer competence, code quality, business impact, or whether any individual commit was AI-generated.</p></section></main>; }
