/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Bushido Gacha'
const SITE_URL = 'https://bushidogacha.com'

interface TopupSuccessProps {
  name?: string
  coins?: number
  amount?: number
  orderId?: string
  paymentType?: string
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

const TopupSuccessEmail = ({ name, coins, amount, orderId, paymentType }: TopupSuccessProps) => (
  <Html lang="id" dir="ltr">
    <Head />
    <Preview>Top-up Bushido Coin berhasil! +{coins?.toLocaleString('id-ID') ?? '—'} koin telah masuk</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={brandBar}>🎴 {SITE_NAME}</Text>
          <Heading style={h1}>Top-up berhasil! 🎉</Heading>
          <Text style={text}>
            {name ? `Halo ${name}, ` : 'Halo, '}
            pembayaran top-up kamu sudah kami terima. Bushido Coin sudah masuk ke saldo dan siap dipakai untuk narik gacha!
          </Text>

          <Section style={summaryBox}>
            <Text style={summaryRow}>
              <span style={summaryLabel}>Koin diterima</span>
              <span style={summaryValueAccent}>+{coins?.toLocaleString('id-ID') ?? '—'} 🪙</span>
            </Text>
            {typeof amount === 'number' && (
              <Text style={summaryRow}>
                <span style={summaryLabel}>Total bayar</span>
                <span style={summaryValue}>{formatRupiah(amount)}</span>
              </Text>
            )}
            {paymentType && (
              <Text style={summaryRow}>
                <span style={summaryLabel}>Metode</span>
                <span style={summaryValue}>{paymentType}</span>
              </Text>
            )}
            {orderId && (
              <Text style={summaryRow}>
                <span style={summaryLabel}>Order ID</span>
                <span style={summaryValueMono}>{orderId}</span>
              </Text>
            )}
          </Section>

          <Button style={button} href={`${SITE_URL}/`}>Mulai Gacha</Button>

          <Hr style={hr} />
          <Text style={footer}>
            Simpan email ini sebagai bukti transaksi. Jika kamu tidak melakukan top-up ini,
            segera hubungi tim support {SITE_NAME}.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TopupSuccessEmail,
  subject: (data: Record<string, any>) =>
    data?.coins
      ? `Top-up berhasil! +${Number(data.coins).toLocaleString('id-ID')} Bushido Coin 🪙`
      : 'Top-up Bushido Coin berhasil 🪙',
  displayName: 'Top-up berhasil',
  previewData: {
    name: 'Hiroshi',
    coins: 5000,
    amount: 50000,
    orderId: 'ORDER-1730000000-abc12',
    paymentType: 'qris',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif', margin: 0, padding: 0 }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const card = {
  border: '1px solid #ece6f5',
  borderRadius: '12px',
  padding: '32px 28px',
  background: '#ffffff',
}
const brandBar = {
  fontSize: '13px',
  fontWeight: 700 as const,
  letterSpacing: '2px',
  color: 'hsl(270, 80%, 60%)',
  textTransform: 'uppercase' as const,
  margin: '0 0 16px',
}
const h1 = { fontSize: '24px', fontWeight: 700 as const, color: '#1a0f2e', margin: '0 0 16px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#6b6580', lineHeight: '1.6', margin: '0 0 20px' }
const summaryBox = {
  background: '#faf7ff',
  border: '1px solid #ece6f5',
  borderRadius: '12px',
  padding: '8px 20px',
  margin: '0 0 24px',
}
const summaryRow = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '14px',
  margin: '12px 0',
  color: '#1a0f2e',
}
const summaryLabel = { color: '#6b6580' }
const summaryValue = { color: '#1a0f2e', fontWeight: 600 as const }
const summaryValueAccent = { color: 'hsl(270, 80%, 60%)', fontWeight: 700 as const }
const summaryValueMono = { color: '#1a0f2e', fontFamily: '"SF Mono", Menlo, Courier, monospace', fontSize: '13px' }
const button = {
  backgroundColor: 'hsl(270, 80%, 60%)',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderTop: '1px solid #ece6f5', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#9b95a8', margin: '0', lineHeight: '1.5' }

export default TopupSuccessEmail
