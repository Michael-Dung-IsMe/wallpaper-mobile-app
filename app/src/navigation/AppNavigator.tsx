import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RootStackParamList } from './types';
import { HomeScreen } from '../screens/HomeScreen';
import { CategoryScreen } from '../screens/CategoryScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { DetailScreen } from '../screens/DetailScreen';
import { CollectionsScreen } from '../screens/CollectionsScreen';
import { CollectionDetailScreen } from '../screens/CollectionDetailScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import Theme from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: Theme.colors.primary,
          background: Theme.colors.background,
          card: Theme.colors.cardBackground,
          text: Theme.colors.textPrimary,
          border: Theme.colors.cardBorder,
          notification: Theme.colors.accent,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '900' },
        },
      }}
    >
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Theme.colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Category" component={CategoryScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="Detail" component={DetailScreen} />
        <Stack.Screen name="Collections" component={CollectionsScreen} />
        <Stack.Screen name="CollectionDetail" component={CollectionDetailScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
