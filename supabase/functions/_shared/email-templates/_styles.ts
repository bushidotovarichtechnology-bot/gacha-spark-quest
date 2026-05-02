// Shared brand styles for Bushido Gacha auth emails.
// Body background MUST stay white per email guidelines.
export const brand = {
  primary: 'hsl(270, 80%, 60%)',
  primaryForeground: '#ffffff',
  accent: 'hsl(45, 100%, 55%)',
  foreground: '#1a0f2e',
  muted: '#6b6580',
  border: '#ece6f5',
  radius: '12px',
  font: '"Inter", "Helvetica Neue", Arial, sans-serif',
}

export const main = { backgroundColor: '#ffffff', fontFamily: brand.font, margin: 0, padding: 0 }
export const container = {
  padding: '32px 28px',
  maxWidth: '560px',
  margin: '0 auto',
}
export const card = {
  border: `1px solid ${brand.border}`,
  borderRadius: brand.radius,
  padding: '32px 28px',
  background: '#ffffff',
}
export const brandBar = {
  fontSize: '13px',
  fontWeight: 700 as const,
  letterSpacing: '2px',
  color: brand.primary,
  textTransform: 'uppercase' as const,
  margin: '0 0 16px',
}
export const h1 = {
  fontSize: '24px',
  fontWeight: 700 as const,
  color: brand.foreground,
  margin: '0 0 16px',
  lineHeight: '1.3',
}
export const text = {
  fontSize: '15px',
  color: brand.muted,
  lineHeight: '1.6',
  margin: '0 0 20px',
}
export const button = {
  backgroundColor: brand.primary,
  color: brand.primaryForeground,
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: brand.radius,
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
export const link = { color: brand.primary, textDecoration: 'underline' }
export const code = {
  fontFamily: '"SF Mono", Menlo, Courier, monospace',
  fontSize: '28px',
  fontWeight: 700 as const,
  color: brand.foreground,
  letterSpacing: '6px',
  background: '#f7f3ff',
  border: `1px solid ${brand.border}`,
  borderRadius: brand.radius,
  padding: '16px 24px',
  textAlign: 'center' as const,
  margin: '0 0 24px',
}
export const footer = {
  fontSize: '12px',
  color: '#9b95a8',
  margin: '24px 0 0',
  lineHeight: '1.5',
}
export const divider = {
  borderTop: `1px solid ${brand.border}`,
  margin: '24px 0',
}
