import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, BookOpen, ExternalLink, ShoppingCart } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { generateSmartAmazonLink } from '@/lib/amazon';
import { useAuth } from '@/contexts/AuthContext';
import BookmarkModal from '@/components/BookmarkModal';
import BookReviews from '@/components/BookReviews';
import { ShareMenu } from '@/components/ShareMenu';
import { getBookShareableUrl } from '@/lib/share';
import { ResponsiveContainer } from '@/components/ResponsiveContainer';

interface BookData {
  isbn: string;
  title: string;
  authors: string[];
  thumbnail_url: string | null;
  description: string;
  paper_available: boolean;
  paper_links: Record<string, string>;
  ebook_available: boolean;
  ebook_links: Record<string, string>;
}

export default function BookDetailScreen() {
  const { isbn, from, listId } = useLocalSearchParams<{ isbn: string; from?: string; listId?: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [book, setBook] = useState<BookData | null>(null);
  const [bookUuid, setBookUuid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [bookmarkModalVisible, setBookmarkModalVisible] = useState(false);

  useEffect(() => {
    if (isbn) {
      fetchBook();
    } else {
      setError('ISBNが指定されていません');
      setLoading(false);
    }
  }, [isbn]);

  const fetchBook = async (retryCount = 0) => {
    if (!isbn) return;

    try {
      setLoading(true);
      setError(null);

      const apiUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/search-ebook`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const isGoogleBooksId = isbn.startsWith('gbook_');
      const requestBody = isGoogleBooksId
        ? { googleBooksId: isbn.replace('gbook_', '') }
        : { isbn };

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
          setError(data.error);
        } else {
          setBook(data);
          saveBook(data).catch((err) => {
            console.error('Error saving book in background:', err);
          });
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);

        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          if (retryCount < 2) {
            console.log(`Timeout occurred, retrying... (attempt ${retryCount + 1})`);
            return fetchBook(retryCount + 1);
          }
          throw new Error('リクエストがタイムアウトしました。もう一度お試しください。');
        }
        throw fetchError;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching book:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveBook = async (bookData: BookData) => {
    const { data, error: upsertError } = await supabase
      .from('books')
      .upsert(
        {
          isbn: bookData.isbn,
          title: bookData.title,
          authors: bookData.authors,
          thumbnail_url: bookData.thumbnail_url,
          description: bookData.description,
          paper_available: bookData.paper_available,
          paper_links: bookData.paper_links,
          ebook_available: bookData.ebook_available,
          ebook_links: bookData.ebook_links,
        },
        { onConflict: 'isbn' }
      )
      .select()
      .maybeSingle();

    if (upsertError) {
      console.error('Error saving book:', upsertError);
      throw upsertError;
    }

    return data;
  };

  const checkBookmarkCount = useCallback(async () => {
    try {
      if (!user) {
        setBookmarkCount(0);
        return;
      }

      if (!isbn) return;

      const { data: bookData } = await supabase
        .from('books')
        .select('id')
        .eq('isbn', isbn)
        .maybeSingle();

      if (!bookData) {
        setBookmarkCount(0);
        return;
      }

      setBookUuid(bookData.id);

      const { data: userLists } = await supabase
        .from('bookmark_lists')
        .select('id')
        .eq('user_id', user.id);

      if (!userLists || userLists.length === 0) {
        setBookmarkCount(0);
        return;
      }

      const userListIds = userLists.map(list => list.id);

      const { data, error } = await supabase
        .from('bookmark_list_items')
        .select('id')
        .eq('book_id', bookData.id)
        .in('bookmark_list_id', userListIds);

      if (error) throw error;
      setBookmarkCount(data?.length || 0);
    } catch (err) {
      console.error('Error checking bookmark count:', err);
      setBookmarkCount(0);
    }
  }, [user, isbn]);

  useFocusEffect(
    useCallback(() => {
      if (user && isbn) {
        checkBookmarkCount();
      }
    }, [user, isbn, checkBookmarkCount])
  );

  const handleToggleBookmark = () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    setBookmarkModalVisible(true);
  };

  const handleSaveBookmark = async (listIds: string[]) => {
    try {
      console.log('[handleSaveBookmark] Starting with listIds:', listIds);
      let { data: bookData } = await supabase
        .from('books')
        .select('id')
        .eq('isbn', isbn || '')
        .maybeSingle();

      console.log('[handleSaveBookmark] Book data:', bookData);

      if (!bookData && book) {
        console.log('[handleSaveBookmark] Creating new book...');
        const savedBook = await saveBook(book);
        bookData = savedBook;
        console.log('[handleSaveBookmark] Created book:', bookData);
      }

      if (!bookData) {
        alert('書籍情報の取得に失敗しました。もう一度お試しください。');
        return;
      }

      setBookUuid(bookData.id);

      const items = listIds.map(listId => ({
        bookmark_list_id: listId,
        book_id: bookData!.id,
      }));

      console.log('[handleSaveBookmark] Upserting items:', items);

      const { data, error } = await supabase
        .from('bookmark_list_items')
        .upsert(items, { onConflict: 'bookmark_list_id,book_id' });

      console.log('[handleSaveBookmark] Upsert result:', { data, error });

      if (error) throw error;
      await checkBookmarkCount();
      console.log('[handleSaveBookmark] Success!');
    } catch (err) {
      console.error('Error saving bookmark:', err);
      const errorMessage = err instanceof Error ? err.message : 'ブックマークの保存に失敗しました';
      alert(errorMessage);
      throw err;
    }
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch((err) => console.error('Error opening link:', err));
  };

  const handleBack = () => {
    if (from === 'list-detail' && listId) {
      router.push(`/list-detail?listId=${encodeURIComponent(listId)}`);
    } else {
      router.back();
    }
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

  if (error || !book) {
    return (
      <ResponsiveContainer>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack}>
              <ArrowLeft size={24} color="#1f2937" />
            </TouchableOpacity>
          </View>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error || '書籍が見つかりません'}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setError(null);
                fetchBook();
              }}
            >
              <Text style={styles.retryButtonText}>もう一度試す</Text>
            </TouchableOpacity>
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
        <View style={styles.headerActions}>
          <ShareMenu
            shareData={{
              title: book.title,
              url: getBookShareableUrl(book.isbn),
              description: `著者: ${book.authors.join(', ')}`,
            }}
          />
          <TouchableOpacity
            onPress={handleToggleBookmark}
            style={styles.bookmarkButton}
          >
            <View>
              <BookOpen
                size={24}
                color={bookmarkCount > 0 ? '#2563eb' : '#d1d5db'}
                fill={bookmarkCount > 0 ? '#2563eb' : 'none'}
              />
              {bookmarkCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{bookmarkCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {book.thumbnail_url && (
          <Image
            source={{ uri: book.thumbnail_url }}
            style={styles.thumbnail}
            resizeMode="contain"
          />
        )}

        <View style={styles.bookInfo}>
          <Text style={styles.title}>{book.title}</Text>
          {book.authors.length > 0 && (
            <Text style={styles.authors}>{book.authors.join(', ')}</Text>
          )}

          {book.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>説明</Text>
              <Text style={styles.description}>{book.description}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>購入する</Text>
            <TouchableOpacity
              style={styles.amazonButton}
              onPress={() => openLink(generateSmartAmazonLink({
                isbn: book.isbn,
                title: book.title,
                authors: book.authors,
              }))}
            >
              <View style={styles.amazonButtonContent}>
                <ShoppingCart size={20} color="#fff" />
                <Text style={styles.amazonButtonText}>
                  {book.isbn && !book.isbn.startsWith('gbook_') ? 'Amazonで購入' : 'Amazonで検索'}
                </Text>
              </View>
              <ExternalLink size={16} color="#fff" />
            </TouchableOpacity>
            {(!book.isbn || book.isbn.startsWith('gbook_')) && (
              <Text style={styles.searchNote}>
                ISBNがないため、タイトルで検索します
              </Text>
            )}
          </View>

          {book.ebook_available && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>電子版</Text>
              <View style={styles.linkContainer}>
                {Object.entries(book.ebook_links).map(([name, url]) => (
                  <TouchableOpacity
                    key={name}
                    style={[styles.linkButton, styles.ebookButton]}
                    onPress={() => openLink(url)}
                  >
                    <Text style={styles.ebookButtonText}>
                      {name === 'google_books'
                        ? 'Google Books'
                        : name === 'rakuten_kobo'
                          ? '楽天 Kobo'
                          : 'Google Play Books'}
                    </Text>
                    <ExternalLink size={16} color="#fff" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {!book.paper_available && !book.ebook_available && (
            <View style={styles.unavailableSection}>
              <Text style={styles.unavailableText}>
                申し訳ございません。この書籍は利用できません。
              </Text>
            </View>
          )}

          <BookReviews bookIsbn={book.isbn} />
        </View>
      </ScrollView>

      {book && bookUuid && (
        <BookmarkModal
          visible={bookmarkModalVisible}
          bookId={bookUuid}
          bookTitle={book.title}
          onClose={() => setBookmarkModalVisible(false)}
          onSave={handleSaveBookmark}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookmarkButton: {
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    width: '100%',
    height: 300,
    marginVertical: 16,
  },
  bookInfo: {
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  authors: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  descriptionSection: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  linkContainer: {
    gap: 8,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderColor: '#e5e7eb',
    borderWidth: 1,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563eb',
  },
  ebookButton: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  ebookButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  unavailableSection: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
  },
  unavailableText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  amazonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FF9900',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  amazonButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amazonButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  searchNote: {
    fontSize: 12,
    color: '#f59e0b',
    fontStyle: 'italic',
    marginTop: 8,
    backgroundColor: '#fef3c7',
    padding: 8,
    borderRadius: 4,
  },
});
