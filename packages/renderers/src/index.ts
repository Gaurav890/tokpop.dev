export type ProfileCard = {
  username: string;
  score: number | null;
  activeDays: number;
  streakDays: number;
  tokens: number;
  tokenBreakdown: Array<{ label: string; tokens: number }>;
  providers: string[];
  archetype: { emoji: string; title: string };
  updatedAt: string;
};

const escapeXml = (value: string) => value.replace(/[<>&'\"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char]!);

function compact(value: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function updatedLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
}

function providerLines(providers: string[], maxCharacters = 40): string[] {
  if (!providers.length) return ['No coding source yet'];
  const lines: string[] = [];
  for (const provider of providers) {
    const current = lines.at(-1);
    if (!current || `${current} · ${provider}`.length > maxCharacters) lines.push(provider);
    else lines[lines.length - 1] = `${current} · ${provider}`;
  }
  return lines;
}

export function renderProfileCard(profile: ProfileCard, theme: 'light' | 'dark' = 'light'): string {
  const dark = theme === 'dark';
  const background = dark ? '#101426' : '#ffffff';
  const backgroundEnd = dark ? '#181d35' : '#eef1ff';
  const foreground = dark ? '#f8f9ff' : '#111527';
  const muted = dark ? '#a7b0ca' : '#69738a';
  const line = dark ? '#343d62' : '#d5dbee';
  const panel = dark ? '#151a30' : '#f7f8ff';
  const accent = '#4962ff';
  const spark = dark ? '#9df5b4' : '#186b35';
  const score = profile.score == null ? '—' : String(profile.score);
  const providers = providerLines(profile.providers);
  const tokenRows = profile.tokenBreakdown.length ? profile.tokenBreakdown : [{ label: 'No source reports tokens', tokens: 0 }];
  const tokenGap = tokenRows.length > 4 ? 14 : 19;
  const tokenSplitText = tokenRows.map((item, index) => `<text x="360" y="${121 + index * tokenGap}" font-family="Arial,sans-serif" font-size="10" font-weight="650" fill="${foreground}">${escapeXml(item.label)}</text><text x="612" y="${121 + index * tokenGap}" text-anchor="end" font-family="ui-monospace,monospace" font-size="10" font-weight="750" fill="${foreground}">${escapeXml(compact(item.tokens))}</text>`).join('');
  const providerText = providers.map((providerLine, index) => `<text x="360" y="${238 + index * 13}" font-family="Arial,sans-serif" font-size="8.5" font-weight="650" fill="${muted}">${escapeXml(providerLine)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="282" role="img" aria-label="AI Native Profile for ${escapeXml(profile.username)}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${background}"/><stop offset="1" stop-color="${backgroundEnd}"/></linearGradient><pattern id="grid" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0H0V16" fill="none" stroke="${line}" stroke-opacity=".16"/></pattern></defs>
  <rect width="640" height="282" rx="18" fill="url(#bg)" stroke="${line}"/><rect width="640" height="282" rx="18" fill="url(#grid)"/>
  <rect x="22" y="20" width="48" height="34" rx="7" fill="${accent}"/><text x="46" y="41" text-anchor="middle" font-family="ui-monospace,monospace" font-size="10" font-weight="800" fill="#ffffff">anp/</text>
  <text x="80" y="35" font-family="Arial,sans-serif" font-size="9" font-weight="750" letter-spacing="1.4" fill="${muted}">AI BUILD CARD</text><text x="80" y="53" font-family="Arial,sans-serif" font-size="15" font-weight="750" fill="${foreground}">@${escapeXml(profile.username)}</text>
  <rect x="553" y="21" width="65" height="24" rx="12" fill="${panel}" stroke="${line}"/><circle cx="568" cy="33" r="4" fill="${spark}"/><text x="578" y="36" font-family="ui-monospace,monospace" font-size="8" font-weight="800" fill="${muted}">LIVE</text>
  <text x="22" y="88" font-family="Arial,sans-serif" font-size="19">${escapeXml(profile.archetype.emoji)}</text><text x="51" y="87" font-family="Arial,sans-serif" font-size="12" font-weight="800" letter-spacing=".8" fill="${foreground}">${escapeXml(profile.archetype.title.toUpperCase())}</text>
  <text x="22" y="150" font-family="Arial,sans-serif" font-size="49" font-weight="800" letter-spacing="-2.5" fill="${accent}">${escapeXml(compact(profile.tokens))}</text><text x="22" y="170" font-family="Arial,sans-serif" font-size="10" font-weight="650" letter-spacing=".6" fill="${muted}">AI CODING TOKENS</text>
  <rect x="22" y="190" width="288" height="53" rx="9" fill="${panel}" stroke="${line}"/>
  <text x="37" y="207" font-family="Arial,sans-serif" font-size="7.5" font-weight="750" letter-spacing=".7" fill="${muted}">BUILD LEVEL</text><text x="37" y="230" font-family="Arial,sans-serif" font-size="18" font-weight="800" fill="${foreground}">${score}</text>
  <text x="124" y="207" font-family="Arial,sans-serif" font-size="7.5" font-weight="750" letter-spacing=".7" fill="${muted}">ACTIVE DAYS</text><text x="124" y="230" font-family="Arial,sans-serif" font-size="18" font-weight="800" fill="${foreground}">${profile.activeDays}</text>
  <text x="225" y="207" font-family="Arial,sans-serif" font-size="7.5" font-weight="750" letter-spacing=".7" fill="${muted}">STREAK</text><text x="225" y="230" font-family="Arial,sans-serif" font-size="18" font-weight="800" fill="${foreground}">${profile.streakDays}d</text>
  <line x1="334" y1="74" x2="334" y2="255" stroke="${line}"/>
  <text x="360" y="91" font-family="Arial,sans-serif" font-size="9" font-weight="800" letter-spacing=".9" fill="${muted}">TOOL LOADOUT</text>${tokenSplitText}
  <text x="360" y="219" font-family="Arial,sans-serif" font-size="8" font-weight="800" letter-spacing=".8" fill="${muted}">ALL CONNECTED</text>${providerText}
  <text x="22" y="266" font-family="ui-monospace,monospace" font-size="7.5" font-weight="700" fill="${muted}">SOURCE-LABELLED · UPDATED ${escapeXml(updatedLabel(profile.updatedAt).toUpperCase())}</text><text x="618" y="266" text-anchor="end" font-family="ui-monospace,monospace" font-size="8" font-weight="800" fill="${accent}">MAKE YOURS ↗</text>
  </svg>`;
}

export function renderBadge(score: number | null): string {
  const value = score == null ? 'unranked' : String(score);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="154" height="28" role="img" aria-label="AI build level ${value}"><rect width="154" height="28" rx="6" fill="#101426"/><rect x="106" width="48" height="28" rx="6" fill="#4962ff"/><text x="10" y="18" font-family="Arial,sans-serif" font-size="11" fill="#f7f8fb">AI build level</text><text x="130" y="18" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="#fff">${value}</text></svg>`;
}

export function renderSocialCard(profile: ProfileCard, format: 'og' | 'square' | 'story', theme: 'light' | 'dark' = 'dark'): string {
  const [width, height] = format === 'og' ? [1200, 630] : format === 'square' ? [1080, 1080] : [1080, 1920];
  const dark = theme === 'dark';
  const background = dark ? '#171b2c' : '#f4f6fa';
  const foreground = dark ? '#f7f8fb' : '#121521';
  const muted = dark ? '#aab2c8' : '#697181';
  const accent = dark ? '#8294ff' : '#3451ff';
  const score = profile.score == null ? '—' : String(profile.score);
  const tokenSplit = profile.tokenBreakdown.map((item) => `${item.label} ${compact(item.tokens)}`).join(' · ') || 'No source reports tokens';
  const centerY = Math.round(height * .48);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" role="img" aria-label="AI Native Profile for ${escapeXml(profile.username)}">
  <rect width="${width}" height="${height}" fill="${background}"/><circle cx="${Math.round(width * .82)}" cy="${Math.round(height * .16)}" r="${Math.round(width * .24)}" fill="${accent}" opacity=".12"/>
  <rect x="${Math.round(width * .08)}" y="${Math.round(height * .08)}" width="74" height="74" rx="10" fill="${accent}"/><text x="${Math.round(width * .08) + 37}" y="${Math.round(height * .08) + 46}" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="19" font-weight="700" fill="#ffffff">anp/</text>
  <text x="${Math.round(width * .08) + 96}" y="${Math.round(height * .08) + 31}" font-family="Arial,sans-serif" font-size="20" font-weight="700" letter-spacing="2" fill="${muted}">AI NATIVE PROFILE</text><text x="${Math.round(width * .08) + 96}" y="${Math.round(height * .08) + 62}" font-family="Arial,sans-serif" font-size="25" font-weight="700" fill="${foreground}">@${escapeXml(profile.username)}</text>
  <text x="${Math.round(width * .08)}" y="${centerY - 90}" font-family="Arial,sans-serif" font-size="30" fill="${foreground}">${escapeXml(profile.archetype.emoji)} ${escapeXml(profile.archetype.title)}</text>
  <text x="${Math.round(width * .08)}" y="${centerY}" font-family="Arial,sans-serif" font-size="${format === 'story' ? 220 : 170}" font-weight="700" letter-spacing="-10" fill="${accent}">${escapeXml(compact(profile.tokens))}</text><text x="${Math.round(width * .08)}" y="${centerY + 58}" font-family="Arial,sans-serif" font-size="25" fill="${muted}">AI CODING TOKENS</text>
  <text x="${Math.round(width * .68)}" y="${centerY - 18}" font-family="Arial,sans-serif" font-size="64" font-weight="700" fill="${foreground}">${score}</text><text x="${Math.round(width * .68)}" y="${centerY + 22}" font-family="Arial,sans-serif" font-size="19" fill="${muted}">BUILD LEVEL</text>
  <text x="${Math.round(width * .08)}" y="${height - Math.round(height * .18)}" font-family="Arial,sans-serif" font-size="24" fill="${foreground}">${profile.activeDays} active days  ·  ${profile.streakDays} day streak</text><text x="${Math.round(width * .08)}" y="${height - Math.round(height * .14)}" font-family="Arial,sans-serif" font-size="19" fill="${foreground}">TOOL LOADOUT · ${escapeXml(tokenSplit)}</text><text x="${Math.round(width * .08)}" y="${height - Math.round(height * .1)}" font-family="Arial,sans-serif" font-size="19" fill="${muted}">${escapeXml(profile.providers.join(' · ') || 'GitHub starter card')} · MAKE YOURS</text>
  </svg>`;
}
