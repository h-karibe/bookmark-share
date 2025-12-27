import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { X, CheckCircle2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  contentType: 'user' | 'review';
  contentId?: string;
  reportedUserId: string;
  reportedUsername: string;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'スパム・宣伝' },
  { value: 'inappropriate', label: '不適切なコンテンツ' },
  { value: 'harassment', label: 'ハラスメント・攻撃的' },
  { value: 'impersonation', label: 'なりすまし' },
  { value: 'copyright', label: '著作権侵害' },
  { value: 'other', label: 'その他' },
];

export default function ReportModal({
  visible,
  onClose,
  contentType,
  contentId,
  reportedUserId,
  reportedUsername,
}: ReportModalProps) {
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('エラー', '通報理由を選択してください');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: user?.id || null,
        reported_user_id: reportedUserId,
        content_type: contentType,
        content_id: contentId,
        reason: selectedReason,
        details: details.trim() || null,
      });

      if (error) throw error;

      Alert.alert('完了', '通報を受け付けました。ご報告ありがとうございます。');
      handleClose();
    } catch (error) {
      console.error('Report error:', error);
      Alert.alert('エラー', '通報の送信に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setDetails('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>通報する</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              disabled={isSubmitting}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <Text style={styles.targetInfo}>
              {contentType === 'review' ? '書評' : 'ユーザー'}：
              {reportedUsername}さん
            </Text>

            <Text style={styles.sectionTitle}>通報理由</Text>
            <View style={styles.reasonsContainer}>
              {REPORT_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason.value}
                  style={[
                    styles.reasonOption,
                    selectedReason === reason.value &&
                      styles.reasonOptionSelected,
                  ]}
                  onPress={() => setSelectedReason(reason.value)}
                  disabled={isSubmitting}
                >
                  <View style={styles.reasonContent}>
                    <Text
                      style={[
                        styles.reasonText,
                        selectedReason === reason.value &&
                          styles.reasonTextSelected,
                      ]}
                    >
                      {reason.label}
                    </Text>
                    {selectedReason === reason.value && (
                      <CheckCircle2 size={20} color="#3b82f6" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>詳細（任意）</Text>
            <TextInput
              style={styles.detailsInput}
              placeholder="具体的な状況や問題点を入力してください"
              placeholderTextColor="#999"
              value={details}
              onChangeText={setDetails}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isSubmitting}
            />

            <Text style={styles.note}>
              通報内容は運営チームが確認し、適切な対応を行います。
            </Text>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                (!selectedReason || isSubmitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!selectedReason || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>送信する</Text>
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
    maxWidth: 500,
    maxHeight: '80%',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    flex: 1,
  },
  targetInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  reasonsContainer: {
    gap: 8,
    marginBottom: 24,
  },
  reasonOption: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  reasonOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  reasonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reasonText: {
    fontSize: 15,
    color: '#666',
  },
  reasonTextSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  detailsInput: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#000',
    minHeight: 100,
    marginBottom: 12,
  },
  note: {
    fontSize: 13,
    color: '#999',
    lineHeight: 18,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
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
  submitButton: {
    backgroundColor: '#3b82f6',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
