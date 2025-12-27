import React from 'react';
import { View, StyleSheet, Platform, ViewProps, SafeAreaView } from 'react-native';

interface ResponsiveContainerProps extends ViewProps {
  children: React.ReactNode;
  maxWidth?: number;
}

export const ResponsiveContainer = ({
  children,
  maxWidth = 800,
  style,
  ...props
}: ResponsiveContainerProps) => {
  const InnerComponent = Platform.OS === 'web' ? View : SafeAreaView;

  return (
    <View style={[styles.outerContainer, style]} {...props}>
      <InnerComponent style={[styles.innerContainer, Platform.OS === 'web' && { maxWidth }]}>
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
});
