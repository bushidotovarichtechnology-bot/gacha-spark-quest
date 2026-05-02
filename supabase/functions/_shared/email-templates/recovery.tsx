/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import { main, container, card, brandBar, h1, text, button, footer } from './_styles.ts'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="id" dir="ltr">
    <Head />
    <Preview>Reset password akun {siteName} kamu</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={brandBar}>🎴 {siteName}</Text>
          <Heading style={h1}>Reset password kamu</Heading>
          <Text style={text}>
            Kami menerima permintaan reset password untuk akun {siteName} kamu.
            Tekan tombol di bawah untuk membuat password baru. Link ini akan kedaluwarsa dalam waktu singkat.
          </Text>
          <Button style={button} href={confirmationUrl}>Reset Password</Button>
          <Text style={footer}>
            Jika kamu tidak meminta reset password, abaikan email ini — password kamu tidak akan berubah.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
