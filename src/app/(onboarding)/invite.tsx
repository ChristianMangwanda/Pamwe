import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Copy, ShareNetwork, Check, QrCode } from 'phosphor-react-native';
import QRCode from 'react-native-qrcode-svg';
import { Text } from '../../components/ui/Text';
import { BackLink } from '../../components/ui/BackLink';
import { Button } from '../../components/ui/Button';
import { SectionEyebrow } from '../../components/ui/SectionEyebrow';
import { fonts } from '../../constants/typography';
import { GUTTER } from '../../theme/tokens';
import { useTheme } from '../../providers/ThemeProvider';
import { useCouple } from '../../providers/CoupleProvider';
import { haptics } from '../../lib/haptics';
import { createCouple, getUserCouple, inviteExpired, regenerateInviteCode } from '../../lib/couples';
import { inviteLink, inviteMessage, inviteExpiryLabel } from '../../lib/invite';
import { useAwaitPairing } from '../../hooks/useAwaitPairing';

export default function InviteScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { refresh } = useCouple();
  const [code, setCode] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const started = useRef(false);

  // Idempotent: reuse an existing unpaired couple (e.g. after relaunch), else create one.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const existing = await getUserCouple();
        if (existing?.invite_code) {
          if (existing.paired_at) return router.replace('/');
          // #18: a code older than 7 days no longer joins anyone. Swap in a
          // fresh one so a slow start never bricks the pairing.
          if (inviteExpired(existing)) {
            const renewed = await regenerateInviteCode();
            setCode(renewed.invite_code);
            setCoupleId(renewed.id);
            setExpiresAt(renewed.invite_expires_at);
            return;
          }
          setCode(existing.invite_code);
          setCoupleId(existing.id);
          setExpiresAt(existing.invite_expires_at);
          return;
        }
        const couple = await createCouple();
        setCode(couple.invite_code);
        setCoupleId(couple.id);
        setExpiresAt(couple.invite_expires_at);
        // Provider was loaded pre-couple; sync it so its realtime
        // subscription attaches and catches the partner joining.
        refresh();
      } catch (e: any) {
        Alert.alert("Couldn't create your code", e.message);
      }
    })();
  }, [router]);

  useAwaitPairing(coupleId);

  const onCopy = async () => {
    if (!code) return;
    haptics.light();
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const onShare = async () => {
    if (!code) return;
    haptics.tap();
    // Carries a tappable link now as well as the code. The code stays in the
    // message on purpose: a custom-scheme link does nothing on a phone without
    // the app, and a link that does nothing is worse than six characters.
    const result = await Share.share({ message: inviteMessage(code) });
    // Only once it has actually gone. Share.share resolves on dismissal too, so
    // navigating before this would move the screen out from under someone who
    // opened the sheet and changed their mind.
    if (result.action === Share.sharedAction) router.push('/(onboarding)/code-sent');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <BackLink onPress={() => router.back()} />
      </View>

      <View style={styles.body}>
        <SectionEyebrow>Last step</SectionEyebrow>
        <Text variant="h1" style={styles.title}>Send your partner this code</Text>
        <Text italic color={colors.ink2} style={styles.subtitle}>They type it in and you are linked.</Text>

        <View style={[styles.codeCard, { backgroundColor: colors.surface, borderColor: colors.accent2 }]}>
          <Text style={[styles.code, { color: colors.accent }]}>{code ?? '····'}</Text>
          {/* The handoff drew "EXPIRES AT MIDNIGHT" here. The database says
              seven days and the database is what actually refuses a code, so
              the card states the real one. */}
          {!!expiresAt && (
            <Text variant="label" color={colors.muted} style={styles.expiry}>
              {inviteExpiryLabel(expiresAt)}
            </Text>
          )}
        </View>

        {/* For the partner sitting next to you, which is most of them. The
            QR is always rendered on white: a dark-mode inversion is not
            reliably scannable, and this square is not decoration. */}
        {code && showQr && (
          <View style={[styles.qrCard, { borderColor: colors.line }]}>
            <QRCode value={inviteLink(code)} size={168} backgroundColor="#FFFFFF" color="#17130F" />
            <Text style={[styles.qrHint, { color: colors.ink2 }]}>
              Point their camera at this.
            </Text>
          </View>
        )}

        {code && (
          <TouchableOpacity
            onPress={() => { haptics.tap(); setShowQr((v) => !v); }}
            style={styles.qrToggle}
            accessibilityRole="button"
            accessibilityState={{ expanded: showQr }}
            accessibilityLabel={showQr ? 'Hide the QR code' : 'Show a QR code to scan'}
          >
            <QrCode size={15} color={colors.accent2} />
            <Text style={[styles.qrToggleLabel, { color: colors.accent2 }]}>
              {showQr ? 'Hide QR code' : 'Show a QR code instead'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.actions}>
          <TouchableOpacity onPress={onCopy} style={[styles.action, { borderColor: colors.line }]} accessibilityRole="button" accessibilityLabel="Copy code">
            {copied ? <Check size={16} color={colors.accent} weight="bold" /> : <Copy size={16} color={colors.accent} />}
            <Text style={[styles.actionLabel, { color: colors.accent }]}>{copied ? 'Copied' : 'Copy'}</Text>
          </TouchableOpacity>
        </View>

        {/* Sharing is the whole job of this screen, so it is the whole-width
            primary. Waiting used to happen here too, as a spinner underneath;
            the handoff gives it a screen of its own with one thing to do. */}
        <View style={styles.footer}>
          <Button title="Share the code" onPress={onShare} disabled={!code} />
          <Button title="Later" variant="ghost" onPress={() => router.push('/(onboarding)/code-sent')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: GUTTER },
  header: { paddingTop: 8 },
  body: { flex: 1, alignItems: 'center', paddingTop: 14, paddingHorizontal: 14 },
  title: { textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', marginTop: 10 },
  codeCard: {
    marginTop: 28,
    width: '100%',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 20,
    paddingVertical: 26,
    alignItems: 'center',
  },
  qrCard: {
    marginTop: 18,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    // Always white, in both themes: an inverted QR does not scan reliably.
    backgroundColor: '#FFFFFF',
  },
  qrHint: { fontFamily: fonts.sans, fontSize: 12, marginTop: 12, color: '#5B5148' },
  qrToggle: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 16 },
  qrToggleLabel: { fontFamily: fonts.sansMedium, fontSize: 12 },
  code: { fontFamily: fonts.serifSemiBold, fontSize: 34, letterSpacing: 4.8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16, width: '100%' },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
  },
  actionPrimary: { borderWidth: 0 },
  actionLabel: { fontFamily: fonts.sansSemiBold, fontSize: 11, letterSpacing: 0.7, textTransform: 'uppercase' },
  expiry: { marginTop: 10 },
  footer: { width: '100%', marginTop: 'auto', paddingBottom: 12, gap: 8 },
});
