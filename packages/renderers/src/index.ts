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
  const background = dark ? '#191b17' : '#fffefa';
  const foreground = dark ? '#f6f7ef' : '#191b17';
  const muted = dark ? '#a8ada0' : '#73786c';
  const line = dark ? '#363a31' : '#dedfd5';
  const score = profile.score == null ? '—' : String(profile.score);
  const providers = profile.providers.map(escapeXml).join(' · ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="210" role="img" aria-label="AI Native Profile for ${escapeXml(profile.username)}">
  <rect width="640" height="210" rx="18" fill="${background}" stroke="${line}"/>
  <rect x="24" y="24" width="40" height="40" rx="10" fill="#d9ff56"/><text x="44" y="49" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#191b17">A/</text>
  <text x="78" y="42" font-family="Arial,sans-serif" font-size="11" font-weight="700" letter-spacing="1.4" fill="${muted}">AI NATIVE PROFILE</text>
  <text x="78" y="61" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="${foreground}">@${escapeXml(profile.username)}</text>
  <text x="24" y="126" font-family="Arial,sans-serif" font-size="52" font-weight="700" fill="#86a900">${score}</text><text x="88" y="126" font-family="Arial,sans-serif" font-size="14" fill="${muted}">/100 workflow index</text>
  <line x1="330" y1="29" x2="330" y2="178" stroke="${line}"/>
  <text x="358" y="58" font-family="Arial,sans-serif" font-size="12" fill="${muted}">ACTIVE DAYS</text><text x="500" y="58" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="${foreground}">${profile.activeDays}</text>
  <text x="358" y="93" font-family="Arial,sans-serif" font-size="12" fill="${muted}">CURRENT STREAK</text><text x="500" y="93" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="${foreground}">${profile.streakDays} days</text>
  <text x="358" y="128" font-family="Arial,sans-serif" font-size="12" fill="${muted}">SOURCES</text><text x="358" y="151" font-family="Arial,sans-serif" font-size="12" font-weight="600" fill="${foreground}">${providers}</text>
  <text x="24" y="180" font-family="Arial,sans-serif" font-size="10" fill="${muted}">Verified collection · Updated ${escapeXml(profile.updatedAt)}</text>
  </svg>`;
}

export function renderBadge(score: number | null): string {
  const value = score == null ? 'unranked' : String(score);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="178" height="28" role="img" aria-label="AI workflow index ${value}"><rect width="178" height="28" rx="6" fill="#191b17"/><rect x="126" width="52" height="28" rx="6" fill="#86a900"/><text x="10" y="18" font-family="Arial,sans-serif" font-size="11" fill="#f7f7ef">AI workflow index</text><text x="152" y="18" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="#fff">${value}</text></svg>`;
}

export function renderSocialCard(profile: ProfileCard, format: 'og' | 'square' | 'story', theme: 'light' | 'dark' = 'dark'): string {
  const [width, height] = format === 'og' ? [1200, 630] : format === 'square' ? [1080, 1080] : [1080, 1920];
  const dark = theme === 'dark';
  const background = dark ? '#171914' : '#f4f4ee';
  const foreground = dark ? '#f7f7ef' : '#181a16';
  const muted = dark ? '#9ea394' : '#6e7268';
  const score = profile.score == null ? '—' : String(profile.score);
  const centerY = Math.round(height * .48);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" role="img" aria-label="AI Native Profile for ${escapeXml(profile.username)}">
  <rect width="${width}" height="${height}" fill="${background}"/><circle cx="${Math.round(width * .82)}" cy="${Math.round(height * .16)}" r="${Math.round(width * .24)}" fill="#d9ff56" opacity=".12"/>
  <rect x="${Math.round(width * .08)}" y="${Math.round(height * .08)}" width="74" height="74" rx="18" fill="#d9ff56"/><text x="${Math.round(width * .08) + 37}" y="${Math.round(height * .08) + 47}" text-anchor="middle" font-family="Arial,sans-serif" font-size="24" font-weight="700" fill="#181a16">A/</text>
  <text x="${Math.round(width * .08) + 96}" y="${Math.round(height * .08) + 31}" font-family="Arial,sans-serif" font-size="20" font-weight="700" letter-spacing="2" fill="${muted}">AI NATIVE PROFILE</text><text x="${Math.round(width * .08) + 96}" y="${Math.round(height * .08) + 62}" font-family="Arial,sans-serif" font-size="25" font-weight="700" fill="${foreground}">@${escapeXml(profile.username)}</text>
  <text x="${Math.round(width * .08)}" y="${centerY}" font-family="Arial,sans-serif" font-size="${format === 'story' ? 220 : 170}" font-weight="700" letter-spacing="-10" fill="#b2d92a">${score}</text><text x="${Math.round(width * .08)}" y="${centerY + 58}" font-family="Arial,sans-serif" font-size="25" fill="${muted}">AI WORKFLOW INDEX / 100</text>
  <text x="${Math.round(width * .08)}" y="${height - Math.round(height * .14)}" font-family="Arial,sans-serif" font-size="24" fill="${foreground}">${profile.activeDays} active days  ·  ${profile.streakDays} day streak</text><text x="${Math.round(width * .08)}" y="${height - Math.round(height * .1)}" font-family="Arial,sans-serif" font-size="19" fill="${muted}">${profile.providers.map(escapeXml).join('  ·  ')}</text>
  </svg>`;
}
