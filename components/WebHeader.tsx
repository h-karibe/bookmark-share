import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen } from 'lucide-react-native';
import { AuthButton } from './AuthButton';

interface WebHeaderProps {
  maxWidth?: number;
}

export const WebHeader = ({ maxWidth = 800 }: WebHeaderProps) => {
  const router = useRouter();

  return (
    <View style={styles.headerWrapper}>
      <View style={[styles.headerContent, { maxWidth }]}>
        <TouchableOpacity 
          style={styles.logoContainer} 
          onPress={() => router.push('/')}
        >
          <BookOpen size={28} color="#2563eb" />
          <Text style={styles.logoText}>Share Books</Text>
        </TouchableOpacity>
        
        <View style={styles.rightContainer}>
          <AuthButton />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerWrapper: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
    zIndex: 10,
    // Web用の影
    ...Platform.select({
      web: {
        position: 'sticky',
        top: 0,
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      },
    }),
  },
  headerContent: {
    width: '100%',
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
