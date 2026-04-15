import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Image, Modal, ActivityIndicator, RefreshControl, Alert,
  StatusBar, Dimensions, Platform, Animated, KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import API_BASE_URL from '../utils/api';
import CustomDrawer from './CustomDrawer';

const { width } = Dimensions.get('window');
const SB = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 24;

const C = {
  dark:   '#3E2C23', saddle: '#8B4513', gold: '#DAA520',
  cream:  '#FDF5E6', bg: '#F5F0E8',    white: '#FFFFFF',
  text:   '#333333', muted: '#A89070', sub: '#8B7355',
  red:    '#F44336', blue: '#2196F3',  green: '#4CAF50',
  border: '#E8DDD0',
};

function timeAgo(ts) {
  const d = new Date(ts), now = new Date();
  const dm = Math.floor((now - d) / 60000), dh = Math.floor(dm / 60), dd = Math.floor(dh / 24);
  if (dm < 1) return 'Just now';
  if (dm < 60) return `${dm}m ago`;
  if (dh < 24) return `${dh}h ago`;
  if (dd < 7)  return `${dd}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Create Post Modal ─────────────────────────────────────────────────────────
function CreatePostModal({ visible, onClose, onPosted, token }) {
  const [text, setText]       = useState('');
  const [media, setMedia]     = useState(null); // { uri, type: 'image'|'video' }
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState('');

  const pickMedia = async (type) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow media access to attach files.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
      videoMaxDuration: 60,
    });
    if (!result.canceled && result.assets?.[0]) {
      setMedia({ uri: result.assets[0].uri, type });
    }
  };

  const submit = async () => {
    if (!text.trim() && !media) { Alert.alert('Empty post', 'Add text or media to post.'); return; }
    setWarning('');
    setLoading(true);
    try {
      const form = new FormData();
      if (text.trim()) form.append('text', text.trim());
      if (media) {
        const ext  = media.uri.split('.').pop();
        const mime = media.type === 'video' ? `video/${ext}` : `image/${ext}`;
        form.append('media', { uri: media.uri, name: `post.${ext}`, type: mime });
      }
      const res = await fetch(`${API_BASE_URL}/forum/posts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        // Show specific warning for bad words, generic error for others
        if (res.status === 400 && data.error?.toLowerCase().includes('inappropriate')) {
          Alert.alert(
            'Post Not Allowed',
            'Your post could not be submitted because it contains inappropriate or offensive language. Please revise your message and try again.',
            [{ text: 'Edit Post', style: 'default' }]
          );
        } else {
          Alert.alert('Could Not Post', data.error || 'Something went wrong. Please try again.');
        }
        return;
      }
      setText(''); setMedia(null);
      onPosted(data.post);
      onClose();
    } catch (e) {
      Alert.alert('Connection Error', 'Unable to reach the server. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={cp.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={cp.sheet}>
          <View style={cp.header}>
            <Text style={cp.title}>Create Post</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={C.dark} /></TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <TextInput
              style={cp.input}
              placeholder="Share something about noise in your area..."
              placeholderTextColor={C.muted}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={1000}
            />

            {media && (
              <View style={cp.previewWrap}>
                {media.type === 'image'
                  ? <Image source={{ uri: media.uri }} style={cp.preview} resizeMode="cover" />
                  : <View style={cp.videoPreview}><Ionicons name="videocam" size={40} color={C.saddle} /><Text style={cp.videoLabel}>Video selected</Text></View>
                }
                <TouchableOpacity style={cp.removeMedia} onPress={() => setMedia(null)}>
                  <Ionicons name="close-circle" size={26} color={C.red} />
                </TouchableOpacity>
              </View>
            )}

            <View style={cp.mediaRow}>
              <TouchableOpacity style={cp.mediaBtn} onPress={() => pickMedia('image')}>
                <Ionicons name="image-outline" size={22} color={C.saddle} />
                <Text style={cp.mediaBtnText}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={cp.mediaBtn} onPress={() => pickMedia('video')}>
                <Ionicons name="videocam-outline" size={22} color={C.saddle} />
                <Text style={cp.mediaBtnText}>Video</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Warning banner */}
          {!!warning && (
            <View style={cp.warningBox}>
              <Ionicons name="warning-outline" size={18} color="#E65100" />
              <Text style={cp.warningText}>{warning}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[cp.postBtn, (!text.trim() && !media) && cp.postBtnDisabled]}
            onPress={submit}
            disabled={loading || (!text.trim() && !media)}
          >
            {loading
              ? <ActivityIndicator color={C.white} />
              : <Text style={cp.postBtnText}>Post</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const cp = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:        { fontSize: 18, fontWeight: '800', color: C.dark },
  input:        { backgroundColor: C.bg, borderRadius: 14, padding: 14, fontSize: 15, color: C.text, minHeight: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: C.border, marginBottom: 12 },
  previewWrap:  { position: 'relative', marginBottom: 12 },
  preview:      { width: '100%', height: 200, borderRadius: 12 },
  videoPreview: { width: '100%', height: 120, borderRadius: 12, backgroundColor: '#F0EBE3', justifyContent: 'center', alignItems: 'center', gap: 8 },
  videoLabel:   { fontSize: 13, color: C.saddle, fontWeight: '600' },
  removeMedia:  { position: 'absolute', top: 8, right: 8 },
  mediaRow:     { flexDirection: 'row', gap: 12, marginBottom: 16 },
  mediaBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  mediaBtnText: { fontSize: 14, color: C.saddle, fontWeight: '600' },
  postBtn:      { backgroundColor: C.saddle, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  postBtnDisabled: { backgroundColor: C.muted },
  postBtnText:  { color: C.white, fontWeight: '800', fontSize: 16 },
  warningBox:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFF3E0', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#FFB74D' },
  warningText:  { flex: 1, fontSize: 13, color: '#E65100', lineHeight: 18 },
});

// ── Comments Modal ────────────────────────────────────────────────────────────
function CommentsModal({ visible, post, onClose, token, currentUserId, onUpdated }) {
  const [text, setText]       = useState('');
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState(post?.comments || []);
  const [warning, setWarning] = useState('');

  useEffect(() => { setComments(post?.comments || []); setWarning(''); }, [post]);

  const submit = async () => {
    if (!text.trim()) return;
    setWarning('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/forum/posts/${post._id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 400 && data.error?.toLowerCase().includes('inappropriate')) {
          Alert.alert(
            'Comment Not Allowed',
            'Your comment could not be posted because it contains inappropriate or offensive language. Please revise it and try again.',
            [{ text: 'Edit Comment', style: 'default' }]
          );
        } else {
          Alert.alert('Could Not Comment', data.error || 'Something went wrong. Please try again.');
        }
        return;
      }
      setComments(data.comments);
      setText('');
      onUpdated(post._id, { comments: data.comments });
    } catch { Alert.alert('Error', 'Network error.'); }
    finally { setLoading(false); }
  };

  const deleteComment = async (commentId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/forum/posts/${post._id}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const updated = comments.filter(c => c._id !== commentId);
        setComments(updated);
        onUpdated(post._id, { comments: updated });
      }
    } catch {}
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={cm.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={cm.sheet}>
          <View style={cm.header}>
            <Text style={cm.title}>Comments ({comments.length})</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={C.dark} /></TouchableOpacity>
          </View>

          <FlatList
            data={comments}
            keyExtractor={c => c._id}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 8 }}
            ListEmptyComponent={<Text style={cm.empty}>No comments yet. Be the first!</Text>}
            renderItem={({ item }) => (
              <View style={cm.commentRow}>
                <View style={cm.avatar}>
                  {item.userId?.profilePhoto
                    ? <Image source={{ uri: item.userId.profilePhoto }} style={cm.avatarImg} />
                    : <Text style={cm.avatarText}>{(item.userId?.username || 'U')[0].toUpperCase()}</Text>
                  }
                </View>
                <View style={cm.bubble}>
                  <Text style={cm.username}>{item.userId?.username || 'User'}</Text>
                  <Text style={cm.commentText}>{item.text}</Text>
                  <Text style={cm.time}>{timeAgo(item.createdAt)}</Text>
                </View>
                {String(item.userId?._id) === String(currentUserId) && (
                  <TouchableOpacity onPress={() => deleteComment(item._id)} style={{ padding: 4 }}>
                    <Ionicons name="trash-outline" size={16} color={C.muted} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          />

          <View style={cm.inputRow}>
            {!!warning && (
              <View style={cm.warningBox}>
                <Ionicons name="warning-outline" size={16} color="#E65100" />
                <Text style={cm.warningText}>{warning}</Text>
              </View>
            )}
            <View style={cm.inputInner}>
            <TextInput
              style={cm.input}
              placeholder="Write a comment..."
              placeholderTextColor={C.muted}
              value={text}
              onChangeText={setText}
              maxLength={500}
            />
            <TouchableOpacity
              style={[cm.sendBtn, !text.trim() && cm.sendBtnOff]}
              onPress={submit}
              disabled={!text.trim() || loading}
            >
              {loading
                ? <ActivityIndicator size="small" color={C.white} />
                : <Ionicons name="send" size={18} color={C.white} />
              }
            </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const cm = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, height: '75%' },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title:       { fontSize: 16, fontWeight: '800', color: C.dark },
  empty:       { textAlign: 'center', color: C.muted, marginTop: 24, fontSize: 14 },
  commentRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  avatar:      { width: 34, height: 34, borderRadius: 17, backgroundColor: C.saddle, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarImg:   { width: 34, height: 34, borderRadius: 17 },
  avatarText:  { color: C.white, fontWeight: '800', fontSize: 14 },
  bubble:      { flex: 1, backgroundColor: C.bg, borderRadius: 14, padding: 10 },
  username:    { fontSize: 12, fontWeight: '800', color: C.saddle, marginBottom: 2 },
  commentText: { fontSize: 14, color: C.text, lineHeight: 20 },
  time:        { fontSize: 10, color: C.muted, marginTop: 4 },
  inputRow:    { paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  inputInner:  { flexDirection: 'row', gap: 10, alignItems: 'center' },
  warningBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#FFF3E0', borderRadius: 8, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#FFB74D' },
  warningText: { flex: 1, fontSize: 12, color: '#E65100', lineHeight: 17 },
  input:       { flex: 1, backgroundColor: C.bg, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: C.text, borderWidth: 1, borderColor: C.border },
  sendBtn:     { width: 44, height: 44, borderRadius: 22, backgroundColor: C.saddle, justifyContent: 'center', alignItems: 'center' },
  sendBtnOff:  { backgroundColor: C.muted },
});

// ── Post Card ─────────────────────────────────────────────────────────────────
function PostCard({ post, currentUserId, token, onLike, onDelete, onOpenComments }) {
  const isOwner = String(post.userId?._id) === String(currentUserId);

  // Tombstone for admin-removed posts
  if (post.isDeleted) {
    return (
      <View style={pc.card}>
        <View style={pc.tombstone}>
          <Ionicons name="ban-outline" size={28} color="#F44336" />
          <View style={{ flex: 1 }}>
            <Text style={pc.tombstoneTitle}>Post removed by admin</Text>
            {post.deletedReason && (
              <Text style={pc.tombstoneReason}>Reason: {post.deletedReason}</Text>
            )}
          </View>
        </View>
      </View>
    );
  }

  const confirmDelete = () => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(post._id) },
    ]);
  };

  return (
    <View style={pc.card}>
      {/* Author row */}
      <View style={pc.authorRow}>
        <View style={pc.avatar}>
          {post.userId?.profilePhoto
            ? <Image source={{ uri: post.userId.profilePhoto }} style={pc.avatarImg} />
            : <Text style={pc.avatarText}>{(post.userId?.username || 'U')[0].toUpperCase()}</Text>
          }
        </View>
        <View style={{ flex: 1 }}>
          <Text style={pc.username}>{post.userId?.username || 'User'}</Text>
          <Text style={pc.time}>{timeAgo(post.createdAt)}</Text>
        </View>
        {isOwner && (
          <TouchableOpacity onPress={confirmDelete} style={{ padding: 6 }}>
            <Ionicons name="trash-outline" size={18} color={C.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Text */}
      {!!post.text && <Text style={pc.text}>{post.text}</Text>}

      {/* Media */}
      {post.mediaUrl && post.mediaType === 'image' && (
        <Image source={{ uri: post.mediaUrl }} style={pc.media} resizeMode="cover" />
      )}
      {post.mediaUrl && post.mediaType === 'video' && (
        <Video
          source={{ uri: post.mediaUrl }}
          style={pc.media}
          useNativeControls
          resizeMode="cover"
          shouldPlay={false}
        />
      )}

      {/* Actions */}
      <View style={pc.actions}>
        <TouchableOpacity style={pc.actionBtn} onPress={() => onLike(post._id)}>
          <Ionicons
            name={post.likedByMe ? 'heart' : 'heart-outline'}
            size={22}
            color={post.likedByMe ? C.red : C.muted}
          />
          <Text style={[pc.actionText, post.likedByMe && { color: C.red }]}>
            {post.likeCount || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={pc.actionBtn} onPress={() => onOpenComments(post)}>
          <Ionicons name="chatbubble-outline" size={20} color={C.muted} />
          <Text style={pc.actionText}>{post.commentCount || post.comments?.length || 0}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const pc = StyleSheet.create({
  card:       { backgroundColor: C.white, marginBottom: 10, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  authorRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginBottom: 10 },
  avatar:     { width: 40, height: 40, borderRadius: 20, backgroundColor: C.saddle, justifyContent: 'center', alignItems: 'center' },
  avatarImg:  { width: 40, height: 40, borderRadius: 20 },
  avatarText: { color: C.white, fontWeight: '800', fontSize: 16 },
  username:   { fontSize: 14, fontWeight: '800', color: C.dark },
  time:       { fontSize: 11, color: C.muted },
  text:       { fontSize: 15, color: C.text, lineHeight: 22, paddingHorizontal: 16, marginBottom: 10 },
  media:      { width: '100%', height: 260, marginBottom: 10 },
  actions:    { flexDirection: 'row', gap: 20, paddingHorizontal: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border },
  actionBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { fontSize: 14, color: C.muted, fontWeight: '600' },
  tombstone:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 4 },
  tombstoneTitle: { fontSize: 13, fontWeight: '700', color: '#F44336' },
  tombstoneReason: { fontSize: 12, color: C.muted, marginTop: 2 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function CommunityForum({ navigation }) {
  const [posts, setPosts]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [page, setPage]                 = useState(1);
  const [hasMore, setHasMore]           = useState(true);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [token, setToken]               = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [createVisible, setCreateVisible] = useState(false);
  const [commentsPost, setCommentsPost] = useState(null);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
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

  // Init
  useEffect(() => {
    (async () => {
      const t = await AsyncStorage.getItem('userToken');
      const stored = await AsyncStorage.getItem('userData');
      setToken(t);
      if (stored) {
        const u = JSON.parse(stored);
        setCurrentUserId(u._id || u.id);
      }
    })();
  }, []);

  // Fetch unread forum notifications
  const fetchUnreadNotifs = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/forum/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setUnreadNotifs(data.unreadCount || 0);
    } catch {}
  }, [token]);

  useEffect(() => {
    if (token) fetchUnreadNotifs();
  }, [token, fetchUnreadNotifs]);

  const fetchPosts = useCallback(async (pageNum = 1, isRefresh = false) => {
    if (!token) return;
    try {
      isRefresh ? setRefreshing(true) : pageNum === 1 ? setLoading(true) : setLoadingMore(true);
      const res = await fetch(`${API_BASE_URL}/forum/posts?page=${pageNum}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setPosts(prev => pageNum === 1 ? data.posts : [...prev, ...data.posts]);
        setHasMore(pageNum < data.pages);
        setPage(pageNum);
      }
    } catch (e) { console.warn('Forum fetch error:', e.message); }
    finally { setLoading(false); setRefreshing(false); setLoadingMore(false); }
  }, [token]);

  useEffect(() => { if (token) fetchPosts(1); }, [token, fetchPosts]);

  const onRefresh = () => fetchPosts(1, true);
  const onLoadMore = () => { if (hasMore && !loadingMore) fetchPosts(page + 1); };

  const handleLike = async (postId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/forum/posts/${postId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setPosts(prev => prev.map(p =>
          p._id === postId
            ? { ...p, likeCount: data.likeCount, likedByMe: data.likedByMe }
            : p
        ));
      }
    } catch {}
  };

  const handleDelete = async (postId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/forum/posts/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setPosts(prev => prev.filter(p => p._id !== postId));
    } catch {}
  };

  const handlePostUpdated = (postId, updates) => {
    setPosts(prev => prev.map(p => p._id === postId ? { ...p, ...updates } : p));
    if (commentsPost?._id === postId) setCommentsPost(prev => ({ ...prev, ...updates }));
  };

  const handlePosted = (newPost) => {
    setPosts(prev => [{ ...newPost, likeCount: 0, likedByMe: false, commentCount: 0 }, ...prev]);
  };

  const renderPost = ({ item }) => (
    <PostCard
      post={item}
      currentUserId={currentUserId}
      token={token}
      onLike={handleLike}
      onDelete={handleDelete}
      onOpenComments={(p) => setCommentsPost(p)}
    />
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
            <Text style={s.headerTitle}>Community Forum</Text>
            <Text style={s.headerSub}>Share noise concerns with your community</Text>
          </View>
          {/* Notification bell */}
          <TouchableOpacity
            style={s.notifBtn}
            onPress={async () => {
              if (token) {
                await fetch(`${API_BASE_URL}/forum/notifications/read`, {
                  method: 'PUT',
                  headers: { Authorization: `Bearer ${token}` },
                });
                setUnreadNotifs(0);
              }
            }}
          >
            <Ionicons name="notifications-outline" size={24} color={C.gold} />
            {unreadNotifs > 0 && (
              <View style={s.notifBadge}>
                <Text style={s.notifBadgeText}>{unreadNotifs > 9 ? '9+' : unreadNotifs}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={s.composeBtn} onPress={() => setCreateVisible(true)}>
            <Ionicons name="add" size={24} color={C.dark} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Posts */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.saddle} />
          <Text style={s.loadingText}>Loading posts...</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => item._id}
          renderItem={renderPost}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.saddle]} tintColor={C.saddle} />}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={56} color="#CCC" />
              <Text style={s.emptyTitle}>No posts yet</Text>
              <Text style={s.emptySub}>Be the first to share something with the community</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => setCreateVisible(true)}>
                <Ionicons name="add-circle-outline" size={18} color={C.white} />
                <Text style={s.emptyBtnText}>Create Post</Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color={C.saddle} style={{ padding: 16 }} /> : null}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={() => setCreateVisible(true)}>
        <LinearGradient colors={[C.saddle, C.dark]} style={s.fabInner}>
          <Ionicons name="add" size={28} color={C.white} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Modals */}
      <CreatePostModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onPosted={handlePosted}
        token={token}
      />

      {commentsPost && (
        <CommentsModal
          visible={!!commentsPost}
          post={commentsPost}
          onClose={() => setCommentsPost(null)}
          token={token}
          currentUserId={currentUserId}
          onUpdated={handlePostUpdated}
        />
      )}

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
  root:        { flex: 1, backgroundColor: C.bg },
  header:      { paddingTop: SB + 8, paddingHorizontal: 16, paddingBottom: 14 },
  headerInner: { flexDirection: 'row', alignItems: 'center' },
  headerBtn:   { padding: 6 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.white },
  headerSub:   { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  composeBtn:  { width: 38, height: 38, borderRadius: 19, backgroundColor: C.gold, justifyContent: 'center', alignItems: 'center' },
  notifBtn:    { padding: 6, position: 'relative', marginRight: 4 },
  notifBadge:  { position: 'absolute', top: 0, right: 0, backgroundColor: C.red, borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  notifBadgeText: { fontSize: 9, color: C.white, fontWeight: '900' },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: C.saddle, fontSize: 14 },
  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle:  { fontSize: 18, fontWeight: '700', color: '#999', marginTop: 14 },
  emptySub:    { fontSize: 13, color: '#BBB', textAlign: 'center', marginTop: 6, lineHeight: 20 },
  emptyBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.saddle, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 20 },
  emptyBtnText:{ color: C.white, fontWeight: '700', fontSize: 14 },
  fab:         { position: 'absolute', bottom: 24, right: 20 },
  fabInner:    { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: C.dark, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 },
  drawerWrap:  { width: width * 0.82, position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: C.white, elevation: 5 },
});
