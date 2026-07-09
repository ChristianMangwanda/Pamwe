import { View, ViewProps } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';

export interface CardProps extends ViewProps {
  children: React.ReactNode;
  radius?: number;
  padding?: number;
}

export function Card({ children, style, radius = 20, padding = 20, ...props }: CardProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        { backgroundColor: colors.surface, borderRadius: radius, padding, borderWidth: 1, borderColor: colors.line },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
