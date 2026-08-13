import React from 'react';
import { Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import HomeScreen from './src/screens/HomeScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import CatsScreen from './src/screens/CatsScreen';
import CatProfileScreen from './src/screens/CatProfileScreen';
import StatsScreen from './src/screens/StatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import DiaryEntryScreen from './src/screens/DiaryEntryScreen';
import CatEditScreen from './src/screens/CatEditScreen';
import DayDetailScreen from './src/screens/DayDetailScreen';
import HealthRecordEditScreen from './src/screens/HealthRecordEditScreen';
import AppointmentEditScreen from './src/screens/AppointmentEditScreen';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { CatProvider } from './src/contexts/CatContext';
import { RootStackParamList, TabParamList } from './src/navigation/types';
import { spacing } from './src/constants/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function NewPostPlaceholder() { return <View />; }

function CenterPostButton({ accessibilityState }: BottomTabBarButtonProps) {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <View style={centerStyles.wrap} pointerEvents="box-none">
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="新規投稿" accessibilityState={accessibilityState} activeOpacity={0.85} style={[centerStyles.button, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('DiaryEntry', {})}>
        <Text style={centerStyles.plus}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const centerStyles = StyleSheet.create({
  wrap: { top: -18, justifyContent: 'flex-start', alignItems: 'center', width: 64 },
  button: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 5, elevation: 6 },
  plus: { fontSize: 30, color: '#fff', lineHeight: 34 },
});

function MainTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator screenOptions={{
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.text,
      headerTitleStyle: { fontWeight: 'bold' },
      headerShadowVisible: false,
      tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.border, height: 64, paddingBottom: spacing.sm, paddingTop: spacing.sm },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textMuted,
    }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '猫日記', tabBarLabel: 'ホーム', tabBarIcon: () => <Text style={{ fontSize: 22 }}>🏠</Text> }} />
      <Tab.Screen name="Calendar" component={CalendarScreen} options={{ title: 'カレンダー', tabBarLabel: 'カレンダー', tabBarIcon: ({ focused }) => <Text style={{ fontSize: 22 }}>{focused ? '📅' : '🗓'}</Text> }} />
      <Tab.Screen name="NewPost" component={NewPostPlaceholder} options={{ tabBarLabel: () => null, tabBarButton: (props) => <CenterPostButton {...props} /> }} />
      <Tab.Screen name="MyCats" component={CatsScreen} options={{ title: 'マイ猫', tabBarLabel: 'マイ猫', tabBarIcon: () => <Text style={{ fontSize: 22 }}>🐈</Text> }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: '設定', tabBarLabel: '設定', tabBarIcon: () => <Text style={{ fontSize: 22 }}>⚙️</Text> }} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { colors, isDark } = useTheme();
  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: { ...(isDark ? DarkTheme.colors : DefaultTheme.colors), background: colors.background, card: colors.card, text: colors.text, primary: colors.primary, border: colors.border },
  };
  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, headerTitleStyle: { fontWeight: 'bold' }, headerShadowVisible: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="CatProfile" component={CatProfileScreen} options={{ title: '猫プロフィール' }} />
        <Stack.Screen name="DiaryEntry" component={DiaryEntryScreen} options={({ route }) => ({ title: route.params?.id ? '日記を編集' : '新規投稿', presentation: 'modal' })} />
        <Stack.Screen name="DayDetail" component={DayDetailScreen} options={{ title: 'この日の記録' }} />
        <Stack.Screen name="HealthRecordEdit" component={HealthRecordEditScreen} options={{ title: '健康記録を追加', presentation: 'modal' }} />
        <Stack.Screen name="AppointmentEdit" component={AppointmentEditScreen} options={({ route }) => ({ title: route.params?.id ? '予定を編集' : '予定を追加', presentation: 'modal' })} />
        <Stack.Screen name="CatEdit" component={CatEditScreen} options={({ route }) => ({ title: route.params?.id ? '猫を編集' : '猫を追加', presentation: 'modal' })} />
        <Stack.Screen name="Stats" component={StatsScreen} options={{ title: '統計' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return <ThemeProvider><CatProvider><AppNavigator /></CatProvider></ThemeProvider>;
}
