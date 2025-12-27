import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { ResponsiveContainer } from '@/components/ResponsiveContainer';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <ResponsiveContainer>
        <View style={styles.container}>
          <Text style={styles.text}>This screen doesn't exist.</Text>
          <Link href="/" style={styles.link}>
            <Text>Go to home screen!</Text>
          </Link>
        </View>
      </ResponsiveContainer>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  text: {
    fontSize: 20,
    fontWeight: 600,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
