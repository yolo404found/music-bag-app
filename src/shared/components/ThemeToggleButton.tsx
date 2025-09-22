import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../core/providers/ThemeProvider';
import * as PhosphorIcons from 'phosphor-react-native';

interface ThemeToggleButtonProps {
  size?: number;
  style?: any;
}

const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({ 
  size = 20, 
  style 
}) => {
  const { theme, themeMode, toggleTheme } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={toggleTheme}
      activeOpacity={0.7}
    >
      {themeMode === 'light' ? (
        <PhosphorIcons.Moon 
          size={size} 
          color={theme.colors.text} 
          weight="bold" 
        />
      ) : (
        <PhosphorIcons.Sun 
          size={size} 
          color={theme.colors.text} 
          weight="bold" 
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ThemeToggleButton;