import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'At Your Own Desk · HIM LIFE SCHOOL';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// The site's share card: the crest and the headline on black.
export default async function Image() {
  const crest = await readFile(join(process.cwd(), 'public', 'hls_crest.png'));
  const src = `data:image/png;base64,${crest.toString('base64')}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 88px',
          background: '#000000',
          color: '#e4e9ec',
        }}
      >
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <img src={src} width={53} height={70} />
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 76, lineHeight: 1.08, letterSpacing: -2 }}>
          <span>You worked.</span>
          <span>You still don’t know why.</span>
        </div>
        <div style={{ display: 'flex', fontSize: 24, letterSpacing: 5, color: '#8c97a0' }}>
          <span style={{ color: '#1273c2', marginRight: 18 }}>—</span>
          HIM LIFE SCHOOL · FOR CA FINAL GROUP 1 REPEATERS
        </div>
      </div>
    ),
    size
  );
}
