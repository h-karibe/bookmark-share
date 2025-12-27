import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { X, Hand } from 'lucide-react-native';

const isWeb = Platform.OS === 'web';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SearchHelpModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SearchHelpModal({ visible, onClose }: SearchHelpModalProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentPage(page);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#333" />
          </TouchableOpacity>

          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            <BarcodeScannePage />
            <TextSearchPage />
          </ScrollView>

          <View style={styles.pagination}>
            <View style={[styles.dot, currentPage === 0 && styles.dotActive]} />
            <View style={[styles.dot, currentPage === 1 && styles.dotActive]} />
          </View>

          <Text style={styles.swipeHint}>← スワイプ →</Text>
        </View>
      </View>
    </Modal>
  );
}

function BarcodeScannePage() {
  return (
    <View style={styles.page}>
      <Text style={styles.title}>本のバーコードをスキャンして検索！</Text>

      <View style={styles.animationContainer}>
        {/* カメラフレーム */}
        <View style={styles.cameraFrame}>
          <View style={styles.barcodeContainer}>
            {/* ISBNバーコード（上段）- 読み取り対象 */}
            <View style={styles.barcodeSection}>
              <Text style={styles.barcodeLabel}>ISBN</Text>
              <View style={styles.barcode}>
                {Array.from({ length: 30 }).map((_, i) => (
                  <View
                    key={`isbn-${i}`}
                    style={[
                      styles.barcodeLine,
                      { width: Math.random() > 0.5 ? 3 : 2 },
                    ]}
                  />
                ))}
              </View>
              {/* スキャンライン（ISBNのみ） */}
              <View style={styles.scanLine} />
            </View>

            {/* 日本図書コード（下段）- 隠す対象 */}
            <View style={styles.barcodeSection}>
              <Text style={styles.barcodeLabel}>日本図書コード</Text>
              <View style={styles.barcode}>
                {Array.from({ length: 30 }).map((_, i) => (
                  <View
                    key={`jbc-${i}`}
                    style={[
                      styles.barcodeLine,
                      { width: Math.random() > 0.5 ? 3 : 2 },
                    ]}
                  />
                ))}
              </View>
              {/* 指のアイコン（日本図書コードを隠す） */}
              <View style={styles.handIcon}>
                <Hand size={56} color="#FF6B6B" fill="#FFE5E5" />
              </View>
            </View>
          </View>
        </View>
      </View>

      <Text style={styles.description}>
        ISBNバーコードをスキャンすると、{'\n'}
        瞬時に本の情報が見つかります
      </Text>
    </View>
  );
}

function TextSearchPage() {
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const fullText = 'ハリー・ポッター';

  useEffect(() => {
    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
      }
    }, 200);

    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);

    return () => {
      clearInterval(typingInterval);
      clearInterval(cursorInterval);
    };
  }, []);

  return (
    <View style={styles.page}>
      <Text style={styles.title}>テキストでも検索できる！</Text>

      <View style={styles.animationContainer}>
        <View style={styles.searchInputDemo}>
          <Text style={styles.inputLabel}>タイトルや著者名で検索</Text>
          <View style={styles.inputField}>
            <Text style={styles.inputText}>{displayedText}</Text>
            {showCursor && <View style={styles.cursor} />}
          </View>
        </View>
      </View>

      <Text style={styles.description}>
        本のタイトル、著者名、ISBNで{'\n'}
        かんたんに検索できます
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: SCREEN_WIDTH * 0.9,
    maxWidth: 400,
    height: 500,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  page: {
    width: SCREEN_WIDTH * 0.9 > 400 ? 400 : SCREEN_WIDTH * 0.9,
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 32,
  },
  animationContainer: {
    width: '100%',
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  cameraFrame: {
    width: 300,
    height: 240,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  barcodeContainer: {
    width: '100%',
    gap: 32,
  },
  barcodeSection: {
    position: 'relative',
    alignItems: 'center',
  },
  barcodeLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  barcode: {
    flexDirection: 'row',
    gap: 2,
    height: 40,
  },
  barcodeLine: {
    height: '100%',
    backgroundColor: '#000',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 20,
    height: 2,
    backgroundColor: '#FF4444',
    shadowColor: '#FF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  handIcon: {
    position: 'absolute',
    top: 8,
    right: 20,
  },
  searchInputDemo: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    paddingLeft: 4,
  },
  inputField: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4A90E2',
    padding: 16,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  cursor: {
    width: 2,
    height: 20,
    backgroundColor: '#4A90E2',
    marginLeft: 2,
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
  },
  dotActive: {
    backgroundColor: '#4A90E2',
    width: 24,
  },
  swipeHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
});
