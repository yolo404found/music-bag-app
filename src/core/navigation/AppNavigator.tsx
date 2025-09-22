import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList, TabParamList } from '../../shared/types';
import { useTheme } from '../providers/ThemeProvider';
import * as PhosphorIcons from 'phosphor-react-native';
import MiniPlayer from '../../shared/components/MiniPlayer';

// Import screens
import HomeScreen from '../../features/home/HomeScreen';
import SearchScreen from '../../features/search/SearchScreen';
import InfoScreen from '../../features/info/InfoScreen';
import LibraryScreen from '../../features/library/LibraryScreen';
import PlaylistScreen from '../../features/playlist/PlaylistScreen';
import PlayerScreen from '../../features/player/PlayerScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Custom Header Component
const CustomHeader: React.FC<{ title: string; subtitle?: string; showBackButton?: boolean }> = ({ 
  title, 
  subtitle, 
  showBackButton = true 
}) => {
  const navigation = useNavigation();
  const { theme } = useTheme();

  return (
    <View style={[styles.headerContainer, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        barStyle={theme.mode === 'light' ? 'dark-content' : 'light-content'} 
        backgroundColor={theme.colors.background} 
      />
      
      {/* Background Gradient */}
      <View style={[styles.backgroundGradient, { backgroundColor: theme.colors.surface }]} />
      
      {/* Header Content */}
      <SafeAreaView style={styles.header}>
        {showBackButton ? (
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: theme.colors.card }]}
            onPress={() => navigation.goBack()}
          >
            <PhosphorIcons.ArrowLeft size={20} color={theme.colors.text} weight="bold" />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerButton} />
        )}
        
        <View style={styles.headerCenter}>
          {subtitle && (
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>
          )}
          <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
        
        <View style={styles.headerButton} />
      </SafeAreaView>
    </View>
  );
};

// Bottom Tab Navigator Component
const TabNavigator: React.FC = () => {
  const { theme } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof PhosphorIcons;
          
          if (route.name === 'Home') {
            iconName = 'House';
          } else if (route.name === 'Search') {
            iconName = 'MagnifyingGlass';
          } else if (route.name === 'Library') {
            iconName = 'FolderOpen';
          } else {
            iconName = 'House';
          }
          
          const IconComponent = PhosphorIcons[iconName] as React.ComponentType<{
            size: number;
            color: string;
            weight: 'light' | 'thin' | 'regular' | 'bold' | 'fill' | 'duotone';
          }>;
          
          return (
            <IconComponent 
              size={size} 
              color={color} 
              weight={focused ? 'fill' : 'regular'}
            />
          );
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          paddingBottom: 8,
          paddingTop: 8,
          paddingHorizontal:16,
          height: 88,
          
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name="Search" 
        component={SearchScreen} 
        options={{ title: 'Search' }}
      />
      <Tab.Screen 
        name="Library" 
        component={LibraryScreen} 
        options={{ title: 'Library' }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <View style={{ flex: 1 }}>
        <Stack.Navigator
          initialRouteName="MainTabs"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen
            name="MainTabs"
            component={TabNavigator}
            options={{
              headerShown: false,
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
            name="Playlist"
            component={PlaylistScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Player"
            component={PlayerScreen}
            options={{
              headerShown: false,
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
    // backgroundColor will be set via theme
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // backgroundColor will be set via theme
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
});

export default AppNavigator;
