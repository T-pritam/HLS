/**
 * Maps the line art to flat Signal Blue and drops the white paper behind it.
 * Alpha comes from inverted luminance, so the ink survives and the sheet does
 * not. A plain CSS filter chain cannot do this, these sources are opaque.
 * Rendered once in the layout, referenced as filter: url(#hls-ink).
 */
export default function InkFilter() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
    >
      <defs>
        {/* The region is pinned to the source box, and alpha is multiplied
            through from the source, so pixels outside the artwork stay
            transparent instead of flooding Signal Blue. */}
        <filter
          id="hls-ink"
          colorInterpolationFilters="sRGB"
          x="0"
          y="0"
          width="100%"
          height="100%"
        >
          <feColorMatrix
            type="matrix"
            values="0       0       0       0 0.0706
                    0       0       0       0 0.4510
                    0       0       0       0 0.7608
                   -0.2126 -0.7152 -0.0722  1 0"
          />
        </filter>
      </defs>
    </svg>
  );
}
