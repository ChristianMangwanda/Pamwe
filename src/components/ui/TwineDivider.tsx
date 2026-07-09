import Svg, { Path } from 'react-native-svg';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';

export interface TwineDividerProps {
  width?: number;
}

export function TwineDivider({ width = 80 }: TwineDividerProps) {
  return (
    <View style={styles.container}>
      <Svg width={width} height="10" viewBox="0 0 80 10">
        <Path 
          d="M0,5 Q10,1 20,5 T40,5 T60,5 T80,5" 
          stroke={colors.accent} 
          strokeWidth="0.8" 
          fill="none" 
          opacity={0.7} 
        />
        <Path 
          d="M0,5 Q10,9 20,5 T40,5 T60,5 T80,5" 
          stroke={colors.accentSoft} 
          strokeWidth="0.8" 
          fill="none" 
          opacity={0.6} 
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
