import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { Share2, X as XIcon, MessageCircle, Facebook, Copy } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { generateShareUrls, copyToClipboard, ShareData } from '@/lib/share';

interface ShareMenuProps {
  shareData: ShareData;
  onClose?: () => void;
}

export function ShareMenu({ shareData, onClose }: ShareMenuProps) {
  const [visible, setVisible] = useState(false);
  const shareUrls = generateShareUrls(shareData);

  const handleShare = async (platform: 'twitter' | 'line' | 'facebook') => {
    try {
      await WebBrowser.openBrowserAsync(shareUrls[platform]);
    } catch (error) {
      console.error('Failed to open browser:', error);
    }
    setVisible(false);
    onClose?.();
  };

  const handleCopyLink = async () => {
    const success = await copyToClipboard(shareData.url);
    if (success) {
      Alert.alert('コピーしました', 'リンクをクリップボードにコピーしました');
    } else {
      Alert.alert('エラー', 'リンクのコピーに失敗しました');
    }
    setVisible(false);
    onClose?.();
  };

  return (
    <>
      <TouchableOpacity
        style={styles.shareButton}
        onPress={() => setVisible(true)}
      >
        <Share2 size={20} color="#2563eb" />
        <Text style={styles.shareButtonText}>共有</Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => {
            setVisible(false);
            onClose?.();
          }}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>共有</Text>
              <TouchableOpacity
                onPress={() => {
                  setVisible(false);
                  onClose?.();
                }}
              >
                <XIcon size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.shareOptions}>
              <TouchableOpacity
                style={styles.shareOption}
                onPress={() => handleShare('twitter')}
              >
                <View style={[styles.iconCircle, { backgroundColor: '#1da1f2' }]}>
                  <XIcon size={24} color="#fff" />
                </View>
                <Text style={styles.shareOptionText}>X</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareOption}
                onPress={() => handleShare('line')}
              >
                <View style={[styles.iconCircle, { backgroundColor: '#06c755' }]}>
                  <MessageCircle size={24} color="#fff" />
                </View>
                <Text style={styles.shareOptionText}>LINE</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareOption}
                onPress={() => handleShare('facebook')}
              >
                <View style={[styles.iconCircle, { backgroundColor: '#1877f2' }]}>
                  <Facebook size={24} color="#fff" />
                </View>
                <Text style={styles.shareOptionText}>Facebook</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareOption}
                onPress={handleCopyLink}
              >
                <View style={[styles.iconCircle, { backgroundColor: '#6b7280' }]}>
                  <Copy size={24} color="#fff" />
                </View>
                <Text style={styles.shareOptionText}>リンクをコピー</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  shareOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  shareOption: {
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareOptionText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
});
