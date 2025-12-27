import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Plus, Lock, Globe, Trash2, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface BookmarkList {
  id: string;
  name: string;
  is_public: boolean;
  created_at: string;
  item_count: number;
}

type FilterType = 'all' | 'private' | 'public';

export default function BookmarksScreen() {
  const [lists, setLists] = useState<BookmarkList[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newListModalVisible, setNewListModalVisible] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [creatingList, setCreatingList] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const fetchLists = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: listsData, error: fetchError } = await supabase
        .from('bookmark_lists')
        .select('id, name, is_public, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      const listsWithCount = await Promise.all(
        (listsData || []).map(async (list) => {
          const { count } = await supabase
            .from('bookmark_list_items')
            .select('*', { count: 'exact', head: true })
            .eq('bookmark_list_id', list.id);

          return {
            ...list,
            item_count: count || 0,
          };
        })
      );

      setLists(listsWithCount);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching lists:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading && !user) {
        router.push('/login');
        return;
      }
      if (user) {
        fetchLists();
      }
    }, [authLoading, user, router, fetchLists])
  );

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      return;
    }

    setCreatingList(true);
    try {
      const { error } = await supabase.from('bookmark_lists').insert({
        user_id: user!.id,
        name: newListName.trim(),
        description: newListDescription.trim(),
        is_public: false,
      });

      if (error) throw error;

      setNewListName('');
      setNewListDescription('');
      setNewListModalVisible(false);
      fetchLists();
    } catch (err) {
      console.error('Error creating list:', err);
      alert('リストの作成に失敗しました');
    } finally {
      setCreatingList(false);
    }
  };

  const handleDeleteList = async (listId: string, listName: string) => {
    Alert.alert(
      'リストを削除',
      `「${listName}」を削除しますか？リスト内の全てのブックマークも削除されます。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('bookmark_lists')
                .delete()
                .eq('id', listId);

              if (error) throw error;

              setLists((prev) => prev.filter((item) => item.id !== listId));
            } catch (err) {
              console.error('Error deleting list:', err);
              alert('エラーが発生しました');
            }
          },
        },
      ]
    );
  };

  const handleTogglePublic = async (listId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('bookmark_lists')
        .update({ is_public: !currentStatus })
        .eq('id', listId);

      if (error) throw error;

      setLists((prev) =>
        prev.map((item) =>
          item.id === listId ? { ...item, is_public: !currentStatus } : item
        )
      );
    } catch (err) {
      console.error('Error toggling public status:', err);
      alert('エラーが発生しました');
    }
  };

  const handleListPress = (listId: string) => {
    router.push(`/list-detail?listId=${encodeURIComponent(listId)}&from=bookmarks`);
  };

  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return null;
  }

  if (error && !lists.length) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const filteredLists = lists.filter((list) => {
    if (filter === 'all') return true;
    if (filter === 'private') return !list.is_public;
    if (filter === 'public') return list.is_public;
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setNewListModalVisible(true)}
        >
          <Plus size={20} color="#2563eb" />
          <Text style={styles.addButtonText}>新しいリスト</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'all' && styles.filterButtonTextActive,
            ]}
          >
            全て
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'private' && styles.filterButtonActive,
          ]}
          onPress={() => setFilter('private')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'private' && styles.filterButtonTextActive,
            ]}
          >
            非公開
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'public' && styles.filterButtonActive]}
          onPress={() => setFilter('public')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'public' && styles.filterButtonTextActive,
            ]}
          >
            公開
          </Text>
        </TouchableOpacity>
      </View>

      {filteredLists.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>
            {filter === 'all' && 'リストがありません'}
            {filter === 'private' && '非公開リストがありません'}
            {filter === 'public' && '公開リストがありません'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {filter === 'all' && '新しいリストを作成してブックマークを整理しましょう'}
            {filter === 'private' && '非公開のリストがまだありません'}
            {filter === 'public' && '公開中のリストがまだありません'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredLists}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.listCard}
              onPress={() => handleListPress(item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.listHeader}>
                <View style={styles.listTitleContainer}>
                  <Text style={styles.listName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.itemCount}>{item.item_count}冊</Text>
                </View>
                <View style={styles.actionsContainer}>
                  <TouchableOpacity
                    style={styles.statusContainer}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleTogglePublic(item.id, item.is_public);
                    }}
                    activeOpacity={0.7}
                  >
                    {item.is_public ? (
                      <Globe size={20} color="#22c55e" />
                    ) : (
                      <Lock size={20} color="#6b7280" />
                    )}
                    <View
                      style={[
                        styles.statusBadge,
                        item.is_public ? styles.publicBadge : styles.privateBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          item.is_public
                            ? styles.publicBadgeText
                            : styles.privateBadgeText,
                        ]}
                      >
                        {item.is_public ? '公開中' : '非公開'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteList(item.id, item.name);
                    }}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={fetchLists}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={newListModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setNewListModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setNewListModalVisible(false);
            }}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>新しいリストを作成</Text>
                  <TouchableOpacity
                    onPress={() => setNewListModalVisible(false)}
                    style={styles.closeButton}
                  >
                    <X size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.modalContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.inputLabel}>リスト名</Text>
                  <TextInput
                    style={styles.input}
                    value={newListName}
                    onChangeText={setNewListName}
                    placeholder="例: 読みたい技術書"
                    placeholderTextColor="#9ca3af"
                    editable={!creatingList}
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                    blurOnSubmit={true}
                  />

                  <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                    コメント（任意）
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={newListDescription}
                    onChangeText={setNewListDescription}
                    placeholder="このリストについて説明を追加できます"
                    placeholderTextColor="#9ca3af"
                    editable={!creatingList}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    returnKeyType="done"
                    blurOnSubmit={true}
                  />
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => setNewListModalVisible(false)}
                    disabled={creatingList}
                  >
                    <Text style={styles.cancelButtonText}>キャンセル</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.createButton,
                      (creatingList || !newListName.trim()) && styles.buttonDisabled,
                    ]}
                    onPress={handleCreateList}
                    disabled={creatingList || !newListName.trim()}
                  >
                    {creatingList ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.createButtonText}>作成</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    borderColor: '#e5e7eb',
    borderWidth: 1,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  listTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  listName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  itemCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusContainer: {
    alignItems: 'center',
    gap: 6,
    padding: 4,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  statusBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  publicBadge: {
    backgroundColor: '#dcfce7',
  },
  privateBadge: {
    backgroundColor: '#f3f4f6',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  publicBadgeText: {
    color: '#16a34a',
  },
  privateBadgeText: {
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  textArea: {
    minHeight: 80,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  createButton: {
    backgroundColor: '#2563eb',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  filterButtonActive: {
    backgroundColor: '#2563eb',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
});
