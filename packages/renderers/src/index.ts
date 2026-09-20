export type ProfileCard = {
  username: string;
  score: number | null;
  activeDays: number;
  streakDays: number;
  tokens: number;
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
  const background = dark ? '#171b2c' : '#ffffff';
  const foreground = dark ? '#f6f7fb' : '#121521';
  const muted = dark ? '#aab2c8' : '#697181';
  const line = dark ? '#3a435f' : '#d9deea';
  const score = profile.score == null ? '—' : String(profile.score);
  const providers = providerLines(profile.providers);
  const providerText = providers.map((providerLine, index) => `<text x="358" y="${196 + index * 13}" font-family="Arial,sans-serif" font-size="10" font-weight="600" fill="${foreground}">${escapeXml(providerLine)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="230" role="img" aria-label="AI Native Profile for ${escapeXml(profile.username)}">
  <rect width="640" height="230" rx="18" fill="${background}" stroke="${line}"/>
  <rect x="24" y="24" width="48" height="34" rx="4" fill="#3451ff"/><text x="48" y="45" text-anchor="middle" font-family="monospace" font-size="10" font-weight="700" fill="#ffffff">anp/</text>
  <text x="78" y="42" font-family="Arial,sans-serif" font-size="11" font-weight="700" letter-spacing="1.4" fill="${muted}">AI NATIVE PROFILE</text>
  <text x="78" y="61" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="${foreground}">@${escapeXml(profile.username)}</text>
  <text x="616" y="42" text-anchor="end" font-family="Arial,sans-serif" font-size="9" fill="${muted}">UPDATED ${escapeXml(updatedLabel(profile.updatedAt).toUpperCase())}</text>
  <text x="24" y="94" font-family="Arial,sans-serif" font-size="20">${escapeXml(profile.archetype.emoji)}</text><text x="54" y="93" font-family="Arial,sans-serif" font-size="12" font-weight="700" letter-spacing=".8" fill="${foreground}">${escapeXml(profile.archetype.title.toUpperCase())}</text>
  <text x="24" y="153" font-family="Arial,sans-serif" font-size="48" font-weight="700" letter-spacing="-2" fill="#3451ff">${escapeXml(compact(profile.tokens))}</text><text x="24" y="174" font-family="Arial,sans-serif" font-size="11" fill="${muted}">OBSERVED CODING TOKENS</text>
  <text x="24" y="214" font-family="Arial,sans-serif" font-size="9" fill="${muted}">Coverage-labelled evidence · provider definitions may differ</text>
  <line x1="330" y1="75" x2="330" y2="214" stroke="${line}"/>
  <text x="358" y="92" font-family="Arial,sans-serif" font-size="10" fill="${muted}">WORKFLOW INDEX</text><text x="520" y="92" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="${foreground}">${score}/100</text>
  <text x="358" y="127" font-family="Arial,sans-serif" font-size="10" fill="${muted}">ACTIVE DAYS</text><text x="520" y="127" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="${foreground}">${profile.activeDays}</text>
  <text x="358" y="162" font-family="Arial,sans-serif" font-size="10" fill="${muted}">CURRENT STREAK</text><text x="520" y="162" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="${foreground}">${profile.streakDays} days</text>
  <text x="358" y="182" font-family="Arial,sans-serif" font-size="9" font-weight="700" letter-spacing=".7" fill="${muted}">ALL CODING SOURCES</text>${providerText}
  </svg>`;
}

export function renderBadge(score: number | null): string {
  const value = score == null ? 'unranked' : String(score);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="178" height="28" role="img" aria-label="AI workflow index ${value}"><rect width="178" height="28" rx="4" fill="#171b2c"/><rect x="126" width="52" height="28" rx="4" fill="#3451ff"/><text x="10" y="18" font-family="Arial,sans-serif" font-size="11" fill="#f7f8fb">AI workflow index</text><text x="152" y="18" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="#fff">${value}</text></svg>`;
}

export function renderSocialCard(profile: ProfileCard, format: 'og' | 'square' | 'story', theme: 'light' | 'dark' = 'dark'): string {
  const [width, height] = format === 'og' ? [1200, 630] : format === 'square' ? [1080, 1080] : [1080, 1920];
  const dark = theme === 'dark';
  const background = dark ? '#171b2c' : '#f4f6fa';
  const foreground = dark ? '#f7f8fb' : '#121521';
  const muted = dark ? '#aab2c8' : '#697181';
  const accent = dark ? '#8294ff' : '#3451ff';
  const score = profile.score == null ? '—' : String(profile.score);
  const centerY = Math.round(height * .48);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" role="img" aria-label="AI Native Profile for ${escapeXml(profile.username)}">
  <rect width="${width}" height="${height}" fill="${background}"/><circle cx="${Math.round(width * .82)}" cy="${Math.round(height * .16)}" r="${Math.round(width * .24)}" fill="${accent}" opacity=".12"/>
  <rect x="${Math.round(width * .08)}" y="${Math.round(height * .08)}" width="74" height="74" rx="10" fill="${accent}"/><text x="${Math.round(width * .08) + 37}" y="${Math.round(height * .08) + 46}" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="19" font-weight="700" fill="#ffffff">anp/</text>
  <text x="${Math.round(width * .08) + 96}" y="${Math.round(height * .08) + 31}" font-family="Arial,sans-serif" font-size="20" font-weight="700" letter-spacing="2" fill="${muted}">AI NATIVE PROFILE</text><text x="${Math.round(width * .08) + 96}" y="${Math.round(height * .08) + 62}" font-family="Arial,sans-serif" font-size="25" font-weight="700" fill="${foreground}">@${escapeXml(profile.username)}</text>
  <text x="${Math.round(width * .08)}" y="${centerY - 90}" font-family="Arial,sans-serif" font-size="30" fill="${foreground}">${escapeXml(profile.archetype.emoji)} ${escapeXml(profile.archetype.title)}</text>
  <text x="${Math.round(width * .08)}" y="${centerY}" font-family="Arial,sans-serif" font-size="${format === 'story' ? 220 : 170}" font-weight="700" letter-spacing="-10" fill="${accent}">${escapeXml(compact(profile.tokens))}</text><text x="${Math.round(width * .08)}" y="${centerY + 58}" font-family="Arial,sans-serif" font-size="25" fill="${muted}">OBSERVED CODING TOKENS</text>
  <text x="${Math.round(width * .68)}" y="${centerY - 18}" font-family="Arial,sans-serif" font-size="64" font-weight="700" fill="${foreground}">${score}</text><text x="${Math.round(width * .68)}" y="${centerY + 22}" font-family="Arial,sans-serif" font-size="19" fill="${muted}">WORKFLOW INDEX / 100</text>
  <text x="${Math.round(width * .08)}" y="${height - Math.round(height * .14)}" font-family="Arial,sans-serif" font-size="24" fill="${foreground}">${profile.activeDays} active days  ·  ${profile.streakDays} day streak</text><text x="${Math.round(width * .08)}" y="${height - Math.round(height * .1)}" font-family="Arial,sans-serif" font-size="19" fill="${muted}">${escapeXml(profile.providers.join(' · ') || 'No coding source yet')}</text>
  </svg>`;
}
