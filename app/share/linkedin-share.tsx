'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { ProfileCard } from '@ai-native-profile/renderers';
import { captionWithProfile, linkedInCaption } from '../../lib/linkedin-share';

export function SocialCardPreview({ card, theme }: { card: ProfileCard; theme: 'dark' | 'light' }) {
  const [preview, setPreview] = useState('');
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let url = '';
    async function preparePreview() {
      try {
        const { renderSocialCard } = await import('@ai-native-profile/renderers');
        if (cancelled) return;
        url = URL.createObjectURL(new Blob([renderSocialCard(card, 'square', theme)], { type: 'image/svg+xml' }));
        setPreview(url);
        setPreviewError(false);
      } catch { if (!cancelled) setPreviewError(true); }
    }
    void preparePreview();
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [card, theme]);

  return <figure className="social-card-preview">
    {preview ? <Image className="linkedin-card-preview" src={preview} width={1080} height={1080} unoptimized alt="Preview of your downloadable social card" onError={() => setPreviewError(true)}/> : null}
    {previewError ? <p role="status">Preview unavailable. You can still try downloading your card.</p> : null}
    <figcaption>1080 × 1080 PNG · A snapshot, not a live embed.</figcaption>
  </figure>;
}

export function LinkedInShare({ card, theme, publicProfileUrl, onPublish, publishing }: {
  card: ProfileCard;
  theme: 'dark' | 'light';
  publicProfileUrl?: string;
  onPublish: () => Promise<void>;
  publishing: boolean;
}) {
  const [caption, setCaption] = useState(() => linkedInCaption(card));
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [manualCopy, setManualCopy] = useState(false);
  const fullCaption = captionWithProfile(caption, publicProfileUrl);

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(fullCaption);
      setManualCopy(false);
      setStatus('Caption copied. You can edit it again on LinkedIn.');
      return true;
    } catch {
      setManualCopy(true);
      setStatus('Automatic copying is unavailable. Select and copy the caption below.');
      return false;
    }
  }

  async function preparePost() {
    setBusy(true);
    const copied = await copyCaption();
    try {
      const { downloadCard } = await import('../../lib/download-card');
      await downloadCard(card, theme);
      setStatus(copied
        ? 'Image download started and caption copied. Open LinkedIn, start a post, attach the PNG, and paste.'
        : 'Image download started. Copy the text below manually, then attach the PNG to your LinkedIn post.');
    } catch {
      setStatus(copied ? 'Caption copied, but the image download failed. Try again to download the image.' : 'Image download and automatic copying failed. Copy the text below manually, then retry the download.');
    } finally { setBusy(false); }
  }

  return <section className="linkedin-share" aria-label="LinkedIn sharing">
    <SocialCardPreview card={card} theme={theme}/>
    <label className="linkedin-caption">Make the caption sound like you<textarea value={caption} onChange={event => setCaption(event.target.value)} rows={4}/></label>
    {publicProfileUrl ? <p className="linkedin-profile-link">Included with your caption: <a href={publicProfileUrl} target="_blank" rel="noreferrer">{publicProfileUrl}</a></p> : <p>Your profile is private, so no profile link is included. Posting this image shares the stats shown on it.</p>}
    <button type="button" className="publish-copy-button" onClick={preparePost} disabled={busy || publishing}>{busy ? 'Packing your post…' : 'Download image & copy caption'}</button>
    <div className="linkedin-actions"><button type="button" onClick={copyCaption} disabled={busy}>Copy caption only</button><a className="secondary-link" href="https://www.linkedin.com/feed/" target="_blank" rel="noreferrer">Open LinkedIn ↗</a></div>
    <p>Start a post, attach the downloaded image, and paste your caption. Nothing is posted automatically.</p>
    {status ? <div className="linkedin-status"><p role="status">{status}</p>{manualCopy ? <label>Full caption, ready to copy<textarea readOnly value={fullCaption} onFocus={event => event.currentTarget.select()} rows={5}/></label> : null}</div> : null}
    <details className="linkedin-featured"><summary>Add to LinkedIn Featured</summary>
      {publicProfileUrl ? <><p>Copy your public profile link, then open your LinkedIn profile. Choose Add profile section → Recommended → Add Featured. In Featured, use + to add a link, paste it, and save.</p><label>Public profile link<input readOnly value={publicProfileUrl} onFocus={event => event.currentTarget.select()}/></label><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(publicProfileUrl); setStatus('Profile link copied for Featured.'); } catch { setStatus('Select and copy the public profile link in Featured below.'); } }}>Copy Featured link</button><p>The linked profile stays current after syncs. LinkedIn may cache its preview image.</p></> : <><p>A Featured link needs a public profile. Publishing makes your profile and stats card public. It does not join the leaderboard.</p><button type="button" onClick={onPublish} disabled={publishing || busy}>{publishing ? 'Publishing…' : 'Publish profile for LinkedIn'}</button><p>You can also keep your profile private and feature your image post instead.</p></>}
      <a href="https://www.linkedin.com/help/linkedin/answer/a550399" target="_blank" rel="noreferrer">LinkedIn’s Featured guide ↗</a>
    </details>
  </section>;
}
