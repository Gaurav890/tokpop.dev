import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';

export function GET() {
  return new ImageResponse(
    <div style={{ display: 'flex', width: '100%', height: '100%', background: '#7147ff', padding: 42, color: '#18122e', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', borderRadius: 32, border: '4px solid #18122e', background: '#fff4cf', padding: 48, boxShadow: '12px 12px 0 #d9ff57' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 50, fontWeight: 900, color: '#7147ff' }}>tokpop.dev</span>
          <span style={{ fontSize: 22, background: '#d9ff57', padding: '12px 24px', borderRadius: 32 }}>TRACK. SHARE. FLEX.</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 38, fontSize: 76, fontWeight: 900, letterSpacing: -3 }}>
          <span>Your AI activity.</span><span style={{ color: '#7147ff' }}>With personality.</span>
        </div>
        <div style={{ display: 'flex', marginTop: 36, gap: 18 }}>
          {['Tools + tokens', 'Daily streaks', 'Your live card'].map((label, i) => <span key={label} style={{ padding: '16px 24px', borderRadius: 18, border: '2px solid #18122e', background: ['#70e7ff', '#ff95cf', '#d9ff57'][i], fontSize: 24 }}>{label}</span>)}
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
