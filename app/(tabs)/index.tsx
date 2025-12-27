import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  FlatList,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, Search as SearchIcon, HelpCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import SearchHelpModal from '@/components/SearchHelpModal';

interface Book {
  id: string;
  isbn: string;
  title: string;
  authors: string[];
  thumbnail_url: string | null;
}

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentStartIndex, setCurrentStartIndex] = useState(0);
  const router = useRouter();

  const ITEMS_PER_PAGE = 20;
  const MAX_RESULTS = 100;

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setCurrentStartIndex(0);
    setHasMore(true);

    try {
      const { data } = await supabase.functions.invoke('search-ebook', {
        body: { query: searchQuery, limit: ITEMS_PER_PAGE, startIndex: 0 },
      });

      if (data?.books) {
        setSearchResults(data.books);
        if (data.books.length < ITEMS_PER_PAGE) {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore || !searchQuery.trim()) return;

    const nextStartIndex = currentStartIndex + ITEMS_PER_PAGE;

    if (nextStartIndex >= MAX_RESULTS) {
      setHasMore(false);
      return;
    }

    setLoadingMore(true);

    try {
      const { data } = await supabase.functions.invoke('search-ebook', {
        body: {
          query: searchQuery,
          limit: ITEMS_PER_PAGE,
          startIndex: nextStartIndex
        },
      });

      if (data?.books && data.books.length > 0) {
        setSearchResults((prev) => [...prev, ...data.books]);
        setCurrentStartIndex(nextStartIndex);

        if (data.books.length < ITEMS_PER_PAGE || nextStartIndex + ITEMS_PER_PAGE >= MAX_RESULTS) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Load more error:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleBookPress = (isbn: string) => {
    if (!isbn) {
      console.error('ISBN is missing');
      return;
    }
    router.push(`/book-detail?isbn=${encodeURIComponent(isbn)}`);
  };

  const handleBarcodeScanned = (isbn: string) => {
    setScannerVisible(false);
    if (!isbn) {
      console.error('ISBN is missing');
      return;
    }
    router.push(`/book-detail?isbn=${encodeURIComponent(isbn)}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <SearchIcon size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="タイトル、著者、ISBN で検索"
            placeholderTextColor="#9ca3af"
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>

        <TouchableOpacity
          style={styles.helpButton}
          onPress={() => setHelpModalVisible(true)}
        >
          <HelpCircle size={24} color="#6b7280" />
        </TouchableOpacity>

        {Platform.OS !== 'web' && (
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => setScannerVisible(true)}
          >
            <Camera size={24} color="#2563eb" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>検索中...</Text>
        </View>
      ) : searchResults.length > 0 ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.bookCard}
              onPress={() => handleBookPress(item.isbn)}
            >
              {item.thumbnail_url && (
                <Image
                  source={{ uri: item.thumbnail_url }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
              )}
              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.bookAuthors} numberOfLines={1}>
                  {item.authors.join(', ')}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color="#2563eb" />
                <Text style={styles.loadingMoreText}>読み込み中...</Text>
              </View>
            ) : !hasMore && searchResults.length >= MAX_RESULTS ? (
              <View style={styles.loadingMoreContainer}>
                <Text style={styles.limitText}>最大{MAX_RESULTS}件まで表示しています</Text>
              </View>
            ) : null
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <SearchIcon size={64} color="#d1d5db" style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>書籍を検索</Text>
          <Text style={styles.emptySubtitle}>
            タイトルや著者名で検索するか、{'\n'}バーコードをスキャンしてください
          </Text>
        </View>
      )}

      <BarcodeScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onBarcodeScanned={handleBarcodeScanned}
      />

      <SearchHelpModal
        visible={helpModalVisible}
        onClose={() => setHelpModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  helpButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  listContent: {
    padding: 16,
  },
  bookCard: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  thumbnail: {
    width: 80,
    height: 120,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    marginRight: 12,
  },
  bookInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  bookAuthors: {
    fontSize: 14,
    color: '#6b7280',
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
    lineHeight: 20,
  },
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 14,
    color: '#6b7280',
  },
  limitText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
