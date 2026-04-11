import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Image, Modal, ActivityIndicator, RefreshControl, Alert,
  StatusBar, Dimensions, Platform, Animated, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../../utils/api';
import CustomDrawer from '../CustomDrawer';

const { width } = Dimensions.get('window');
const SB = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 24;

const C = {
  dark: '#3E2C23', saddle: '#8B4513', gold: '#DAA520',
  cream: '#FDF5E6', bg: '#F5F0E8', white: '#FFFFFF',
  text: '#333333', muted: '#A89070', red: '#F44336',
  green: '#4CAF50', border: '#E8DDD0',
};

function timeAgo(ts) {
  const d = new Date(ts), now = new Date();
  const dm = Math.floor((now - d) / 60000), dh = Math.floor(dm / 60), dd = Math.floor(dh / 24);
  if (dm < 1) return 'Just now';
  if (dm < 60) return `${dm}m ago`;
  if (dh < 24) return `${dh}h ago`;
  if (dd < 7) return `${dd}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Post detail modal ─────────────────────────────────────────────────────────
function PostDetailModal({ post, visible, onClose, token, onDeletePost, onDeleteComment }) {
  if (!post) return null;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={pd.root}>
        <LinearGradient colors={[C.dark, C.saddle]} style={pd.header}>
          <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
            <Ionicons name="arrow-back" size={24} color={C.white} />
          </TouchableOpacity>
          <Text style={pd.headerTitle}>Post Detail</Text>
          <TouchableOpacity
            style={pd.deleteBtn}
            onPress={() => {
              Alert.alert('Delete Post', 'Delete this post permanently?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => { onDeletePost(post._id); onClose(); } },
              ]);
            }}
          >
            <Ionicons name="trash" size={20} color={C.red} />
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Author */}
          <View style={pd.authorRow}>
            <View style={pd.avatar}>
              {post.userId?.profilePhoto
                ? <Image source={{ uri: post.userId.profilePhoto }} style={pd.avatarImg} />
                : <Text style={pd.avatarText}>{(post.userId?.username || 'U')[0].toUpperCase()}</Text>
              }
            </View>
            <View>
              <Text style={pd.username}>{post.userId?.username || 'Unknown'}</Text>
              <Text style={pd.time}>{timeAgo(post.createdAt)}</Text>
            </View>
          </View>

          {/* Content */}
          {!!post.text && <Text style={pd.postText}>{post.text}</Text>}
          {post.mediaUrl && post.mediaType === 'image' && (
            <Image source={{ uri: post.mediaUrl }} style={pd.media} resizeMode="cover" />
          )}
          {post.mediaUrl && post.mediaType === 'video' && (
            <Video source={{ uri: post.mediaUrl }} style={pd.media} useNativeControls resizeMode="cover" />
          )}

          {/* Stats */}
          <View style={pd.statsRow}>
            <View style={pd.statBadge}><Text style={pd.statText}>❤️ {post.likeCount || 0} likes</Text></View>
            <View style={pd.statBadge}><Text style={pd.statText}>💬 {post.commentCount || 0} comments</Text></View>
          </View>

          {/* Comments */}
          <Text style={pd.commentsTitle}>Comments ({post.comments?.length || 0})</Text>
          {(!post.comments || post.comments.length === 0) ? (
            <Text style={pd.noComments}>No comments yet.</Text>
          ) : (
            post.comments.map(c => (
              <View key={c._id} style={pd.commentRow}>
                <View style={{ flex: 1 }}>
                  <Text style={pd.commentUser}>{c.userId?.username || 'User'}</Text>
                  <Text style={pd.commentText}>{c.text}</Text>
                  <Text style={pd.commentTime}>{timeAgo(c.createdAt)}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => Alert.alert('Delete Comment', 'Delete this comment?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => onDeleteComment(post._id, c._id) },
                  ])}
                  style={{ padding: 8 }}
                >
                  <Ionicons name="trash-outline" size={18} color={C.red} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const pd = StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.bg },
  header:       { flexDirection: 'row', alignItems: 'center', paddingTop: SB + 8, paddingHorizontal: 16, paddingBottom: 14, gap: 12 },
  headerTitle:  { flex: 1, fontSize: 17, fontWeight: '800', color: C.white },
  deleteBtn:    { padding: 8, backgroundColor: 'rgba(244,67,54,0.15)', borderRadius: 8 },
  authorRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  avatar:       { width: 42, height: 42, borderRadius: 21, backgroundColor: C.saddle, justifyContent: 'center', alignItems: 'center' },
  avatarImg:    { width: 42, height: 42, borderRadius: 21 },
  avatarText:   { color: C.white, fontWeight: '800', fontSize: 16 },
  username:     { fontSize: 14, fontWeight: '800', color: C.dark },
  time:         { fontSize: 11, color: C.muted },
  postText:     { fontSize: 15, color: C.text, lineHeight: 22, marginBottom: 12 },
  media:        { width: '100%', height: 240, borderRadius: 12, marginBottom: 12 },
  statsRow:     { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBadge:    { backgroundColor: C.white, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.border },
  statText:     { fontSize: 13, color: C.saddle, fontWeight: '600' },
  commentsTitle:{ fontSize: 14, fontWeight: '800', color: C.dark, marginBottom: 10 },
  noComments:   { fontSize: 13, color: C.muted, fontStyle: 'italic' },
  commentRow:   { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.white, borderRadius: 12, padding: 12, marginBottom: 8 },
  commentUser:  { fontSize: 12, fontWeight: '800', color: C.saddle, marginBottom: 2 },
  commentText:  { fontSize: 14, color: C.text, lineHeight: 20 },
  commentTime:  { fontSize: 10, color: C.muted, marginTop: 4 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ForumModeration({ navigation }) {
  const [posts, setPosts]             = useState([]);
  const [stats, setStats]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [total, setTotal]             = useState(0);
  const [search, setSearch]           = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedPost, setSelectedPost] = useState(null);
  const [token, setToken]             = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const slideAnim   = useRef(new Animated.Value(-width * 0.82)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const openDrawer = () => {
    setDrawerVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim,   { toValue: 0,             duration: 320, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 1,             duration: 320, useNativeDriver: true }),
    ]).start();
  };
  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(slideAnim,   { toValue: -width * 0.82, duration: 280, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0,             duration: 250, useNativeDriver: true }),
    ]).start(() => setDrawerVisible(false));
  };

  useEffect(() => {
    AsyncStorage.getItem('userToken').then(t => setToken(t));
  }, []);

  const fetchPosts = useCallback(async (p = 1, q = '', isRefresh = false) => {
    if (!token) return;
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const res = await fetch(
        `${API_BASE_URL}/forum/admin/posts?page=${p}&limit=15&search=${encodeURIComponent(q)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) {
        setPosts(data.posts);
        setTotalPages(data.pages);
        setTotal(data.total);
        setPage(p);
      }
    } catch (e) { console.warn(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/forum/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setStats(data);
    } catch {}
  }, [token]);

  useEffect(() => {
    if (token) { fetchPosts(1); fetchStats(); }
  }, [token, fetchPosts, fetchStats]);

  const handleSearch = () => { setSearch(searchInput); fetchPosts(1, searchInput); };
  const clearSearch  = () => { setSearchInput(''); setSearch(''); fetchPosts(1, ''); };

  const deletePost = async (postId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/forum/admin/posts/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPosts(prev => prev.filter(p => p._id !== postId));
        setTotal(prev => prev - 1);
        fetchStats();
      }
    } catch { Alert.alert('Error', 'Failed to delete post.'); }
  };

  const deleteComment = async (postId, commentId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/forum/admin/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPosts(prev => prev.map(p =>
          p._id === postId
            ? { ...p, comments: p.comments.filter(c => c._id !== commentId), commentCount: (p.commentCount || 1) - 1 }
            : p
        ));
        if (selectedPost?._id === postId) {
          setSelectedPost(prev => ({
            ...prev,
            comments: prev.comments.filter(c => c._id !== commentId),
          }));
        }
        fetchStats();
      }
    } catch { Alert.alert('Error', 'Failed to delete comment.'); }
  };

  const renderPost = ({ item }) => (
    <View style={s.postCard}>
      <View style={s.postHeader}>
        <View style={s.avatar}>
          {item.userId?.profilePhoto
            ? <Image source={{ uri: item.userId.profilePhoto }} style={s.avatarImg} />
            : <Text style={s.avatarText}>{(item.userId?.username || 'U')[0].toUpperCase()}</Text>
          }
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.username}>{item.userId?.username || 'Unknown'}</Text>
          <Text style={s.time}>{timeAgo(item.createdAt)}</Text>
        </View>
        <View style={s.postActions}>
          <View style={s.badge}><Text style={s.badgeText}>❤️ {item.likeCount || 0}</Text></View>
          <View style={s.badge}><Text style={s.badgeText}>💬 {item.commentCount || 0}</Text></View>
        </View>
      </View>

      {!!item.text && <Text style={s.postText} numberOfLines={3}>{item.text}</Text>}
      {item.mediaUrl && item.mediaType === 'image' && (
        <Image source={{ uri: item.mediaUrl }} style={s.postMedia} resizeMode="cover" />
      )}
      {item.mediaUrl && item.mediaType === 'video' && (
        <View style={s.videoThumb}>
          <Ionicons name="videocam" size={28} color={C.saddle} />
          <Text style={s.videoLabel}>Video post</Text>
        </View>
      )}

      <View style={s.cardActions}>
        <TouchableOpacity style={s.viewBtn} onPress={() => setSelectedPost(item)}>
          <Ionicons name="eye-outline" size={16} color={C.saddle} />
          <Text style={s.viewBtnText}>View & Moderate</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.deleteBtn}
          onPress={() => Alert.alert('Delete Post', 'Delete this post?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deletePost(item._id) },
          ])}
        >
          <Ionicons name="trash-outline" size={16} color={C.red} />
          <Text style={s.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />

      {/* Header */}
      <LinearGradient colors={[C.dark, C.saddle]} style={s.header}>
        <View style={s.headerInner}>
          <TouchableOpacity onPress={openDrawer} style={s.headerBtn}>
            <Ionicons name="menu" size={26} color={C.gold} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.headerTitle}>Forum Moderation</Text>
            <Text style={s.headerSub}>Review and moderate community posts</Text>
          </View>
        </View>

        {/* Stats */}
        {stats && (
          <View style={s.statsRow}>
            {[
              { label: 'Posts',    value: stats.totalPosts,    icon: '📝' },
              { label: 'Comments', value: stats.totalComments, icon: '💬' },
              { label: 'Likes',    value: stats.totalLikes,    icon: '❤️' },
            ].map((st, i) => (
              <View key={i} style={s.statCard}>
                <Text style={s.statIcon}>{st.icon}</Text>
                <Text style={s.statValue}>{st.value}</Text>
                <Text style={s.statLabel}>{st.label}</Text>
              </View>
            ))}
          </View>
        )}
      </LinearGradient>

      {/* Search */}
      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          placeholder="Search posts..."
          placeholderTextColor={C.muted}
          value={searchInput}
          onChangeText={setSearchInput}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={s.searchBtn} onPress={handleSearch}>
          <Ionicons name="search" size={18} color={C.white} />
        </TouchableOpacity>
        {search ? (
          <TouchableOpacity style={s.clearBtn} onPress={clearSearch}>
            <Ionicons name="close" size={18} color={C.saddle} />
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={s.countText}>{total} post{total !== 1 ? 's' : ''} found</Text>

      {/* List */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.saddle} />
          <Text style={{ marginTop: 10, color: C.saddle }}>Loading posts...</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => item._id}
          renderItem={renderPost}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPosts(1, search, true)} colors={[C.saddle]} tintColor={C.saddle} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={<View style={s.center}><Text style={{ color: C.muted }}>No posts found.</Text></View>}
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={s.pagination}>
                <TouchableOpacity
                  style={[s.pageBtn, page <= 1 && s.pageBtnDisabled]}
                  disabled={page <= 1}
                  onPress={() => fetchPosts(page - 1, search)}
                >
                  <Text style={s.pageBtnText}>← Prev</Text>
                </TouchableOpacity>
                <Text style={s.pageInfo}>Page {page} of {totalPages}</Text>
                <TouchableOpacity
                  style={[s.pageBtn, page >= totalPages && s.pageBtnDisabled]}
                  disabled={page >= totalPages}
                  onPress={() => fetchPosts(page + 1, search)}
                >
                  <Text style={s.pageBtnText}>Next →</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {/* Post detail modal */}
      <PostDetailModal
        post={selectedPost}
        visible={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        token={token}
        onDeletePost={(id) => { deletePost(id); setSelectedPost(null); }}
        onDeleteComment={deleteComment}
      />

      {/* Drawer */}
      <Modal visible={drawerVisible} transparent animationType="none" onRequestClose={closeDrawer}>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', opacity: overlayAnim }}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeDrawer} />
          </Animated.View>
          <Animated.View style={[s.drawerWrap, { transform: [{ translateX: slideAnim }] }]}>
            <CustomDrawer navigation={navigation} onClose={closeDrawer} />
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.bg },
  header:       { paddingTop: SB + 8, paddingHorizontal: 16, paddingBottom: 16 },
  headerInner:  { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  headerBtn:    { padding: 6 },
  headerTitle:  { fontSize: 17, fontWeight: '800', color: C.white },
  headerSub:    { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  statsRow:     { flexDirection: 'row', gap: 10 },
  statCard:     { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12, alignItems: 'center', gap: 2 },
  statIcon:     { fontSize: 18 },
  statValue:    { fontSize: 18, fontWeight: '900', color: C.white },
  statLabel:    { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  searchRow:    { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  searchInput:  { flex: 1, backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, color: C.text, borderWidth: 1, borderColor: C.border },
  searchBtn:    { backgroundColor: C.saddle, borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  clearBtn:     { backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 10, justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  countText:    { fontSize: 12, color: C.muted, paddingHorizontal: 16, paddingTop: 8 },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  postCard:     { backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 12, elevation: 2, shadowColor: C.dark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, borderLeftWidth: 4, borderLeftColor: C.gold },
  postHeader:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar:       { width: 38, height: 38, borderRadius: 19, backgroundColor: C.saddle, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarImg:    { width: 38, height: 38, borderRadius: 19 },
  avatarText:   { color: C.white, fontWeight: '800', fontSize: 14 },
  username:     { fontSize: 13, fontWeight: '800', color: C.dark },
  time:         { fontSize: 11, color: C.muted },
  postActions:  { flexDirection: 'row', gap: 6 },
  badge:        { backgroundColor: C.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeText:    { fontSize: 11, color: C.saddle, fontWeight: '600' },
  postText:     { fontSize: 14, color: C.text, lineHeight: 20, marginBottom: 8 },
  postMedia:    { width: '100%', height: 160, borderRadius: 10, marginBottom: 8 },
  videoThumb:   { width: '100%', height: 80, borderRadius: 10, backgroundColor: '#F0EBE3', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 8 },
  videoLabel:   { fontSize: 13, color: C.saddle, fontWeight: '600' },
  cardActions:  { flexDirection: 'row', gap: 10, marginTop: 4 },
  viewBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, backgroundColor: '#EEF7FF', borderRadius: 8 },
  viewBtnText:  { fontSize: 12, color: C.saddle, fontWeight: '700' },
  deleteBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, backgroundColor: '#FFEBEE', borderRadius: 8 },
  deleteBtnText:{ fontSize: 12, color: C.red, fontWeight: '700' },
  pagination:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 16 },
  pageBtn:      { backgroundColor: C.saddle, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  pageBtnDisabled: { backgroundColor: C.muted },
  pageBtnText:  { color: C.white, fontWeight: '700', fontSize: 13 },
  pageInfo:     { fontSize: 13, color: C.saddle, fontWeight: '600' },
  drawerWrap:   { width: width * 0.82, position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: C.white, elevation: 5 },
});
