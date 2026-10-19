const WORDS = ['KNOW', 'RECALL', 'PRESENT', 'SCORE'];

/** A thin band of type between the breaks and the turn. */
export default function Ribbon() {
  // Two identical halves, the track slides one half's width and loops.
  const half = Array.from({ length: 4 }, () => WORDS).flat();

  return (
    <div
      aria-label="KNOW · RECALL · PRESENT · SCORE"
      role="img"
      className="relative w-full overflow-hidden border-y border-hls-mist/15 bg-hls-black py-4 md:py-5"
    >
      <div className="ribbon-track flex w-max">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0" aria-hidden="true">
            {half.map((word, i) => (
              <span key={i} className="kicker flex items-center text-hls-mist">
                <span className={i % 4 === 3 ? 'text-hls-signal' : undefined}>{word}</span>
                <span className="px-6 text-hls-signal md:px-9">·</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
