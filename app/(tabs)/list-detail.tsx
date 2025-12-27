import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, X, Lock, Globe } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ShareMenu } from '@/components/ShareMenu';
import { getShareableUrl } from '@/lib/share';

interface BookmarkItem {
  id: string;
  book: {
    id: string;
    isbn: string;
    title: string;
    authors: string[];
    thumbnail_url: string | null;
  };
}

interface ListInfo {
  name: string;
  description: string;
  is_public: boolean;
  user_id: string;
}

export default function ListDetailScreen() {
  const { listId, from } = useLocalSearchParams<{ listId: string; from?: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [listInfo, setListInfo] = useState<ListInfo | null>(null);
  const [items, setItems] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchListData = useCallback(async (isInitialLoad = false) => {
    try {
      console.log('Fetching list data for listId:', listId);
      if (isInitialLoad) {
        setLoading(true);
      }
      setError(null);

      const { data: listData, error: listError } = await supabase
        .from('bookmark_lists')
        .select('name, description, is_public, user_id')
        .eq('id', listId)
        .maybeSingle();

      console.log('List data:', listData, 'List error:', listError);

      if (listError) throw listError;
      if (!listData) {
        setError('リストが見つかりません');
        return;
      }

      setListInfo(listData);

      const { data: itemsData, error: itemsError } = await supabase
        .from('bookmark_list_items')
        .select(
          `
          id,
          book:books(id, isbn, title, authors, thumbnail_url)
        `
        )
        .eq('bookmark_list_id', listId)
        .order('created_at', { ascending: false });

      if (itemsError) {
        console.error('Items error:', itemsError);
        throw itemsError;
      }

      console.log('Items data:', itemsData);
      setItems((itemsData || []) as any);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const errorDetails = JSON.stringify(err, null, 2);
      console.error('Error fetching list data:', errorDetails);
      setError(`${errorMessage}\n\nDetails: ${errorDetails}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [listId]);

  useFocusEffect(
    useCallback(() => {
      if (listId) {
        const isInitialLoad = items.length === 0 && !listInfo;
        fetchListData(isInitialLoad);
      }
    }, [listId, fetchListData, items.length, listInfo])
  );

  const handleRemoveItem = async (itemId: string) => {
    try {
      setItems((prev) => prev.filter((item) => item.id !== itemId));

      const { error } = await supabase
        .from('bookmark_list_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    } catch (err) {
      console.error('Error removing item:', err);
      alert('エラーが発生しました');
      fetchListData(false);
    }
  };

  const handleBookPress = (isbn: string) => {
    if (!isbn) {
      console.error('ISBN is missing');
      return;
    }
    router.push(`/book-detail?isbn=${encodeURIComponent(isbn)}&from=list-detail&listId=${encodeURIComponent(listId || '')}`);
  };

  const handleBack = () => {
    if (from === 'bookmarks') {
      router.push('/bookmarks');
    } else if (from === 'discover') {
      router.push('/discover');
    } else if (from === 'user-lists') {
      router.back();
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !listInfo) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack}>
            <ArrowLeft size={24} color="#1f2937" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.errorScrollContainer}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>エラーが発生しました</Text>
            <Text style={styles.errorText}>{error || 'リストが見つかりません'}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <ArrowLeft size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          ブックマーク一覧
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.listInfoSection}>
        <View style={styles.listTitleRow}>
          <Text style={styles.listTitle}>{listInfo.name}</Text>
          <View
            style={[
              styles.statusBadge,
              listInfo.is_public ? styles.publicBadge : styles.privateBadge,
            ]}
          >
            {listInfo.is_public ? (
              <Globe size={14} color="#16a34a" style={{ marginRight: 4 }} />
            ) : (
              <Lock size={14} color="#6b7280" style={{ marginRight: 4 }} />
            )}
            <Text
              style={[
                styles.statusBadgeText,
                listInfo.is_public
                  ? styles.publicBadgeText
                  : styles.privateBadgeText,
              ]}
            >
              {listInfo.is_public ? '公開中' : '非公開'}
            </Text>
          </View>
        </View>
        {listInfo.description ? (
          <Text style={styles.listDescription}>{listInfo.description}</Text>
        ) : null}
        <View style={styles.bottomRow}>
          <Text style={styles.bookCount}>{items.length}冊</Text>
          {listInfo.is_public && listId && (
            <ShareMenu
              shareData={{
                title: listInfo.name,
                url: getShareableUrl(listId),
                description: listInfo.description,
              }}
            />
          )}
        </View>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>本がありません</Text>
          <Text style={styles.emptySubtitle}>
            書籍を探してこのリストに追加してください
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.bookmarkCard}
              onPress={() => handleBookPress(item.book.isbn)}
            >
              <View style={styles.cardContent}>
                {item.book.thumbnail_url && (
                  <Image
                    source={{ uri: item.book.thumbnail_url }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.bookInfo}>
                  <Text style={styles.title} numberOfLines={2}>
                    {item.book.title}
                  </Text>
                  <Text style={styles.authors} numberOfLines={1}>
                    {item.book.authors.join(', ')}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveItem(item.id)}
              >
                <X size={20} color="#d1d5db" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchListData(false);
          }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 16,
  },
  headerSpacer: {
    width: 24,
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
  bookmarkCard: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderColor: '#e5e7eb',
    borderWidth: 1,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  thumbnail: {
    width: 80,
    height: 120,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
  },
  bookInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  authors: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  removeButton: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorScrollContainer: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  listInfoSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  listTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginRight: 12,
  },
  listDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 10,
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
});
