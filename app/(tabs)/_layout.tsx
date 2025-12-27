import { Tabs, useSegments } from 'expo-router';
import { Platform } from 'react-native';
import { Search, Users, BookOpen, Settings } from 'lucide-react-native';
import { AuthButton } from '@/components/AuthButton';

export default function TabLayout() {
  const segments = useSegments();
  const isLoginPage = segments[segments.length - 1] === 'login';

  return (
    <Tabs
      screenOptions={{
        headerShown: Platform.OS !== 'web',
        headerRight: () => 
          (isLoginPage || Platform.OS === 'web') ? null : <AuthButton />,
        headerStyle: {
          backgroundColor: '#ffffff',
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: 'bold',
          color: '#1f2937',
        },
        headerShadowVisible: true,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e5e7eb',
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#6b7280',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '本を見つける',
          tabBarIcon: ({ color, size }) => (
            <Search size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'みんなのブックマーク',
          tabBarIcon: ({ color, size }) => (
            <Users size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: 'マイブックマーク',
          tabBarIcon: ({ color, size }) => (
            <BookOpen size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '設定',
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="book-detail"
        options={{
          title: '本の情報',
          href: null,
        }}
      />
      <Tabs.Screen
        name="list-detail"
        options={{
          title: 'リストの内容',
          href: null,
        }}
      />
      <Tabs.Screen
        name="public-list-detail"
        options={{
          title: 'リストの内容',
          href: null,
        }}
      />
      <Tabs.Screen
        name="user-lists"
        options={{
          title: 'ユーザーのリスト',
          href: null,
        }}
      />
      <Tabs.Screen
        name="login"
        options={{
          title: 'ログイン',
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile-edit"
        options={{
          title: 'ユーザー情報変更',
          href: null,
        }}
      />
    </Tabs>
  );
}
