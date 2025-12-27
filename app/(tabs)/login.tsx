import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import LoginForm from '@/components/LoginForm';
import { ResponsiveContainer } from '@/components/ResponsiveContainer';

export default function LoginScreen() {
  return (
    <ResponsiveContainer>
      <View style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.content}>
            <LoginForm />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});
