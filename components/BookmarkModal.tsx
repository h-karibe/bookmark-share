import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Check, Plus } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface BookmarkList {
  id: string;
  name: string;
}

interface BookmarkModalProps {
  visible: boolean;
  bookId: string;
  bookTitle: string;
  onClose: () => void;
  onSave: (listIds: string[]) => Promise<void>;
}

export default function BookmarkModal({
  visible,
  bookId,
  bookTitle,
  onClose,
  onSave,
}: BookmarkModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [lists, setLists] = useState<BookmarkList[]>([]);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');

  useEffect(() => {
    if (visible && user) {
      loadBookmarkLists();
      loadExistingBookmarks();
    }
  }, [visible, bookId, user]);

  const loadBookmarkLists = async () => {
    if (!user) return;

    setLoadingLists(true);
    try {
      const { data, error } = await supabase
        .from('bookmark_lists')
        .select('id, name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setLists(data || []);
    } catch (error) {
      console.error('Error loading bookmark lists:', error);
    } finally {
      setLoadingLists(false);
    }
  };

  const loadExistingBookmarks = async () => {
    if (!user) return;

    try {
      console.log('[BookmarkModal] Loading bookmarks for book ID:', bookId);

      const { data: userLists } = await supabase
        .from('bookmark_lists')
        .select('id')
        .eq('user_id', user.id);

      if (!userLists || userLists.length === 0) {
        console.log('[BookmarkModal] No user lists found');
        setSelectedListIds([]);
        return;
      }

      const userListIds = userLists.map(list => list.id);
      console.log('[BookmarkModal] User list IDs:', userListIds);

      const { data, error } = await supabase
        .from('bookmark_list_items')
        .select('bookmark_list_id, book_id')
        .eq('book_id', bookId)
        .in('bookmark_list_id', userListIds);

      console.log('[BookmarkModal] Query result:', { data, error });
      if (error) throw error;
      const existingListIds = data?.map(item => item.bookmark_list_id) || [];
      console.log('[BookmarkModal] Existing bookmarks:', existingListIds);
      setSelectedListIds(existingListIds);
    } catch (error) {
      console.error('Error loading existing bookmarks:', error);
      setSelectedListIds([]);
    }
  };

  const toggleList = (listId: string) => {
    setSelectedListIds(prev =>
      prev.includes(listId)
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    );
  };

  const handleCreateList = async () => {
    if (!user || !newListName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('bookmark_lists')
        .insert({
          user_id: user.id,
          name: newListName.trim(),
          is_public: false,
        })
        .select('id, name')
        .single();

      if (error) throw error;

      setLists(prev => [...prev, data]);
      setSelectedListIds(prev => [...prev, data.id]);
      setNewListName('');
      setCreatingList(false);
    } catch (error) {
      console.error('Error creating list:', error);
    }
  };

  const handleSave = async () => {
    if (selectedListIds.length === 0) {
      return;
    }

    setLoading(true);
    try {
      await onSave(selectedListIds);
      setSelectedListIds([]);
      onClose();
    } catch (error) {
      console.error('Error saving bookmark:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedListIds([]);
    setCreatingList(false);
    setNewListName('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>ブックマークを追加</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.label}>書籍</Text>
              <Text style={styles.bookTitle} numberOfLines={2}>
                {bookTitle}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>
                保存先リスト <Text style={styles.required}>*</Text>
              </Text>
              {loadingLists ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#2563eb" />
                </View>
              ) : (
                <>
                  {lists.length === 0 && !creatingList ? (
                    <Text style={styles.emptyText}>リストがありません</Text>
                  ) : (
                    <View style={styles.listContainer}>
                      {lists.map(list => (
                        <TouchableOpacity
                          key={list.id}
                          style={[
                            styles.listItem,
                            selectedListIds.includes(list.id) && styles.listItemSelected,
                          ]}
                          onPress={() => toggleList(list.id)}
                          disabled={loading}
                        >
                          <View
                            style={[
                              styles.checkbox,
                              selectedListIds.includes(list.id) && styles.checkboxSelected,
                            ]}
                          >
                            {selectedListIds.includes(list.id) && (
                              <Check size={16} color="#fff" />
                            )}
                          </View>
                          <Text
                            style={[
                              styles.listItemText,
                              selectedListIds.includes(list.id) && styles.listItemTextSelected,
                            ]}
                          >
                            {list.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {creatingList ? (
                    <View style={styles.createListContainer}>
                      <TextInput
                        style={styles.createListInput}
                        value={newListName}
                        onChangeText={setNewListName}
                        placeholder="リスト名を入力"
                        placeholderTextColor="#9ca3af"
                        autoFocus
                      />
                      <View style={styles.createListButtons}>
                        <TouchableOpacity
                          style={[styles.createListButton, styles.createListCancelButton]}
                          onPress={() => {
                            setCreatingList(false);
                            setNewListName('');
                          }}
                        >
                          <Text style={styles.createListCancelText}>キャンセル</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.createListButton,
                            styles.createListSaveButton,
                            !newListName.trim() && styles.createListButtonDisabled,
                          ]}
                          onPress={handleCreateList}
                          disabled={!newListName.trim()}
                        >
                          <Text style={styles.createListSaveText}>作成</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.addListButton}
                      onPress={() => setCreatingList(true)}
                      disabled={loading}
                    >
                      <Plus size={20} color="#2563eb" />
                      <Text style={styles.addListButtonText}>
                        新しいブックマークリストを作成
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.saveButton,
                (loading || selectedListIds.length === 0) && styles.buttonDisabled,
              ]}
              onPress={handleSave}
              disabled={loading || selectedListIds.length === 0}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>保存</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  required: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  bookTitle: {
    fontSize: 16,
    color: '#4b5563',
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    padding: 20,
  },
  listContainer: {
    gap: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  listItemSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  listItemText: {
    fontSize: 16,
    color: '#1f2937',
    flex: 1,
  },
  listItemTextSelected: {
    color: '#2563eb',
    fontWeight: '600',
  },
  footer: {
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
  saveButton: {
    backgroundColor: '#2563eb',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  addListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    marginTop: 8,
  },
  addListButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    marginLeft: 8,
  },
  createListContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  createListInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  createListButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  createListButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  createListCancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  createListCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  createListSaveButton: {
    backgroundColor: '#2563eb',
  },
  createListSaveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  createListButtonDisabled: {
    opacity: 0.5,
  },
});
