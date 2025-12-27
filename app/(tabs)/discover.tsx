import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Globe, Heart, BookOpen, User } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ResponsiveContainer } from '@/components/ResponsiveContainer';

interface PublicList {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  item_count: number;
  like_count: number;
  user_liked: boolean;
  username: string;
}

export default function DiscoverScreen() {
  const [lists, setLists] = useState<PublicList[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  const fetchPublicLists = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: listsData, error: fetchError } = await supabase
        .from('bookmark_lists')
        .select('id, name, user_id, created_at, profiles(username)')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const listsWithData = await Promise.all(
        (listsData || []).map(async (list) => {
          const [itemCount, likeCount, userLiked] = await Promise.all([
            supabase
              .from('bookmark_list_items')
              .select('*', { count: 'exact', head: true })
              .eq('bookmark_list_id', list.id)
              .then(({ count }) => count || 0),
            supabase
              .from('list_likes')
              .select('*', { count: 'exact', head: true })
              .eq('list_id', list.id)
              .then(({ count }) => count || 0),
            user
              ? supabase
                  .from('list_likes')
                  .select('id')
                  .eq('list_id', list.id)
                  .eq('user_id', user.id)
                  .maybeSingle()
                  .then(({ data }) => !!data)
              : Promise.resolve(false),
          ]);

          return {
            ...list,
            username: (list.profiles as any)?.username || '不明',
            item_count: itemCount,
            like_count: likeCount,
            user_liked: userLiked,
          };
        })
      );

      setLists(listsWithData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching public lists:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchPublicLists();
    }, [fetchPublicLists])
  );

  const handleToggleLike = async (listId: string, currentlyLiked: boolean) => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    try {
      if (currentlyLiked) {
        const { error } = await supabase
          .from('list_likes')
          .delete()
          .eq('list_id', listId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('list_likes').insert({
          list_id: listId,
          user_id: user.id,
        });

        if (error) throw error;
      }

      setLists((prev) =>
        prev.map((item) =>
          item.id === listId
            ? {
                ...item,
                user_liked: !currentlyLiked,
                like_count: currentlyLiked ? item.like_count - 1 : item.like_count + 1,
              }
            : item
        )
      );
    } catch (err) {
      console.error('Error toggling like:', err);
      alert('エラーが発生しました');
    }
  };

  const handleListPress = (listId: string, userId: string) => {
    if (user?.id === userId) {
      router.push(`/list-detail?listId=${encodeURIComponent(listId)}&from=discover`);
    } else {
      router.push(`/public-list-detail?listId=${encodeURIComponent(listId)}&from=discover`);
    }
  };

  const handleUserPress = (userId: string, username: string) => {
    router.push(`/user-lists?userId=${encodeURIComponent(userId)}&username=${encodeURIComponent(username)}`);
  };

  if (loading && !refreshing && lists.length === 0) {
    return (
      <ResponsiveContainer title="みんなのブックマーク">
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        </View>
      </ResponsiveContainer>
    );
  }

  if (error && lists.length === 0) {
    return (
      <ResponsiveContainer title="みんなのブックマーク">
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </View>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer title="みんなのブックマーク">
      <View style={styles.container}>
        {lists.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Globe size={64} color="#d1d5db" style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>公開リストがありません</Text>
          <Text style={styles.emptySubtitle}>
            公開されたリストがここに表示されます
          </Text>
        </View>
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.listCard}
              onPress={() => handleListPress(item.id, item.user_id)}
            >
              <View style={styles.listHeader}>
                <View style={styles.listTitleContainer}>
                  <View style={styles.titleRow}>
                    <Globe size={16} color="#22c55e" />
                    <Text style={styles.listName} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                  <View style={styles.statsRow}>
                    <TouchableOpacity
                      style={styles.stat}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleUserPress(item.user_id, item.username);
                      }}
                    >
                      <User size={14} color="#2563eb" />
                      <Text style={[styles.statText, styles.usernameLink]}>
                        {item.username}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.stat}>
                      <BookOpen size={14} color="#6b7280" />
                      <Text style={styles.statText}>{item.item_count}冊</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.likeButton}
                  onPress={() => handleToggleLike(item.id, item.user_liked)}
                >
                  <Heart
                    size={20}
                    color={item.user_liked ? '#ef4444' : '#d1d5db'}
                    fill={item.user_liked ? '#ef4444' : 'none'}
                  />
                  {item.like_count > 0 && (
                    <Text
                      style={[
                        styles.likeCount,
                        item.user_liked && styles.likeCountActive,
                      ]}
                    >
                      {item.like_count}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={fetchPublicLists}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
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
    alignItems: 'center',
  },
  listTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  listName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    color: '#6b7280',
  },
  usernameLink: {
    color: '#2563eb',
    fontWeight: '500',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  likeCount: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  likeCountActive: {
    color: '#ef4444',
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
