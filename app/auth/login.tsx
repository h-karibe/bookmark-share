import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import LoginForm from '@/components/LoginForm';
import { ResponsiveContainer } from '@/components/ResponsiveContainer';

export default function LoginScreen() {
  return (
    <ResponsiveContainer>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <LoginForm />
        </ScrollView>
      </KeyboardAvoidingView>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});
