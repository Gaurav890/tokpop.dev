import type { ProfileCard } from '@ai-native-profile/renderers';

export async function downloadCard(profile: ProfileCard, theme: 'dark' | 'light') {
  const { renderSocialCard } = await import('@ai-native-profile/renderers');
  const svg = renderSocialCard(profile, 'square', theme);
  const imageUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('The card image could not be prepared. Please retry.'));
      image.src = imageUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image downloads are unavailable in this browser. Try another browser or use the README card.');
    context.drawImage(image, 0, 0);
    const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not create the image. Please retry.')), 'image/png'));
    const url = URL.createObjectURL(png);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tokpop-${profile.username.replace(/[^a-z0-9-]/gi, '')}.png`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
