import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Image, Modal, ActivityIndicator, RefreshControl, Alert,
  StatusBar, Dimensions, Platform, Animated, ScrollView,
  KeyboardAvoidingView,
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

const DELETE_REASONS = [
  { value: 'Offensive Language',       label: 'Offensive Language',       desc: 'Contains profanity, slurs, or hateful speech' },
  { value: 'Inappropriate Content',    label: 'Inappropriate Content',    desc: 'Sexually explicit, graphic, or disturbing material' },
  { value: 'Community Guidelines Violation', label: 'Community Guidelines Violation', desc: 'Violates NOISEWATCH community rules' },
  { value: 'Spam or Misleading',       label: 'Spam or Misleading',       desc: 'Repetitive, promotional, or false information' },
  { value: 'Harassment or Bullying',   label: 'Harassment or Bullying',   desc: 'Targeting or threatening another user' },
  { value: 'Off-Topic Content',        label: 'Off-Topic Content',        desc: 'Not related to noise disturbance topics' },
  { value: 'Privacy Violation',        label: 'Privacy Violation',        desc: 'Shares personal information without consent' },
];

function timeAgo(ts) {
  const d = new Date(ts), now = new Date();
  const dm = Math.floor((now - d) / 60000), dh = Math.floor(dm / 60), dd = Math.floor(dh / 24);
  if (dm < 1) return 'Just now';
  if (dm < 60) return `${dm}m ago`;
  if (dh < 24) return `${dh}h ago`;
  if (dd < 7) return `${dd}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Delete Reason Modal ───────────────────────────────────────────────────────
function DeleteReasonModal({ visible, onConfirm, onCancel, target }) {
  const [selected, setSelected] = useState('');
  const [custom, setCustom]     = useState('');

  if (!visible) return null;

  const handleConfirm = () => {
    const reason = selected === 'Other' ? custom.trim() : selected;
    if (!reason) { Alert.alert('Error', 'Please select or enter a reason.'); return; }
    onConfirm(reason);
    setSelected(''); setCustom('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity style={dm.overlay} activeOpacity={1} onPress={onCancel}>
        <View style={dm.modal} onStartShouldSetResponder={() => true}>
          <View style={dm.header}>
            <Ionicons name="gavel" size={24} color={C.saddle} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={dm.title}>Remove {target === 'comment' ? 'Comment' : 'Post'}</Text>
              <Text style={dm.sub}>Select a reason for removal. The user will be notified.</Text>
            </View>
          </View>

          <ScrollView style={dm.reasons} showsVerticalScrollIndicator={false}>
            {DELETE_REASONS.map(r => (
              <TouchableOpacity
                key={r.value}
                style={[dm.reasonBtn, selected === r.value && dm.reasonBtnSelected]}
                onPress={() => setSelected(r.value)}
              >
                <Ionicons
                  name={selected === r.value ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={selected === r.value ? C.saddle : C.muted}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={dm.reasonLabel}>{r.label}</Text>
                  <Text style={dm.reasonDesc}>{r.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={[dm.reasonBtn, selected === 'Other' && dm.reasonBtnSelected]}
              onPress={() => setSelected('Other')}
            >
              <Ionicons
                name={selected === 'Other' ? 'radio-button-on' : 'radio-button-off'}
                size={18}
                color={selected === 'Other' ? C.saddle : C.muted}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={dm.reasonLabel}>Other</Text>
              </View>
            </TouchableOpacity>

            {selected === 'Other' && (
              <TextInput
                style={dm.customInput}
                placeholder="Describe the reason..."
                placeholderTextColor={C.muted}
                value={custom}
                onChangeText={setCustom}
                maxLength={200}
                multiline
                numberOfLines={3}
              />
            )}
          </ScrollView>

          <View style={dm.footer}>
            <TouchableOpacity style={dm.cancelBtn} onPress={onCancel}>
              <Text style={dm.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[dm.confirmBtn, !selected && dm.confirmBtnDisabled]} onPress={handleConfirm} disabled={!selected}>
              <Ionicons name="trash-outline" size={16} color={C.white} style={{ marginRight: 6 }} />
              <Text style={dm.confirmText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const dm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: width * 0.9, backgroundColor: C.white, borderRadius: 16, padding: 18, maxHeight: '80%' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 16, fontWeight: '800', color: C.dark },
  sub: { fontSize: 11, color: C.muted, marginTop: 2 },
  reasons: { marginBottom: 14 },
  reasonBtn: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  reasonBtnSelected: { borderColor: C.saddle, backgroundColor: C.bg },
  reasonLabel: { fontSize: 13, fontWeight: '700', color: C.dark },
  reasonDesc: { fontSize: 11, color: C.muted, marginTop: 2 },
  customInput: { borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 10, fontSize: 13, color: C.text, backgroundColor: C.bg, minHeight: 60, textAlignVertical: 'top', marginTop: 4 },
  footer: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 },
  cancelBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1.5, borderColor: C.saddle, alignItems: 'center' },
  cancelText: { color: C.saddle, fontWeight: '700', fontSize: 13 },
  confirmBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, backgroundColor: C.red, borderRadius: 10 },
  confirmBtnDisabled: { backgroundColor: C.muted },
  confirmText: { color: C.white, fontWeight: '700', fontSize: 13 },
});

// ── Post detail modal ─────────────────────────────────────────────────────────
function PostDetailModal({ post, visible, onClose, token, onDeletePost, onDeleteComment, onLike, onComment, onReply }) {
  const [text, setText]               = useState('');
  const [loading, setLoading]         = useState(false);
  const [replyTo, setReplyTo]         = useState(null); // { commentId, username }
  const [replyText, setReplyText]     = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  if (!post) return null;

  const handleLike = () => {
    onLike(post._id);
  };

  const submitComment = async () => {
    if (!text.trim()) return;
    setLoading(true);
    const success = await onComment(post._id, text.trim());
    if (success) setText('');
    setLoading(false);
  };

  const submitReply = async (commentId) => {
    if (!replyText.trim()) return;
    setReplyLoading(true);
    const success = await onReply(post._id, commentId, replyText.trim());
    if (success) {
      setReplyText('');
      setReplyTo(null);
    }
    setReplyLoading(false);
  };

  const renderReply = (r) => (
    <View key={r._id} style={[pd.replyRow, r.isAdmin && pd.replyRowAdmin]}>
      <View style={pd.replyAvatar}>
        {r.userId?.profilePhoto
          ? <Image source={{ uri: r.userId.profilePhoto }} style={pd.replyAvatarImg} />
          : <Text style={pd.replyAvatarText}>{(r.userId?.username || 'U')[0].toUpperCase()}</Text>
        }
      </View>
      <View style={[pd.replyBubble, r.isAdmin && pd.replyBubbleAdmin]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 }}>
          <Text style={pd.replyUsername}>{r.userId?.username || 'User'}</Text>
          {r.isAdmin && <View style={pd.adminBadge}><Text style={pd.adminBadgeText}>Admin</Text></View>}
        </View>
        <Text style={pd.replyText}>{r.text}</Text>
        <Text style={pd.commentTime}>{timeAgo(r.createdAt)}</Text>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={pd.root}>
          {/* Header */}
          <LinearGradient colors={[C.dark, C.saddle]} style={pd.header}>
            <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
              <Ionicons name="arrow-back" size={24} color={C.white} />
            </TouchableOpacity>
            <Text style={pd.headerTitle}>Post Detail</Text>
            <TouchableOpacity
              style={pd.deleteBtn}
              onPress={() => onDeletePost(post._id)}
            >
              <Ionicons name="trash" size={20} color={C.red} />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <View style={{ padding: 16 }}>
              {/* Author */}
              <View style={pd.authorRow}>
                <View style={pd.avatar}>
                  {post.userId?.profilePhoto
                    ? <Image source={{ uri: post.userId.profilePhoto }} style={pd.avatarImg} />
                    : <Text style={pd.avatarText}>{(post.userId?.username || 'U')[0].toUpperCase()}</Text>
                  }
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={pd.username}>{post.userId?.username || 'Unknown'}</Text>
                    {post.isAdminPost && <View style={pd.adminBadge}><Text style={pd.adminBadgeText}>Admin</Text></View>}
                  </View>
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

              {/* Actions & Stats */}
              <View style={pd.actionsRow}>
                <TouchableOpacity style={pd.actionBtn} onPress={handleLike}>
                  <Ionicons
                    name={post.likedByMe ? 'heart' : 'heart-outline'}
                    size={22}
                    color={post.likedByMe ? C.red : C.muted}
                  />
                  <Text style={[pd.actionText, post.likedByMe && { color: C.red }]}>
                    {post.likeCount || 0}
                  </Text>
                </TouchableOpacity>

                <View style={pd.actionBtn}>
                  <Ionicons name="chatbubble-outline" size={20} color={C.muted} />
                  <Text style={pd.actionText}>{post.commentCount || post.comments?.length || 0}</Text>
                </View>
              </View>

              {/* Comments Title */}
              <Text style={pd.commentsTitle}>Comments ({post.comments?.length || 0})</Text>

              {/* Comments List */}
              {(!post.comments || post.comments.length === 0) ? (
                <Text style={pd.noComments}>No comments yet.</Text>
              ) : (
                post.comments.map(c => (
                  <View key={c._id} style={{ marginBottom: 12 }}>
                    <View style={pd.commentRow}>
                      <View style={pd.commentAvatar}>
                        {c.userId?.profilePhoto
                          ? <Image source={{ uri: c.userId.profilePhoto }} style={pd.commentAvatarImg} />
                          : <Text style={pd.commentAvatarText}>{(c.userId?.username || 'U')[0].toUpperCase()}</Text>
                        }
                      </View>
                      <View style={[pd.bubble, c.isAdmin && pd.bubbleAdmin]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <Text style={pd.commentUser}>{c.userId?.username || 'User'}</Text>
                          {c.isAdmin && <View style={pd.adminBadge}><Text style={pd.adminBadgeText}>Admin</Text></View>}
                        </View>
                        <Text style={pd.commentText}>{c.text}</Text>
                        <Text style={pd.commentTime}>{timeAgo(c.createdAt)}</Text>
                        
                        {/* Comment Actions */}
                        <View style={pd.commentActions}>
                          <TouchableOpacity
                            style={pd.replyBtn}
                            onPress={() => {
                              setReplyTo(replyTo?.commentId === c._id ? null : { commentId: c._id, username: c.userId?.username });
                              setReplyText('');
                            }}
                          >
                            <Ionicons name="return-down-forward-outline" size={13} color={C.saddle} />
                            <Text style={pd.replyBtnText}>Reply</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            onPress={() => onDeleteComment(post._id, c._id)}
                            style={pd.replyBtn}
                          >
                            <Ionicons name="trash-outline" size={13} color={C.muted} />
                            <Text style={[pd.replyBtnText, { color: C.muted }]}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    {/* Inline Reply Input */}
                    {replyTo?.commentId === c._id && (
                      <View style={pd.inlineReplyRow}>
                        <View style={pd.inlineReplyAvatar}>
                          <Ionicons name="shield-checkmark-outline" size={14} color={C.white} />
                        </View>
                        <TextInput
                          style={pd.inlineReplyInput}
                          placeholder={`Reply as Admin to ${replyTo.username}...`}
                          placeholderTextColor={C.muted}
                          value={replyText}
                          onChangeText={setReplyText}
                          maxLength={500}
                          autoFocus
                        />
                        <TouchableOpacity
                          style={[pd.sendBtn, !replyText.trim() && pd.sendBtnOff]}
                          onPress={() => submitReply(c._id)}
                          disabled={!replyText.trim() || replyLoading}
                        >
                          {replyLoading
                            ? <ActivityIndicator size="small" color={C.white} />
                            : <Ionicons name="send" size={16} color={C.white} />
                          }
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Replies Thread */}
                    {c.replies?.length > 0 && (
                      <View style={pd.repliesContainer}>
                        {c.replies.map(r => renderReply(r))}
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          </ScrollView>

          {/* Comment Input Footer */}
          <View style={pd.inputRow}>
            <View style={pd.adminCommentBanner}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#8B4513" />
              <Text style={pd.adminCommentBannerText}>Commenting as Admin</Text>
            </View>
            <View style={pd.inputInner}>
              <TextInput
                style={pd.input}
                placeholder="Write an admin comment..."
                placeholderTextColor={C.muted}
                value={text}
                onChangeText={setText}
                maxLength={500}
              />
              <TouchableOpacity
                style={[pd.sendBtn, !text.trim() && pd.sendBtnOff]}
                onPress={submitComment}
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
  actionsRow:   { flexDirection: 'row', gap: 20, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  actionBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText:   { fontSize: 14, color: C.muted, fontWeight: '600' },
  commentsTitle:{ fontSize: 14, fontWeight: '800', color: C.dark, marginBottom: 10 },
  noComments:   { fontSize: 13, color: C.muted, fontStyle: 'italic', marginBottom: 10 },
  commentRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  commentAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.saddle, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  commentAvatarImg: { width: 34, height: 34, borderRadius: 17 },
  commentAvatarText: { color: C.white, fontWeight: '800', fontSize: 14 },
  bubble:      { flex: 1, backgroundColor: C.white, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: C.border },
  bubbleAdmin: { backgroundColor: '#FFF8E1', borderColor: C.gold },
  commentUser:  { fontSize: 12, fontWeight: '800', color: C.saddle, marginBottom: 2 },
  commentText:  { fontSize: 14, color: C.text, lineHeight: 20 },
  commentTime:  { fontSize: 10, color: C.muted, marginTop: 4 },
  commentActions: { flexDirection: 'row', gap: 12, marginTop: 6 },
  replyBtn:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  replyBtnText:{ fontSize: 11, color: C.saddle, fontWeight: '700' },
  // Inline replies
  inlineReplyRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 42, marginBottom: 8, marginTop: 6 },
  inlineReplyAvatar:{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.saddle, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  inlineReplyInput: { flex: 1, backgroundColor: C.bg, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7, fontSize: 13, color: C.text, borderWidth: 1, borderColor: C.gold },
  // Replies thread
  repliesContainer: { marginLeft: 42, marginTop: 8, borderLeftWidth: 2, borderLeftColor: C.border, paddingLeft: 8 },
  replyRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  replyAvatar:      { width: 26, height: 26, borderRadius: 13, backgroundColor: C.saddle, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  replyAvatarImg:   { width: 26, height: 26, borderRadius: 13 },
  replyAvatarText:  { color: C.white, fontWeight: '800', fontSize: 11 },
  replyBubble:      { flex: 1, backgroundColor: C.white, borderRadius: 10, padding: 8, borderWidth: 1, borderColor: C.border },
  replyBubbleAdmin: { backgroundColor: '#FFF8E1', borderColor: C.gold },
  replyUsername:    { fontSize: 11, fontWeight: '800', color: C.saddle },
  replyText:        { fontSize: 13, color: C.text, lineHeight: 18 },
  // Input row
  inputRow:    { padding: 12, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.white },
  inputInner:  { flexDirection: 'row', gap: 10, alignItems: 'center' },
  adminCommentBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF8E1', borderRadius: 8, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: C.gold },
  adminCommentBannerText: { fontSize: 12, color: C.saddle, fontWeight: '700' },
  input:       { flex: 1, backgroundColor: C.bg, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: C.text, borderWidth: 1, borderColor: C.border },
  sendBtn:     { width: 44, height: 44, borderRadius: 22, backgroundColor: C.saddle, justifyContent: 'center', alignItems: 'center' },
  sendBtnOff:  { backgroundColor: C.muted },
  adminBadge:  { backgroundColor: C.gold, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  adminBadgeText: { fontSize: 9, fontWeight: '900', color: C.dark },
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
  const [deleteModal, setDeleteModal] = useState({ visible: false, postId: null, commentId: null });
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

  useEffect(() => {
    if (selectedPost && posts.length > 0) {
      const updated = posts.find(p => p._id === selectedPost._id);
      if (updated) setSelectedPost(updated);
    }
  }, [posts, selectedPost]);

  const handleSearch = () => { setSearch(searchInput); fetchPosts(1, searchInput); };
  const clearSearch  = () => { setSearchInput(''); setSearch(''); fetchPosts(1, ''); };

  const handleLikePost = async (postId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/forum/posts/${postId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setPosts(prev => prev.map(p =>
          p._id === postId ? { ...p, likeCount: data.likeCount, likedByMe: data.likedByMe } : p
        ));
      }
    } catch {}
  };

  const handleCommentPost = async (postId, commentText) => {
    try {
      const res = await fetch(`${API_BASE_URL}/forum/admin/posts/${postId}/comments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: commentText }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPosts(prev => prev.map(p =>
          p._id === postId ? { ...p, comments: data.comments, commentCount: data.comments.length } : p
        ));
        fetchStats();
        return true;
      } else {
        Alert.alert('Error', data.error || 'Failed to comment.');
      }
    } catch {
      Alert.alert('Error', 'Network error.');
    }
    return false;
  };

  const handleReplyComment = async (postId, commentId, replyText) => {
    try {
      const res = await fetch(`${API_BASE_URL}/forum/admin/posts/${postId}/comments/${commentId}/replies`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: replyText }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPosts(prev => prev.map(p =>
          p._id === postId ? { ...p, comments: data.comments, commentCount: data.comments.length } : p
        ));
        return true;
      } else {
        Alert.alert('Error', data.error || 'Failed to reply.');
      }
    } catch {
      Alert.alert('Error', 'Network error.');
    }
    return false;
  };

  const openDeleteModal = (postId, commentId = null) => {
    setDeleteModal({ visible: true, postId, commentId });
  };

  const handleDeleteConfirm = async (reason) => {
    const { postId, commentId } = deleteModal;
    setDeleteModal({ visible: false, postId: null, commentId: null });
    if (commentId) {
      await deleteComment(postId, commentId);
    } else {
      await deletePost(postId, reason);
    }
  };

  const deletePost = async (postId, reason) => {
    try {
      const res = await fetch(`${API_BASE_URL}/forum/admin/posts/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        setPosts(prev => prev.map(p =>
          p._id === postId
            ? { ...p, isDeleted: true, deletedReason: reason }
            : p
        ));
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
        fetchStats();
      }
    } catch { Alert.alert('Error', 'Failed to delete comment.'); }
  };

  const handleDeleteCommentConfirm = (postId, commentId) => {
    Alert.alert('Delete Comment', 'Delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteComment(postId, commentId) },
    ]);
  };

  const renderPost = ({ item }) => {
    if (item.isDeleted) {
      return (
        <View style={[s.postCard, s.postRemoved]}>
          <View style={s.tombstone}>
            <Ionicons name="ban-outline" size={24} color={C.red} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.tombstoneTitle}>Post Removed by Admin</Text>
              {item.deletedReason && (
                <Text style={s.tombstoneReason}>Reason: <Text style={{ fontWeight: '700' }}>{item.deletedReason}</Text></Text>
              )}
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={s.postCard}>
        <View style={s.postHeader}>
          <View style={s.avatar}>
            {item.userId?.profilePhoto
              ? <Image source={{ uri: item.userId.profilePhoto }} style={s.avatarImg} />
              : <Text style={s.avatarText}>{(item.userId?.username || 'U')[0].toUpperCase()}</Text>
            }
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={s.username}>{item.userId?.username || 'Unknown'}</Text>
              {item.isAdminPost && <View style={s.adminBadge}><Text style={s.adminBadgeText}>Admin</Text></View>}
            </View>
            <Text style={s.time}>{timeAgo(item.createdAt)}</Text>
          </View>
          <View style={s.postActions}>
            <TouchableOpacity style={s.actionBadgeBtn} onPress={() => handleLikePost(item._id)}>
              <Ionicons name={item.likedByMe ? 'heart' : 'heart-outline'} size={14} color={item.likedByMe ? C.red : C.saddle} />
              <Text style={[s.badgeText, item.likedByMe && { color: C.red }]}>{item.likeCount || 0}</Text>
            </TouchableOpacity>
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
            onPress={() => openDeleteModal(item._id)}
          >
            <Ionicons name="trash-outline" size={16} color={C.red} />
            <Text style={s.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPosts(page, search, true)} colors={[C.saddle]} tintColor={C.saddle} />}
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
        onDeletePost={(id) => { setSelectedPost(null); openDeleteModal(id); }}
        onDeleteComment={handleDeleteCommentConfirm}
        onLike={handleLikePost}
        onComment={handleCommentPost}
        onReply={handleReplyComment}
      />

      {/* Delete reason modal */}
      <DeleteReasonModal
        visible={deleteModal.visible}
        target={deleteModal.commentId ? 'comment' : 'post'}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModal({ visible: false, postId: null, commentId: null })}
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
  postRemoved:  { borderLeftColor: C.red, backgroundColor: '#FDF2F2' },
  postHeader:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar:       { width: 38, height: 38, borderRadius: 19, backgroundColor: C.saddle, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarImg:    { width: 38, height: 38, borderRadius: 19 },
  avatarText:   { color: C.white, fontWeight: '800', fontSize: 14 },
  username:     { fontSize: 13, fontWeight: '800', color: C.dark },
  time:         { fontSize: 11, color: C.muted },
  postActions:  { flexDirection: 'row', gap: 6 },
  badge:        { backgroundColor: C.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  actionBadgeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
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
  adminBadge:   { backgroundColor: C.gold, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  adminBadgeText: { fontSize: 9, fontWeight: '900', color: C.dark },
  // Tombstone styles
  tombstone:    { flexDirection: 'row', alignItems: 'center' },
  tombstoneTitle: { fontSize: 13, fontWeight: '700', color: C.red },
  tombstoneReason: { fontSize: 11, color: C.text, marginTop: 2 },
});
