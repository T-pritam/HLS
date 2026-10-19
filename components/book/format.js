/**
 * The amount with ₹ drawn from the system font. Hanken Grotesk has no ₹ and
 * Fraunces keeps it in a second file, so this avoids two late font downloads.
 */
export function Inr({ amount }) {
  return (
    <>
      <span className="rupee">₹</span>
      {new Intl.NumberFormat('en-IN').format(amount)}
    </>
  );
}

export function whatsappHref(number) {
  const digits = String(number).replace(/\D/g, '');
  return `https://wa.me/${digits}`;
}

export function telHref(number) {
  return `tel:${String(number).replace(/[^\d+]/g, '')}`;
}
