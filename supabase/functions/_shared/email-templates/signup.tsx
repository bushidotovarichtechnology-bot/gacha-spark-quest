/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import { main, container, card, brandBar, h1, text, button, link, footer } from './_styles.ts'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ siteName, siteUrl, recipient, confirmationUrl }: SignupEmailProps) => (
  <Html lang="id" dir="ltr">
    <Head />
    <Preview>Konfirmasi email kamu untuk mulai gacha di {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={brandBar}>🎴 {siteName}</Text>
          <Heading style={h1}>Konfirmasi email kamu</Heading>
          <Text style={text}>
            Terima kasih sudah mendaftar di{' '}
            <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>!
            Tinggal satu langkah lagi sebelum kamu bisa narik gacha pertama.
          </Text>
          <Text style={text}>
            Konfirmasi alamat email <strong>{recipient}</strong> dengan menekan tombol di bawah:
          </Text>
          <Button style={button} href={confirmationUrl}>Konfirmasi Email</Button>
          <Text style={footer}>
            Jika kamu tidak membuat akun di {siteName}, kamu bisa abaikan email ini dengan aman.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
