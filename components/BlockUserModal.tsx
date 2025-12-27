import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface BlockUserModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  onBlockSuccess?: () => void;
}

export default function BlockUserModal({
  visible,
  onClose,
  userId,
  username,
  onBlockSuccess,
}: BlockUserModalProps) {
  const { user } = useAuth();
  const [isBlocking, setIsBlocking] = useState(false);

  const handleBlock = async () => {
    if (!user) {
      Alert.alert('エラー', 'ログインが必要です');
      return;
    }

    setIsBlocking(true);

    try {
      const { error } = await supabase.from('user_blocks').insert({
        blocker_id: user.id,
        blocked_id: userId,
      });

      if (error) {
        if (error.code === '23505') {
          Alert.alert('通知', 'すでにこのユーザーをブロックしています');
        } else {
          throw error;
        }
      } else {
        Alert.alert('完了', `${username}さんをブロックしました`);
        onBlockSuccess?.();
        onClose();
      }
    } catch (error) {
      console.error('Block error:', error);
      Alert.alert('エラー', 'ブロックに失敗しました');
    } finally {
      setIsBlocking(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>ユーザーをブロック</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              disabled={isBlocking}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.username}>{username}さん</Text>
            <Text style={styles.description}>
              ブロックすると、このユーザーの書評や公開リストが表示されなくなります。
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isBlocking}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.blockButton,
                isBlocking && styles.blockButtonDisabled,
              ]}
              onPress={handleBlock}
              disabled={isBlocking}
            >
              {isBlocking ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.blockButtonText}>ブロックする</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    marginBottom: 24,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  blockButton: {
    backgroundColor: '#ef4444',
  },
  blockButtonDisabled: {
    opacity: 0.6,
  },
  blockButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
