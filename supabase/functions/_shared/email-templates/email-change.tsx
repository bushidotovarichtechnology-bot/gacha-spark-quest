/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import { main, container, card, brandBar, h1, text, button, link, footer } from './_styles.ts'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName, oldEmail, newEmail, confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="id" dir="ltr">
    <Head />
    <Preview>Konfirmasi perubahan email akun {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={brandBar}>🎴 {siteName}</Text>
          <Heading style={h1}>Konfirmasi perubahan email</Heading>
          <Text style={text}>
            Kamu meminta perubahan email akun {siteName} dari{' '}
            <Link href={`mailto:${oldEmail}`} style={link}>{oldEmail}</Link>{' '}
            ke{' '}
            <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
          </Text>
          <Text style={text}>Tekan tombol di bawah untuk mengonfirmasi perubahan ini:</Text>
          <Button style={button} href={confirmationUrl}>Konfirmasi Perubahan</Button>
          <Text style={footer}>
            Jika kamu tidak meminta perubahan ini, segera amankan akunmu.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
