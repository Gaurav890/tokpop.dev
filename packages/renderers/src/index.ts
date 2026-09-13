export type ProfileCard = {
  username: string;
  score: number | null;
  activeDays: number;
  streakDays: number;
  providers: string[];
  updatedAt: string;
};

const escapeXml = (value: string) => value.replace(/[<>&'\"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char]!);

export function renderProfileCard(profile: ProfileCard, theme: 'light' | 'dark' = 'light'): string {
  const dark = theme === 'dark';
  const background = dark ? '#171b2c' : '#ffffff';
  const foreground = dark ? '#f6f7fb' : '#121521';
  const muted = dark ? '#aab2c8' : '#697181';
  const line = dark ? '#3a435f' : '#d9deea';
  const score = profile.score == null ? '—' : String(profile.score);
  const providers = profile.providers.map(escapeXml).join(' · ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="210" role="img" aria-label="AI Native Profile for ${escapeXml(profile.username)}">
  <rect width="640" height="210" rx="18" fill="${background}" stroke="${line}"/>
  <rect x="24" y="24" width="48" height="34" rx="4" fill="#3451ff"/><text x="48" y="45" text-anchor="middle" font-family="monospace" font-size="10" font-weight="700" fill="#ffffff">anp/</text>
  <text x="78" y="42" font-family="Arial,sans-serif" font-size="11" font-weight="700" letter-spacing="1.4" fill="${muted}">AI NATIVE PROFILE</text>
  <text x="78" y="61" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="${foreground}">@${escapeXml(profile.username)}</text>
  <text x="24" y="126" font-family="Arial,sans-serif" font-size="52" font-weight="700" fill="#3451ff">${score}</text><text x="88" y="126" font-family="Arial,sans-serif" font-size="14" fill="${muted}">/100 workflow index</text>
  <line x1="330" y1="29" x2="330" y2="178" stroke="${line}"/>
  <text x="358" y="58" font-family="Arial,sans-serif" font-size="12" fill="${muted}">ACTIVE DAYS</text><text x="500" y="58" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="${foreground}">${profile.activeDays}</text>
  <text x="358" y="93" font-family="Arial,sans-serif" font-size="12" fill="${muted}">CURRENT STREAK</text><text x="500" y="93" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="${foreground}">${profile.streakDays} days</text>
  <text x="358" y="128" font-family="Arial,sans-serif" font-size="12" fill="${muted}">SOURCES</text><text x="358" y="151" font-family="Arial,sans-serif" font-size="12" font-weight="600" fill="${foreground}">${providers}</text>
  <text x="24" y="180" font-family="Arial,sans-serif" font-size="10" fill="${muted}">Verified collection · Updated ${escapeXml(profile.updatedAt)}</text>
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
  <text x="${Math.round(width * .08)}" y="${centerY}" font-family="Arial,sans-serif" font-size="${format === 'story' ? 220 : 170}" font-weight="700" letter-spacing="-10" fill="${accent}">${score}</text><text x="${Math.round(width * .08)}" y="${centerY + 58}" font-family="Arial,sans-serif" font-size="25" fill="${muted}">AI WORKFLOW INDEX / 100</text>
  <text x="${Math.round(width * .08)}" y="${height - Math.round(height * .14)}" font-family="Arial,sans-serif" font-size="24" fill="${foreground}">${profile.activeDays} active days  ·  ${profile.streakDays} day streak</text><text x="${Math.round(width * .08)}" y="${height - Math.round(height * .1)}" font-family="Arial,sans-serif" font-size="19" fill="${muted}">${profile.providers.map(escapeXml).join('  ·  ')}</text>
  </svg>`;
}
