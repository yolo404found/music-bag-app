import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../shared/types';
import * as PhosphorIcons from 'phosphor-react-native';
import MiniPlayer from '../../shared/components/MiniPlayer';

// Import screens
import HomeScreen from '../../features/home/HomeScreen';
import InfoScreen from '../../features/info/InfoScreen';
import LibraryScreen from '../../features/library/LibraryScreen';
import PlayerScreen from '../../features/player/PlayerScreen';

const Stack = createStackNavigator<RootStackParamList>();

// Custom Header Component
const CustomHeader: React.FC<{ title: string; subtitle?: string; showBackButton?: boolean }> = ({ 
  title, 
  subtitle, 
  showBackButton = true 
}) => {
  const navigation = useNavigation();

  return (
    <View style={styles.headerContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Background Gradient */}
      <View style={styles.backgroundGradient} />
      
      {/* Header Content */}
      <SafeAreaView style={styles.header}>
        {showBackButton ? (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <PhosphorIcons.ArrowLeft size={20} color="#fff" weight="bold" />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerButton} />
        )}
        
        <View style={styles.headerCenter}>
          {subtitle && (
            <Text style={styles.headerSubtitle}>{subtitle}</Text>
          )}
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>
        
        <View style={styles.headerButton} />
      </SafeAreaView>
    </View>
  );
};

const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <View style={{ flex: 1 }}>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false, // Use custom headers for all screens
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              headerShown: false, // Home screen has its own header
            }}
          />
          <Stack.Screen
            name="Info"
            component={InfoScreen}
            options={{
              header: () => <CustomHeader title="Audio Info" subtitle="Details" />,
            }}
          />
          <Stack.Screen
            name="Library"
            component={LibraryScreen}
            options={{
              headerShown: false, // Library screen has its own header
            }}
          />
          <Stack.Screen
            name="Player"
            component={PlayerScreen}
            options={{
              headerShown: false, // Player screen has its own custom header
            }}
          />
        </Stack.Navigator>
        <MiniPlayer />
      </View>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#000',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginHorizontal: 16,
    paddingVertical: 15,
    zIndex: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  headerSubtitle: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
});

export default AppNavigator;
