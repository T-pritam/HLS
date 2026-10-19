/**
 * Brand lockups from public/book (built by scripts/build-book-assets.mjs).
 * Light lockup on light backgrounds, dark lockup on dark ones.
 */
const LOCKUPS = {
  light: { name: 'logo-light', w: 140, h: 71 },
  dark: { name: 'logo-dark', w: 160, h: 80 },
};

export default function Logo({ tone = 'light', priority = false, className = '' }) {
  const { name, w, h } = LOCKUPS[tone];
  return (
    <picture className={className}>
      <source type="image/webp" srcSet={`/book/${name}-${w}.webp 1x, /book/${name}-${w * 2}.webp 2x`} />
      <img
        src={`/book/${name}-${w}.png`}
        srcSet={`/book/${name}-${w}.png 1x, /book/${name}-${w * 2}.png 2x`}
        width={w}
        height={h}
        alt="HIM LIFE SCHOOL"
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        loading={priority ? 'eager' : 'lazy'}
        className="block h-auto"
      />
    </picture>
  );
}
