import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../../providers/ThemeProvider';

export interface AvatarProps {
  initial: string;
  name?: string;
  status?: string;
  dashed?: boolean;
}

export function Avatar({ initial, name, status, dashed = true }: AvatarProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.circle,
          { borderColor: colors.accent2, borderStyle: dashed ? 'dashed' : 'solid' },
        ]}
      >
        <Text variant="heading" color={colors.accent} style={styles.initial}>
          {initial.toUpperCase()}
        </Text>
      </View>
      {name ? <Text variant="body" style={styles.name}>{name}</Text> : null}
      {status ? <Text variant="label" color={colors.muted} style={styles.status}>{status}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: 80, alignItems: 'center' },
  circle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { marginTop: 2 },
  name: { marginTop: 8, fontWeight: '500' },
  status: { marginTop: 2 },
});
