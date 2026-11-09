// Disallows everything until launch (NEXT_PUBLIC_NOINDEX="true"), then opens up.
export default function robots() {
  if (process.env.NEXT_PUBLIC_NOINDEX === 'true') {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return { rules: { userAgent: '*', allow: '/' } };
}
