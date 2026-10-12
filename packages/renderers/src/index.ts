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
  const hyper = theme === 'dark';
  const background = hyper ? '#7647ff' : '#2868f2';
  const backgroundEnd = hyper ? '#ff5cb8' : '#56e9bd';
  const foreground = '#18122e';
  const muted = '#625b78';
  const panel = hyper ? '#fff4cf' : '#f8fffd';
  const accent = hyper ? '#7147ff' : '#205bdc';
  const accentSoft = hyper ? '#d9ff57' : '#8ff2d2';
  const warm = hyper ? '#ff7448' : '#ffbe4f';
  const blue = hyper ? '#70e7ff' : '#b8d3ff';
  const score = profile.score == null ? '—' : String(profile.score);
  const providers = providerLines(profile.providers);
  const tokenRows = profile.tokenBreakdown.length ? profile.tokenBreakdown : [{ label: 'No source reports tokens', tokens: 0 }];
  const tokenSplitText = tokenRows.slice(0, 4).map((item, index) => {
    const y = 93 + index * 30;
    const rowColor = index % 2 === 0 ? accentSoft : blue;
    return `<rect x="399" y="${y}" width="205" height="24" rx="8" fill="${rowColor}"/><text x="410" y="${y + 16}" font-family="Arial,sans-serif" font-size="8.5" font-weight="800" fill="${foreground}">${escapeXml(item.label)}</text><text x="593" y="${y + 16}" text-anchor="end" font-family="ui-monospace,monospace" font-size="9" font-weight="900" fill="${foreground}">${escapeXml(compact(item.tokens))}</text>`;
  }).join('');
  const providerText = providers.map((providerLine, index) => `<text x="401" y="${225 + index * 11}" font-family="Arial,sans-serif" font-size="7" font-weight="750" fill="${muted}">${escapeXml(providerLine)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="252" role="img" aria-label="tokpop.dev for ${escapeXml(profile.username)}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${background}"/><stop offset="1" stop-color="${backgroundEnd}"/></linearGradient><pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.4" fill="#fff" opacity=".23"/></pattern><filter id="shadow" x="-10%" y="-10%" width="125%" height="135%"><feDropShadow dx="6" dy="7" stdDeviation="0" flood-color="${foreground}" flood-opacity=".92"/></filter></defs>
  <rect width="640" height="252" rx="24" fill="url(#bg)"/><rect width="640" height="252" rx="24" fill="url(#dots)"/><path d="M0 197 L102 124 L165 252 H0Z" fill="${accentSoft}" opacity=".88"/><circle cx="601" cy="34" r="57" fill="${warm}" opacity=".94"/>
  <rect x="14" y="13" width="612" height="226" rx="18" fill="${panel}" stroke="${foreground}" stroke-width="2" filter="url(#shadow)"/>
  <rect x="29" y="27" width="79" height="26" rx="7" fill="${accent}"/><text x="68.5" y="44" text-anchor="middle" font-family="ui-monospace,monospace" font-size="9" font-weight="900" fill="#fff">tokpop.dev</text>
  <text x="118" y="44" font-family="Arial,sans-serif" font-size="13" font-weight="900" fill="${foreground}">@${escapeXml(profile.username)}</text>
  <rect x="499" y="27" width="109" height="25" rx="12.5" fill="${accentSoft}" stroke="${foreground}" stroke-width="1.4"/><text x="553.5" y="43" text-anchor="middle" font-family="ui-monospace,monospace" font-size="7.1" font-weight="900" letter-spacing=".55" fill="${foreground}">CLICK · MAKE YOURS</text>
  <text x="606" y="62" text-anchor="end" font-family="ui-monospace,monospace" font-size="6" font-weight="850" fill="${muted}">UPDATED ${escapeXml(updatedLabel(profile.updatedAt).toUpperCase())}</text>
  <rect x="29" y="66" width="339" height="39" rx="12" fill="${accent}" transform="rotate(-1 29 66)"/><text x="42" y="91" font-family="Arial,sans-serif" font-size="17" font-weight="900" letter-spacing=".4" fill="#fff">${escapeXml(profile.archetype.emoji)}  ${escapeXml(profile.archetype.title.toUpperCase())}</text>
  <text x="28" y="161" font-family="Arial,sans-serif" font-size="57" font-weight="950" letter-spacing="-3.7" fill="${foreground}">${escapeXml(compact(profile.tokens))}</text><text x="30" y="178" font-family="ui-monospace,monospace" font-size="7.5" font-weight="900" letter-spacing=".9" fill="${muted}">AI CODING TOKENS IN THE LOADOUT</text>
  <rect x="29" y="192" width="104" height="29" rx="14.5" fill="${warm}" stroke="${foreground}" stroke-width="1.3"/><text x="81" y="210" text-anchor="middle" font-family="Arial,sans-serif" font-size="8.5" font-weight="900" fill="${foreground}">🔥 ${profile.streakDays} DAY STREAK</text>
  <rect x="139" y="192" width="104" height="29" rx="14.5" fill="${blue}" stroke="${foreground}" stroke-width="1.3"/><text x="191" y="210" text-anchor="middle" font-family="Arial,sans-serif" font-size="8.5" font-weight="900" fill="${foreground}">⚡ ${profile.activeDays} ACTIVE DAYS</text>
  <rect x="249" y="192" width="119" height="29" rx="14.5" fill="${accentSoft}" stroke="${foreground}" stroke-width="1.3"/><text x="308.5" y="210" text-anchor="middle" font-family="Arial,sans-serif" font-size="8.5" font-weight="900" fill="${foreground}">🎮 LEVEL ${score} / 100</text>
  <line x1="384" y1="68" x2="384" y2="220" stroke="${foreground}" stroke-opacity=".18"/>
  <text x="400" y="80" font-family="ui-monospace,monospace" font-size="7.5" font-weight="900" letter-spacing="1" fill="${muted}">POWER BY PROVIDER</text>${tokenSplitText}
  <text x="400" y="212" font-family="ui-monospace,monospace" font-size="6.5" font-weight="900" letter-spacing=".8" fill="${muted}">ALL CONNECTED</text>${providerText}
  <text x="30" y="234" font-family="ui-monospace,monospace" font-size="6.3" font-weight="850" fill="${muted}">SOURCE-LABELLED · NO PROMPTS OR CODE</text>
  </svg>`;
}

export function renderBadge(score: number | null): string {
  const value = score == null ? 'unranked' : String(score);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="178" height="34" role="img" aria-label="AI build level ${value}"><rect width="178" height="34" rx="17" fill="#7147ff"/><rect x="3" y="3" width="172" height="28" rx="14" fill="#d9ff57"/><text x="17" y="22" text-anchor="middle" font-family="Arial,sans-serif" font-size="12">⚡</text><text x="33" y="21" font-family="Arial,sans-serif" font-size="10" font-weight="900" fill="#18122e">BUILD LEVEL</text><rect x="130" y="5" width="43" height="24" rx="12" fill="#7147ff"/><text x="151.5" y="21" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="900" fill="#fff">${value}</text></svg>`;
}

export function renderSocialCard(profile: ProfileCard, format: 'og' | 'square' | 'story', theme: 'light' | 'dark' = 'dark'): string {
  const [width, height] = format === 'og' ? [1200, 630] : format === 'square' ? [1080, 1080] : [1080, 1920];
  const punch = theme === 'dark';
  const background = punch ? '#7647ff' : '#2868f2';
  const backgroundEnd = punch ? '#ff5cb8' : '#56e9bd';
  const foreground = '#18122e';
  const muted = '#625b78';
  const accent = punch ? '#7147ff' : '#205bdc';
  const warm = punch ? '#ff7448' : '#ffbe4f';
  const lime = punch ? '#d9ff57' : '#8ff2d2';
  const score = profile.score == null ? '—' : String(profile.score);
  const tokenSplit = profile.tokenBreakdown.map((item) => `${item.label} ${compact(item.tokens)}`).join(' · ') || 'No source reports tokens';
  const centerY = Math.round(height * .48);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" role="img" aria-label="tokpop.dev for ${escapeXml(profile.username)}">
  <defs><linearGradient id="socialBg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${background}"/><stop offset="1" stop-color="${backgroundEnd}"/></linearGradient><pattern id="socialDots" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="3" fill="#fff" opacity=".2"/></pattern></defs><rect width="${width}" height="${height}" fill="url(#socialBg)"/><rect width="${width}" height="${height}" fill="url(#socialDots)"/><circle cx="${Math.round(width * .88)}" cy="${Math.round(height * .13)}" r="${Math.round(width * .18)}" fill="${warm}" opacity=".92"/><circle cx="${Math.round(width * .9)}" cy="${Math.round(height * .86)}" r="${Math.round(width * .14)}" fill="${lime}" opacity=".95"/>
  <rect x="${Math.round(width * .07)}" y="${Math.round(height * .06)}" width="${Math.round(width * .86)}" height="${Math.round(height * .88)}" rx="${Math.round(width * .025)}" fill="#fff4cf" stroke="${foreground}" stroke-width="5"/>
  <rect x="${Math.round(width * .1)}" y="${Math.round(height * .1)}" width="124" height="58" rx="18" fill="${accent}"/><text x="${Math.round(width * .1) + 62}" y="${Math.round(height * .1) + 37}" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="17" font-weight="800" fill="#ffffff">tokpop.dev</text>
  <text x="${Math.round(width * .1) + 146}" y="${Math.round(height * .1) + 24}" font-family="Arial,sans-serif" font-size="18" font-weight="900" letter-spacing="2" fill="${muted}">MY AI BUILD DROP</text><text x="${Math.round(width * .1) + 146}" y="${Math.round(height * .1) + 54}" font-family="Arial,sans-serif" font-size="26" font-weight="900" fill="${foreground}">@${escapeXml(profile.username)}</text>
  <rect x="${Math.round(width * .08)}" y="${centerY - 142}" width="${Math.round(width * .48)}" height="70" rx="22" fill="${accent}" transform="rotate(-1 ${Math.round(width * .08)} ${centerY - 142})"/><text x="${Math.round(width * .1)}" y="${centerY - 95}" font-family="Arial,sans-serif" font-size="30" font-weight="900" fill="#fff">${escapeXml(profile.archetype.emoji)} ${escapeXml(profile.archetype.title.toUpperCase())}</text>
  <text x="${Math.round(width * .08)}" y="${centerY}" font-family="Arial,sans-serif" font-size="${format === 'story' ? 220 : 170}" font-weight="800" letter-spacing="-10" fill="${accent}">${escapeXml(compact(profile.tokens))}</text><text x="${Math.round(width * .08)}" y="${centerY + 58}" font-family="Arial,sans-serif" font-size="25" font-weight="900" fill="${muted}">AI CODING TOKENS IN MY LOADOUT</text>
  <text x="${Math.round(width * .68)}" y="${centerY - 18}" font-family="Arial,sans-serif" font-size="64" font-weight="700" fill="${foreground}">${score}</text><text x="${Math.round(width * .68)}" y="${centerY + 22}" font-family="Arial,sans-serif" font-size="19" fill="${muted}">BUILD LEVEL</text>
  <text x="${Math.round(width * .08)}" y="${height - Math.round(height * .18)}" font-family="Arial,sans-serif" font-size="24" fill="${foreground}">${profile.activeDays} active days  ·  ${profile.streakDays} day streak</text><text x="${Math.round(width * .08)}" y="${height - Math.round(height * .14)}" font-family="Arial,sans-serif" font-size="19" fill="${foreground}">TOOL LOADOUT · ${escapeXml(tokenSplit)}</text><text x="${Math.round(width * .08)}" y="${height - Math.round(height * .1)}" font-family="Arial,sans-serif" font-size="19" fill="${muted}">${escapeXml(profile.providers.join(' · ') || 'GitHub starter card')} · MAKE YOURS</text>
  </svg>`;
}
