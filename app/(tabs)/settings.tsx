import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { ChevronRight, User, LogOut } from 'lucide-react-native';
import { ResponsiveContainer } from '@/components/ResponsiveContainer';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(tabs)/login');
  };

  const handleNavigateToProfileEdit = () => {
    router.push('/(tabs)/profile-edit');
  };

  return (
    <ResponsiveContainer title="設定">
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {Platform.OS !== 'web' && <Text style={styles.pageTitle}>設定</Text>}

        {user && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>アカウント</Text>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleNavigateToProfileEdit}
            >
              <View style={styles.menuItemLeft}>
                <User size={20} color="#333" />
                <Text style={styles.menuItemText}>ユーザー情報の変更</Text>
              </View>
              <ChevronRight size={20} color="#999" />
            </TouchableOpacity>
          </View>
        )}

        {user && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
            >
              <LogOut size={20} color="#ff3b30" />
              <Text style={styles.signOutButtonText}>ログアウト</Text>
            </TouchableOpacity>
          </View>
        )}

        {!user && (
          <View style={styles.section}>
            <View style={styles.notLoggedInContainer}>
              <Text style={styles.notLoggedInText}>
                ログインすると、ユーザー情報の変更などができます
              </Text>
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => router.push('/(tabs)/login')}
              >
                <Text style={styles.loginButtonText}>ログイン</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        </View>
      </ScrollView>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 24,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  signOutButtonText: {
    color: '#ff3b30',
    fontSize: 16,
    fontWeight: '600',
  },
  notLoggedInContainer: {
    padding: 20,
    alignItems: 'center',
  },
  notLoggedInText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
