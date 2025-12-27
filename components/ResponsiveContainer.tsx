import React from 'react';
import { View, Text, StyleSheet, Platform, ViewProps, SafeAreaView } from 'react-native';
import { WebHeader } from './WebHeader';

interface ResponsiveContainerProps extends ViewProps {
  children: React.ReactNode;
  maxWidth?: number;
  title?: string;
}

export const ResponsiveContainer = ({
  children,
  maxWidth = 800,
  title,
  style,
  ...props
}: ResponsiveContainerProps) => {
  const InnerComponent = Platform.OS === 'web' ? View : SafeAreaView;

  return (
    <View style={[styles.outerContainer, style]} {...props}>
      {Platform.OS === 'web' && <WebHeader maxWidth={maxWidth} />}
      <InnerComponent style={[styles.innerContainer, Platform.OS === 'web' && { maxWidth }]}>
        {Platform.OS === 'web' && title && (
          <View style={styles.webTitleContainer}>
            <Text style={styles.webTitleText}>{title}</Text>
          </View>
        )}
        {children}
      </InnerComponent>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center', // 子要素（innerContainer）を中央寄せ
    backgroundColor: '#f3f4f6', // 背景色を薄いグレーに統一
  },
  innerContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#ffffff', // コンテンツエリアは白
    ...(Platform.OS === 'web'
      ? {
          minHeight: '100%',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        }
      : {}),
  },
  webTitleContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#fff',
  },
  webTitleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
});
