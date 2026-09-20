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
  const punch = theme === 'dark';
  const background = punch ? '#f1ecff' : '#eaf4ff';
  const backgroundEnd = punch ? '#ffe8db' : '#e8fff6';
  const foreground = '#17182a';
  const muted = '#666d82';
  const line = '#17182a';
  const panel = '#fffdf8';
  const accent = punch ? '#5b43f5' : '#2359d8';
  const accentSoft = punch ? '#dfff73' : '#93efd5';
  const warm = punch ? '#ff805f' : '#ffbd68';
  const score = profile.score == null ? '—' : String(profile.score);
  const providers = providerLines(profile.providers);
  const tokenRows = profile.tokenBreakdown.length ? profile.tokenBreakdown : [{ label: 'No source reports tokens', tokens: 0 }];
  const tokenSplitText = tokenRows.slice(0, 6).map((item, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const x = 266 + column * 116;
    const y = 184 + row * 29;
    return `<rect x="${x}" y="${y}" width="108" height="23" rx="11.5" fill="${panel}" stroke="${line}" stroke-opacity=".18"/><text x="${x + 10}" y="${y + 15}" font-family="Arial,sans-serif" font-size="7.5" font-weight="700" fill="${muted}">${escapeXml(item.label)}</text><text x="${x + 99}" y="${y + 15}" text-anchor="end" font-family="ui-monospace,monospace" font-size="8" font-weight="800" fill="${foreground}">${escapeXml(compact(item.tokens))}</text>`;
  }).join('');
  const providerText = providers.map((providerLine, index) => `<text x="34" y="${181 + index * 14}" font-family="Arial,sans-serif" font-size="8" font-weight="650" fill="${muted}">${escapeXml(providerLine)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="252" role="img" aria-label="AI Native Profile for ${escapeXml(profile.username)}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${background}"/><stop offset="1" stop-color="${backgroundEnd}"/></linearGradient><filter id="shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#2d234b" flood-opacity=".13"/></filter></defs>
  <rect width="640" height="252" rx="22" fill="url(#bg)"/><circle cx="604" cy="25" r="45" fill="${warm}" opacity=".72"/><circle cx="585" cy="235" r="55" fill="${accentSoft}" opacity=".8"/>
  <rect x="18" y="18" width="213" height="216" rx="17" fill="${panel}" stroke="${line}" stroke-width="1.4" filter="url(#shadow)"/>
  <rect x="31" y="31" width="42" height="25" rx="8" fill="${accent}"/><text x="52" y="47" text-anchor="middle" font-family="ui-monospace,monospace" font-size="8" font-weight="850" fill="#fff">anp/</text>
  <rect x="164" y="31" width="54" height="25" rx="12.5" fill="${accentSoft}"/><circle cx="177" cy="43.5" r="3.5" fill="${foreground}"/><text x="186" y="46.5" font-family="ui-monospace,monospace" font-size="7" font-weight="850" fill="${foreground}">LIVE</text>
  <text x="31" y="82" font-family="Arial,sans-serif" font-size="16" font-weight="800" letter-spacing="-.3" fill="${foreground}">@${escapeXml(profile.username)}</text>
  <text x="31" y="118" font-family="Arial,sans-serif" font-size="23">${escapeXml(profile.archetype.emoji)}</text><text x="61" y="116" font-family="Arial,sans-serif" font-size="11" font-weight="850" letter-spacing=".5" fill="${foreground}">${escapeXml(profile.archetype.title.toUpperCase())}</text>
  <line x1="31" y1="139" x2="218" y2="139" stroke="${line}" stroke-opacity=".13"/>
  <text x="31" y="159" font-family="ui-monospace,monospace" font-size="7" font-weight="800" letter-spacing=".8" fill="${muted}">TOOL LOADOUT · CONNECTED</text>${providerText}
  <text x="31" y="220" font-family="ui-monospace,monospace" font-size="6.8" font-weight="750" fill="${muted}">UPDATED ${escapeXml(updatedLabel(profile.updatedAt).toUpperCase())}</text>
  <text x="257" y="40" font-family="ui-monospace,monospace" font-size="8" font-weight="850" letter-spacing="1.1" fill="${muted}">YOUR AI BUILD STORY</text><text x="618" y="40" text-anchor="end" font-family="ui-monospace,monospace" font-size="8" font-weight="850" fill="${accent}">MAKE YOURS ↗</text>
  <text x="257" y="102" font-family="Arial,sans-serif" font-size="49" font-weight="850" letter-spacing="-2.7" fill="${accent}">${escapeXml(compact(profile.tokens))}</text><text x="257" y="121" font-family="Arial,sans-serif" font-size="9" font-weight="700" letter-spacing=".5" fill="${muted}">OBSERVED AI CODING TOKENS</text>
  <rect x="257" y="137" width="350" height="35" rx="12" fill="${panel}" stroke="${line}" stroke-opacity=".18"/>
  <text x="273" y="150" font-family="Arial,sans-serif" font-size="6.5" font-weight="800" letter-spacing=".6" fill="${muted}">BUILD LEVEL</text><text x="273" y="164" font-family="Arial,sans-serif" font-size="12" font-weight="850" fill="${foreground}">${score}</text>
  <text x="385" y="150" font-family="Arial,sans-serif" font-size="6.5" font-weight="800" letter-spacing=".6" fill="${muted}">ACTIVE DAYS</text><text x="385" y="164" font-family="Arial,sans-serif" font-size="12" font-weight="850" fill="${foreground}">${profile.activeDays}</text>
  <text x="500" y="150" font-family="Arial,sans-serif" font-size="6.5" font-weight="800" letter-spacing=".6" fill="${muted}">CURRENT STREAK</text><text x="500" y="164" font-family="Arial,sans-serif" font-size="12" font-weight="850" fill="${foreground}">${profile.streakDays} days</text>
  ${tokenSplitText}
  <text x="257" y="235" font-family="ui-monospace,monospace" font-size="7" font-weight="800" fill="${muted}">SOURCE-LABELLED · NO PROMPTS OR CODE</text>
  </svg>`;
}

export function renderBadge(score: number | null): string {
  const value = score == null ? 'unranked' : String(score);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="172" height="32" role="img" aria-label="AI build level ${value}"><rect x="1" y="1" width="170" height="30" rx="15" fill="#fffdf8" stroke="#17182a" stroke-width="2"/><circle cx="17" cy="16" r="9" fill="#dfff73"/><text x="17" y="19" text-anchor="middle" font-family="Arial,sans-serif" font-size="10">⚡</text><text x="34" y="20" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="#17182a">AI build level</text><rect x="128" y="4" width="40" height="24" rx="12" fill="#5b43f5"/><text x="148" y="20" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="800" fill="#fff">${value}</text></svg>`;
}

export function renderSocialCard(profile: ProfileCard, format: 'og' | 'square' | 'story', theme: 'light' | 'dark' = 'dark'): string {
  const [width, height] = format === 'og' ? [1200, 630] : format === 'square' ? [1080, 1080] : [1080, 1920];
  const punch = theme === 'dark';
  const background = punch ? '#f1ecff' : '#eaf4ff';
  const backgroundEnd = punch ? '#ffe8db' : '#e8fff6';
  const foreground = '#17182a';
  const muted = '#626a80';
  const accent = punch ? '#5b43f5' : '#2359d8';
  const warm = punch ? '#ff805f' : '#ffbd68';
  const lime = punch ? '#dfff73' : '#93efd5';
  const score = profile.score == null ? '—' : String(profile.score);
  const tokenSplit = profile.tokenBreakdown.map((item) => `${item.label} ${compact(item.tokens)}`).join(' · ') || 'No source reports tokens';
  const centerY = Math.round(height * .48);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" role="img" aria-label="AI Native Profile for ${escapeXml(profile.username)}">
  <defs><linearGradient id="socialBg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${background}"/><stop offset="1" stop-color="${backgroundEnd}"/></linearGradient></defs><rect width="${width}" height="${height}" fill="url(#socialBg)"/><circle cx="${Math.round(width * .88)}" cy="${Math.round(height * .13)}" r="${Math.round(width * .18)}" fill="${warm}" opacity=".78"/><circle cx="${Math.round(width * .9)}" cy="${Math.round(height * .86)}" r="${Math.round(width * .14)}" fill="${lime}" opacity=".85"/>
  <rect x="${Math.round(width * .07)}" y="${Math.round(height * .06)}" width="${Math.round(width * .86)}" height="${Math.round(height * .88)}" rx="${Math.round(width * .025)}" fill="#fffdf8" stroke="#17182a" stroke-width="3"/>
  <rect x="${Math.round(width * .1)}" y="${Math.round(height * .1)}" width="74" height="58" rx="18" fill="${accent}"/><text x="${Math.round(width * .1) + 37}" y="${Math.round(height * .1) + 37}" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="17" font-weight="800" fill="#ffffff">anp/</text>
  <text x="${Math.round(width * .1) + 96}" y="${Math.round(height * .1) + 24}" font-family="Arial,sans-serif" font-size="18" font-weight="800" letter-spacing="2" fill="${muted}">AI BUILD STORY</text><text x="${Math.round(width * .1) + 96}" y="${Math.round(height * .1) + 54}" font-family="Arial,sans-serif" font-size="26" font-weight="800" fill="${foreground}">@${escapeXml(profile.username)}</text>
  <text x="${Math.round(width * .08)}" y="${centerY - 90}" font-family="Arial,sans-serif" font-size="30" fill="${foreground}">${escapeXml(profile.archetype.emoji)} ${escapeXml(profile.archetype.title)}</text>
  <text x="${Math.round(width * .08)}" y="${centerY}" font-family="Arial,sans-serif" font-size="${format === 'story' ? 220 : 170}" font-weight="700" letter-spacing="-10" fill="${accent}">${escapeXml(compact(profile.tokens))}</text><text x="${Math.round(width * .08)}" y="${centerY + 58}" font-family="Arial,sans-serif" font-size="25" fill="${muted}">AI CODING TOKENS</text>
  <text x="${Math.round(width * .68)}" y="${centerY - 18}" font-family="Arial,sans-serif" font-size="64" font-weight="700" fill="${foreground}">${score}</text><text x="${Math.round(width * .68)}" y="${centerY + 22}" font-family="Arial,sans-serif" font-size="19" fill="${muted}">BUILD LEVEL</text>
  <text x="${Math.round(width * .08)}" y="${height - Math.round(height * .18)}" font-family="Arial,sans-serif" font-size="24" fill="${foreground}">${profile.activeDays} active days  ·  ${profile.streakDays} day streak</text><text x="${Math.round(width * .08)}" y="${height - Math.round(height * .14)}" font-family="Arial,sans-serif" font-size="19" fill="${foreground}">TOOL LOADOUT · ${escapeXml(tokenSplit)}</text><text x="${Math.round(width * .08)}" y="${height - Math.round(height * .1)}" font-family="Arial,sans-serif" font-size="19" fill="${muted}">${escapeXml(profile.providers.join(' · ') || 'GitHub starter card')} · MAKE YOURS</text>
  </svg>`;
}
