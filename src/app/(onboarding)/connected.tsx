import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { Floral } from '../../components/ui/Floral';
import { popIn } from '../../lib/motion';
import { haptics } from '../../lib/haptics';
import { fonts } from '../../constants/typography';
import { GUTTER } from '../../theme/tokens';
import { useTheme } from '../../providers/ThemeProvider';
import { getUserCouple, getPartnerProfile, profileInitial } from '../../lib/couples';
import { getMyProfile } from '../../lib/account';

export default function ConnectedScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [me, setMe] = useState<string>('You');
  const [myInitial, setMyInitial] = useState('?');
  const [partner, setPartner] = useState<string>('your partner');
  const [partnerInitial, setPartnerInitial] = useState('?');

  useEffect(() => {
    (async () => {
      haptics.celebrate();
      const [mine, couple] = await Promise.all([getMyProfile(), getUserCouple()]);
      if (mine?.display_name) setMe(mine.display_name);
      setMyInitial(profileInitial(mine) ?? '?');
      const p = await getPartnerProfile(couple);
      if (p?.display_name) setPartner(p.display_name);
      setPartnerInitial(profileInitial(p) ?? '?');
    })();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.body}>
        <Floral variant="corner" style={styles.floral} />
        <View style={styles.avatars}>
          <Animated.View entering={popIn} style={[styles.avatar, { backgroundColor: colors.accent, zIndex: 1 }]}>
            <Text style={[styles.avatarInitial, { color: colors.bg }]}>{myInitial}</Text>
          </Animated.View>
          <Animated.View
            entering={popIn.delay(140)}
            style={[styles.avatar, styles.avatarBack, { backgroundColor: colors.accent2, borderColor: colors.bg }]}
          >
            <Text style={[styles.avatarInitial, { color: colors.bg }]}>{partnerInitial}</Text>
          </Animated.View>
        </View>

        <Text style={[styles.title, { color: colors.ink }]}>You're linked.</Text>
        <Text italic color={colors.ink2} style={styles.line}>{me} & {partner}, walking together from today.</Text>
      </View>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <Button title="Enter Pamwe" onPress={() => router.replace('/')} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 42 },
  floral: { position: 'absolute', top: 90, right: -30, width: 130, height: 130, opacity: 0.6, transform: [{ scaleX: -1 }] },
  avatars: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBack: { marginLeft: -16, borderWidth: 3 },
  avatarInitial: { fontFamily: fonts.serif, fontSize: 26 },
  title: { fontFamily: fonts.serifLight, fontSize: 34, lineHeight: 36, marginTop: 26, textAlign: 'center' },
  line: { fontSize: 16, marginTop: 12, textAlign: 'center' },
  footer: { paddingHorizontal: GUTTER, paddingBottom: 12 },
});
