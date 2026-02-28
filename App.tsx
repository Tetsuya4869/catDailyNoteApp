import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import NewEntryScreen from './src/screens/NewEntryScreen';
import EntryDetailScreen from './src/screens/EntryDetailScreen';
import { RootStackParamList } from './src/types/DiaryEntry';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#faf9f7' },
          headerTintColor: '#333',
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={({ navigation }) => ({
            title: '🐱 にゃんにゃん日記',
            headerRight: () => (
              <TouchableOpacity
                onPress={() => navigation.navigate('NewEntry')}
                style={{ marginRight: 4 }}
              >
                <Text style={{ fontSize: 28, color: '#f4845f' }}>+</Text>
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen
          name="NewEntry"
          component={NewEntryScreen}
          options={{ title: '新しい日記' }}
        />
        <Stack.Screen
          name="EntryDetail"
          component={EntryDetailScreen}
          options={{ title: '日記の詳細' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
