import { Text } from './ui/Text';
import { colors } from '../constants/colors';

export interface PamweWordmarkProps {
  size?: number;
  color?: string;
  italic?: boolean;
  capital?: boolean;
}

export function PamweWordmark({ 
  size = 32, 
  color = colors.accent, 
  italic = true, 
  capital = false 
}: PamweWordmarkProps) {
  const text = capital ? 'Pamwe' : 'pamwe';
  
  return (
    <Text
      color={color}
      italic={italic}
      style={{
        fontSize: size,
        lineHeight: size,
        letterSpacing: size * 0.005,
      }}
    >
      {text}
    </Text>
  );
}
