import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import DiaryEntryScreen from './src/screens/DiaryEntryScreen';
import { RootStackParamList } from './src/navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#FFF5E6',
          },
          headerTintColor: '#FF9966',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: '🐱 猫の日記',
          }}
        />
        <Stack.Screen
          name="DiaryEntry"
          component={DiaryEntryScreen}
          options={({ route }) => ({
            title: route.params?.id ? '日記を編集' : '新しい日記',
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
