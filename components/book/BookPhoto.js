/**
 * A page photo from public/book (built by scripts/build-book-assets.mjs),
 * 3:2, WebP with a JPEG fallback, at 720 and 1280 wide.
 */
export default function BookPhoto({ name, alt, priority = false, sizes = '(min-width: 1024px) 560px, 100vw', className = '' }) {
  const set = (ext) => `/book/${name}-720.${ext} 720w, /book/${name}-1280.${ext} 1280w`;
  return (
    <div className={`photo aspect-[3/2] ${className}`}>
      <picture>
        <source type="image/webp" srcSet={set('webp')} sizes={sizes} />
        <img
          src={`/book/${name}-720.jpg`}
          srcSet={set('jpg')}
          sizes={sizes}
          width={1280}
          height={853}
          alt={alt}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          loading={priority ? 'eager' : 'lazy'}
        />
      </picture>
    </div>
  );
}
