/**
 * Neutral attempt labels. No exam months or dates appear anywhere on /book.
 * The route each one maps to is decided on the server (lib/book/booking.js).
 */
export const ATTEMPTS = [
  { value: 'this', label: 'This attempt' },
  { value: 'next', label: 'Next attempt' },
  { value: 'unsure', label: 'Not sure' },
];

export const ATTEMPT_VALUES = ATTEMPTS.map((a) => a.value);

export function attemptLabel(value) {
  return ATTEMPTS.find((a) => a.value === value)?.label ?? null;
}

export const VARIANTS = ['a', 'b', 'c'];
