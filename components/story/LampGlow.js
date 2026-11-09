/**
 * The desk lamp: one soft, cool radial light at the top left of a stage.
 * Shared by the hero and the three moments, and LAMP is where the light
 * floods out from on the way into the founder scene.
 */
export const LAMP = { x: '12%', y: '6%' };

export default function LampGlow({ glowRef, strength = 1, className = '' }) {
  return (
    <div
      ref={glowRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{
        opacity: strength,
        background: `radial-gradient(circle at ${LAMP.x} ${LAMP.y}, rgba(170,210,245,0.26) 0%, rgba(18,115,194,0.13) 24%, rgba(18,115,194,0) 58%)`,
      }}
    />
  );
}
