/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import { main, container, card, brandBar, h1, text, button, footer } from './_styles.ts'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="id" dir="ltr">
    <Head />
    <Preview>Link login kamu untuk {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={brandBar}>🎴 {siteName}</Text>
          <Heading style={h1}>Link login kamu sudah siap</Heading>
          <Text style={text}>
            Tekan tombol di bawah untuk masuk ke {siteName}. Link ini akan kedaluwarsa dalam waktu singkat
            dan hanya bisa dipakai sekali.
          </Text>
          <Button style={button} href={confirmationUrl}>Masuk Sekarang</Button>
          <Text style={footer}>
            Jika kamu tidak meminta link ini, kamu bisa abaikan email ini dengan aman.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
