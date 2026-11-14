type CaptionProfile = {
  activeDays: number;
  streakDays: number;
  providers: string[];
  archetype: { emoji: string; title: string };
};

export function linkedInCaption(profile: CaptionProfile): string {
  const activity = profile.activeDays > 0
    ? `${profile.activeDays} recorded active day${profile.activeDays === 1 ? '' : 's'}${profile.streakDays > 0 ? `, with a ${profile.streakDays}-day streak` : ''}.`
    : 'My builder story is just getting started.';
  const tools = profile.providers.length ? `My toolkit: ${profile.providers.join(', ')}.` : '';
  return [
    `Apparently I’m a ${profile.archetype.title} ${profile.archetype.emoji}`,
    [activity, tools].filter(Boolean).join('\n'),
    'Made my builder card with tokpop.dev. A snapshot of my recorded activity, not a skill rating.',
  ].join('\n\n');
}

export function captionWithProfile(caption: string, publicProfileUrl?: string): string {
  return publicProfileUrl ? `${caption.trim()}\n\nMy activity and receipts: ${publicProfileUrl}` : caption.trim();
}
