import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { MessageSquare, Send, MoreVertical, AlertCircle, Ban } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import ReportModal from './ReportModal';
import BlockUserModal from './BlockUserModal';

interface Review {
  id: string;
  user_id: string;
  review: string;
  created_at: string;
  username: string;
}

interface BookReviewsProps {
  bookIsbn: string;
}

export default function BookReviews({ bookIsbn }: BookReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [newReview, setNewReview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const { user } = useAuth();

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);

      const { data: bookData } = await supabase
        .from('books')
        .select('id')
        .eq('isbn', bookIsbn)
        .maybeSingle();

      if (!bookData) {
        setReviews([]);
        return;
      }

      let blockedUserIds: string[] = [];
      if (user) {
        const { data: blockedData } = await supabase
          .from('user_blocks')
          .select('blocked_id')
          .eq('blocker_id', user.id);

        if (blockedData) {
          blockedUserIds = blockedData.map((block) => block.blocked_id);
        }
      }

      const { data: reviewsData, error } = await supabase
        .from('book_reviews')
        .select('id, user_id, review, created_at, profiles(username)')
        .eq('book_id', bookData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedReviews = (reviewsData || [])
        .filter((review) => !blockedUserIds.includes(review.user_id))
        .map((review) => ({
          ...review,
          username: (review.profiles as any)?.username || '不明',
        }));

      setReviews(formattedReviews as Review[]);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [bookIsbn, user]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSubmitReview = async () => {
    if (!user) {
      alert('ログインが必要です');
      return;
    }

    if (!newReview.trim()) {
      alert('書評を入力してください');
      return;
    }

    if (newReview.length > 255) {
      alert('書評は255文字以内で入力してください');
      return;
    }

    try {
      setSubmitting(true);

      const { data: bookData } = await supabase
        .from('books')
        .select('id')
        .eq('isbn', bookIsbn)
        .maybeSingle();

      if (!bookData) {
        alert('書籍情報が見つかりません');
        return;
      }

      const { error } = await supabase.from('book_reviews').insert({
        book_id: bookData.id,
        user_id: user.id,
        review: newReview.trim(),
      });

      if (error) throw error;

      setNewReview('');
      fetchReviews();
    } catch (err) {
      console.error('Error submitting review:', err);
      alert('書評の投稿に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleExpanded = (reviewId: string) => {
    setExpandedReviews((prev) => {
      const next = new Set(prev);
      if (next.has(reviewId)) {
        next.delete(reviewId);
      } else {
        next.add(reviewId);
      }
      return next;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const needsExpansion = (text: string) => {
    const lines = text.split('\n');
    return lines.length > 3;
  };

  const getTruncatedText = (text: string) => {
    const lines = text.split('\n');
    return lines.slice(0, 3).join('\n');
  };

  const handleOpenMenu = (review: Review) => {
    setSelectedReview(review);
    setMenuVisible(review.id);
  };

  const handleCloseMenu = () => {
    setMenuVisible(null);
    setSelectedReview(null);
  };

  const handleOpenReportModal = () => {
    setMenuVisible(null);
    setReportModalVisible(true);
  };

  const handleOpenBlockModal = () => {
    setMenuVisible(null);
    setBlockModalVisible(true);
  };

  const handleReportClose = () => {
    setReportModalVisible(false);
    setSelectedReview(null);
  };

  const handleBlockClose = () => {
    setBlockModalVisible(false);
    setSelectedReview(null);
  };

  const handleBlockSuccess = () => {
    fetchReviews();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#2563eb" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MessageSquare size={20} color="#1f2937" />
        <Text style={styles.title}>書評 ({reviews.length})</Text>
      </View>

      {user && (
        <View style={styles.inputSection}>
          <TextInput
            style={styles.input}
            placeholder="書評を書く（255文字まで）"
            placeholderTextColor="#9ca3af"
            value={newReview}
            onChangeText={setNewReview}
            multiline
            maxLength={255}
            editable={!submitting}
          />
          <View style={styles.inputFooter}>
            <Text style={styles.charCount}>
              {newReview.length}/255
            </Text>
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmitReview}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Send size={16} color="#fff" />
                  <Text style={styles.submitButtonText}>投稿</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.reviewsList}>
        {reviews.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>まだ書評がありません</Text>
          </View>
        ) : (
          reviews.map((review) => {
            const isExpanded = expandedReviews.has(review.id);
            const shouldShowButton = needsExpansion(review.review);
            const displayText = isExpanded || !shouldShowButton
              ? review.review
              : getTruncatedText(review.review);

            return (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewHeaderLeft}>
                    <Text style={styles.username}>{review.username}</Text>
                    <Text style={styles.date}>{formatDate(review.created_at)}</Text>
                  </View>
                  {(!user || user.id !== review.user_id) && (
                    <TouchableOpacity
                      style={styles.menuButton}
                      onPress={() => handleOpenMenu(review)}
                    >
                      <MoreVertical size={20} color="#9ca3af" />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.reviewText}>{displayText}</Text>
                {shouldShowButton && (
                  <TouchableOpacity
                    style={styles.expandButton}
                    onPress={() => toggleExpanded(review.id)}
                  >
                    <Text style={styles.expandButtonText}>
                      {isExpanded ? '閉じる' : '続きを読む'}
                    </Text>
                  </TouchableOpacity>
                )}

                {menuVisible === review.id && (
                  <Modal visible transparent animationType="fade">
                    <TouchableOpacity
                      style={styles.menuOverlay}
                      activeOpacity={1}
                      onPress={handleCloseMenu}
                    >
                      <View style={styles.menuContainer}>
                        <TouchableOpacity
                          style={styles.menuItem}
                          onPress={handleOpenReportModal}
                        >
                          <AlertCircle size={20} color="#ef4444" />
                          <Text style={styles.menuItemText}>通報する</Text>
                        </TouchableOpacity>
                        {user && (
                          <>
                            <View style={styles.menuDivider} />
                            <TouchableOpacity
                              style={styles.menuItem}
                              onPress={handleOpenBlockModal}
                            >
                              <Ban size={20} color="#ef4444" />
                              <Text style={styles.menuItemText}>
                                ユーザーをブロック
                              </Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </TouchableOpacity>
                  </Modal>
                )}
              </View>
            );
          })
        )}
      </View>

      {selectedReview && (
        <>
          <ReportModal
            visible={reportModalVisible}
            onClose={handleReportClose}
            contentType="review"
            contentId={selectedReview.id}
            reportedUserId={selectedReview.user_id}
            reportedUsername={selectedReview.username}
          />
          <BlockUserModal
            visible={blockModalVisible}
            onClose={handleBlockClose}
            userId={selectedReview.user_id}
            username={selectedReview.username}
            onBlockSuccess={handleBlockSuccess}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  inputSection: {
    marginBottom: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  input: {
    fontSize: 14,
    color: '#1f2937',
    minHeight: 80,
    textAlignVertical: 'top',
    paddingVertical: 8,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  charCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  reviewsList: {
    gap: 12,
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  reviewCard: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewHeaderLeft: {
    flex: 1,
    gap: 4,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  date: {
    fontSize: 12,
    color: '#9ca3af',
  },
  menuButton: {
    padding: 4,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  menuItemText: {
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 4,
  },
  reviewText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  expandButton: {
    marginTop: 8,
    paddingVertical: 4,
  },
  expandButtonText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '500',
  },
});
