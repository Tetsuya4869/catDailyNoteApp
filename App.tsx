import React from 'react';
import { Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from './src/screens/HomeScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import CatsScreen from './src/screens/CatsScreen';
import StatsScreen from './src/screens/StatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import DiaryEntryScreen from './src/screens/DiaryEntryScreen';
import CatEditScreen from './src/screens/CatEditScreen';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { CatProvider } from './src/contexts/CatContext';
import { RootStackParamList, TabParamList } from './src/navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontWeight: 'bold' },
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: '猫の日記',
          tabBarLabel: '日記',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 24 }}>{focused ? '📖' : '📕'}</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          title: 'カレンダー',
          tabBarLabel: 'カレンダー',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 24 }}>{focused ? '📅' : '🗓'}</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Cats"
        component={CatsScreen}
        options={{
          title: 'うちの猫',
          tabBarLabel: '猫',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 24 }}>{focused ? '🐱' : '😺'}</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          title: '統計',
          tabBarLabel: '統計',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 24 }}>{focused ? '📊' : '📈'}</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: '設定',
          tabBarLabel: '設定',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 24 }}>{focused ? '⚙️' : '🔧'}</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { colors, isDark } = useTheme();

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.card,
      text: colors.text,
      primary: colors.primary,
      border: colors.border,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerTitleStyle: { fontWeight: 'bold' },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="DiaryEntry"
          component={DiaryEntryScreen}
          options={({ route }) => ({
            title: route.params?.id ? '日記を編集' : '新しい日記',
          })}
        />
        <Stack.Screen
          name="CatEdit"
          component={CatEditScreen}
          options={({ route }) => ({
            title: route.params?.id ? '猫を編集' : '猫を追加',
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <CatProvider>
        <AppNavigator />
      </CatProvider>
    </ThemeProvider>
  );
}
