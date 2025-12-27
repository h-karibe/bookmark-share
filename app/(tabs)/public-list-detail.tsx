import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, User, ExternalLink } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import { generateAmazonLink } from '@/lib/amazon';
import { ShareMenu } from '@/components/ShareMenu';
import { getShareableUrl } from '@/lib/share';
import { ResponsiveContainer } from '@/components/ResponsiveContainer';

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
  username: string;
}

export default function PublicListDetailScreen() {
  const { listId, from } = useLocalSearchParams<{ listId: string; from?: string }>();
  const router = useRouter();
  const [listInfo, setListInfo] = useState<ListInfo | null>(null);
  const [items, setItems] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchListData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: listData, error: listError } = await supabase
        .from('bookmark_lists')
        .select('name, description, is_public, user_id, profiles(username)')
        .eq('id', listId)
        .eq('is_public', true)
        .maybeSingle();

      if (listError) throw listError;
      if (!listData) {
        setError('リストが見つかりません');
        return;
      }

      setListInfo({
        ...listData,
        username: (listData.profiles as any)?.username || '不明',
      });

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

      if (itemsError) throw itemsError;
      setItems((itemsData || []) as any);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching list data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [listId]);

  useFocusEffect(
    useCallback(() => {
      if (listId) {
        fetchListData();
      }
    }, [listId, fetchListData])
  );

  const handleBookPress = (isbn: string) => {
    if (!isbn) {
      console.error('ISBN is missing');
      return;
    }
    router.push(`/book-detail?isbn=${encodeURIComponent(isbn)}`);
  };

  const handleBack = () => {
    if (from === 'discover') {
      router.push('/discover');
    } else if (from === 'user-lists') {
      router.back();
    } else {
      router.back();
    }
  };

  const handleUserPress = () => {
    if (listInfo) {
      router.push(`/user-lists?userId=${encodeURIComponent(listInfo.user_id)}&username=${encodeURIComponent(listInfo.username)}`);
    }
  };

  const handleAmazonLink = async (isbn: string) => {
    const url = generateAmazonLink(isbn);
    await WebBrowser.openBrowserAsync(url);
  };

  if (loading) {
    return (
      <ResponsiveContainer>
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        </View>
      </ResponsiveContainer>
    );
  }

  if (error || !listInfo) {
    return (
      <ResponsiveContainer>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack}>
              <ArrowLeft size={24} color="#1f2937" />
            </TouchableOpacity>
          </View>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error || 'リストが見つかりません'}</Text>
          </View>
        </View>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack}>
            <ArrowLeft size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {listInfo.name}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

      <View style={styles.infoSection}>
        <TouchableOpacity style={styles.userSection} onPress={handleUserPress}>
          <User size={16} color="#2563eb" />
          <Text style={styles.usernameText}>{listInfo.username}</Text>
        </TouchableOpacity>
        {listId && (
          <ShareMenu
            shareData={{
              title: listInfo.name,
              url: getShareableUrl(listId),
              description: listInfo.description,
            }}
          />
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>本がありません</Text>
          <Text style={styles.emptySubtitle}>
            このリストにはまだ本が追加されていません
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.bookmarkCard}>
              <TouchableOpacity
                style={styles.cardContent}
                onPress={() => handleBookPress(item.book.isbn)}
              >
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
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.amazonButton}
                onPress={() => handleAmazonLink(item.book.isbn)}
              >
                <ExternalLink size={16} color="#fff" />
                <Text style={styles.amazonButtonText}>Amazonで見る</Text>
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={fetchListData}
          showsVerticalScrollIndicator={false}
        />
      )}
      </View>
    </ResponsiveContainer>
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
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  usernameText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
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
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderColor: '#e5e7eb',
    borderWidth: 1,
  },
  cardContent: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  amazonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ff9900',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 8,
  },
  amazonButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
});
