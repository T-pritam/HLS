/**
 * Duotone filter definition, HLS Black to HLS Signal Blue.
 * Referenced by the founder portrait in Section 05.
 */
export default function Duotone() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
    >
      <defs>
        <filter id="hls-duotone" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0.2126 0.7152 0.0722 0 0
                    0.2126 0.7152 0.0722 0 0
                    0.2126 0.7152 0.0722 0 0
                    0      0      0      1 0"
          />
          <feComponentTransfer>
            <feFuncR type="table" tableValues="0 0.071" />
            <feFuncG type="table" tableValues="0 0.451" />
            <feFuncB type="table" tableValues="0 0.761" />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  );
}
