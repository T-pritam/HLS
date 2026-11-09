export function whatsappHref(number) {
  const digits = String(number).replace(/\D/g, '');
  return `https://wa.me/${digits}`;
}

export function telHref(number) {
  return `tel:${String(number).replace(/[^\d+]/g, '')}`;
}
