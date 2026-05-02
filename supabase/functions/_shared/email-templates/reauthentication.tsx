/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import { main, container, card, brandBar, h1, text, code, footer } from './_styles.ts'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="id" dir="ltr">
    <Head />
    <Preview>Kode verifikasi kamu</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={brandBar}>🎴 Bushido Gacha</Text>
          <Heading style={h1}>Konfirmasi identitas kamu</Heading>
          <Text style={text}>Gunakan kode berikut untuk mengonfirmasi identitas kamu:</Text>
          <Text style={code}>{token}</Text>
          <Text style={footer}>
            Kode ini akan kedaluwarsa dalam waktu singkat. Jika kamu tidak meminta ini, abaikan email ini.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
