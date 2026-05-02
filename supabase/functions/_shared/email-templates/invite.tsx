/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import { main, container, card, brandBar, h1, text, button, link, footer } from './_styles.ts'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="id" dir="ltr">
    <Head />
    <Preview>Kamu diundang gabung ke {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={brandBar}>🎴 {siteName}</Text>
          <Heading style={h1}>Kamu diundang gabung</Heading>
          <Text style={text}>
            Kamu diundang untuk bergabung di{' '}
            <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>.
            Tekan tombol di bawah untuk menerima undangan dan membuat akunmu.
          </Text>
          <Button style={button} href={confirmationUrl}>Terima Undangan</Button>
          <Text style={footer}>
            Jika kamu tidak mengharapkan undangan ini, kamu bisa abaikan email ini.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
