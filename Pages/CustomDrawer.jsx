import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, Dimensions, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { showToast } from '../utils/toast';
import API_BASE_URL from '../utils/api';

const { width } = Dimensions.get('window');

const C = {
  dark: '#3E2C23', mid: '#5D4A36', saddle: '#8B4513', gold: '#DAA520',
  cream: '#FDF5E6', white: '#FFFFFF', red: '#E74C3C', sub: '#8B7355',
};

const CustomDrawer = ({ navigation, onClose }) => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [userType, setUserType]       = useState('user');
  const [stats, setStats]             = useState({ reports: 0, users: 0 });

  // ── Menu definitions (mirrors web CustomDrawer) ──────────────
  const userMenuItems = [
    { id: '1', title: 'Dashboard',           icon: 'home-outline',          route: 'Home'            },
    { id: '2', title: 'Noise Map',           icon: 'map-outline',           route: 'MapScreen'       },
    { id: '3', title: 'Report Noise',        icon: 'megaphone-outline',     route: 'Record'          },
    { id: '4', title: 'My History',          icon: 'time-outline',          route: 'ReportHistory'   },
    { id: '5', title: 'Notifications',       icon: 'notifications-outline', route: 'Notifications'   },
    { id: '6', title: 'Analytics (Personal)',icon: 'analytics-outline',     route: 'PersonalAnalytics'},
  ];

  const adminMenuItems = [
    { id: '1', title: 'Dashboard',             icon: 'speedometer-outline',   route: 'AdminDashboard'    },
    { id: '2', title: 'Noise Reports',         icon: 'document-text-outline', route: 'NoiseReports'      },
    { id: '3', title: 'Graphs & Analytics',    icon: 'bar-chart-outline',     route: 'Analytics'         },
    { id: '4', title: 'Users & Contributors',  icon: 'people-outline',        route: 'UserManagement'    },
    { id: '5', title: 'Export Reports',        icon: 'download-outline',      route: 'ExportReports'     },
    { id: '6', title: 'Notifications & Alerts',icon: 'alert-circle-outline',  route: 'AdminNotifications'},
  ];

  const userBottomItems  = [{ id: '7', title: 'Heatmaps', icon: 'map-outline', route: 'MapScreen' }];
  const adminBottomItems = [
    { id: '7', title: 'Profile & Settings', icon: 'person-circle-outline', route: 'AdminProfile' },
    { id: '8', title: 'Heatmaps',           icon: 'map-outline',           route: 'MapScreen'    },
  ];

  // ── Fetch profile ─────────────────────────────────────────────
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) throw new Error('No token');

      // Try stored data first for speed
      const stored = await AsyncStorage.getItem('userData');
      if (stored) {
        const u = JSON.parse(stored);
        setProfileData(u);
        setUserType(u.userType || u.role || 'user');
      }

      const res = await axios.get(`${API_BASE_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        const u = res.data.user;
        setProfileData(u);
        setUserType(u.userType || u.role || 'user');
        await AsyncStorage.setItem('userData', JSON.stringify(u));
        await AsyncStorage.setItem('userType', u.userType || 'user');
      }
    } catch (e) {
      const stored = await AsyncStorage.getItem('userData');
      if (stored) {
        const u = JSON.parse(stored);
        setProfileData(u);
        setUserType(u.userType || 'user');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch admin stats ─────────────────────────────────────────
  const fetchAdminStats = async () => {
    try {
      setStatsLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const h = { Authorization: `Bearer ${token}` };
      const [rRes, uRes] = await Promise.all([
        fetch(`${API_BASE_URL}/reports/total-reports`, { headers: h }),
        fetch(`${API_BASE_URL}/user/getAll`, { headers: h }),
      ]);
      let reports = 0, users = 0;
      if (rRes.ok) { const d = await rRes.json(); reports = d.totalReports || 0; }
      if (uRes.ok) { const d = await uRes.json(); users = d.users?.length || 0; }
      setStats({ reports, users });
    } catch (e) { /* non-critical */ }
    finally { setStatsLoading(false); }
  };

  // ── Fetch user stats ──────────────────────────────────────────
  const fetchUserStats = async () => {
    try {
      setStatsLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const userId = profileData?.id || profileData?._id;
      if (!userId) return;
      const res = await fetch(`${API_BASE_URL}/reports/get-user-report/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setStats({ reports: d.count || d.reports?.length || 0, users: 0 });
      }
    } catch (e) { /* non-critical */ }
    finally { setStatsLoading(false); }
  };

  useEffect(() => { fetchProfile(); }, []);

  useEffect(() => {
    if (!profileData) return;
    const isAdmin = ['admin', 'administrator'].includes(userType.toLowerCase());
    if (isAdmin) fetchAdminStats(); else fetchUserStats();
  }, [profileData, userType]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation ────────────────────────────────────────────────
  const validRoutes = [
    'Home', 'MapScreen', 'UserProfile', 'AdminDashboard', 'UserManagement',
    'Record', 'NoiseReports', 'ReportHistory', 'Analytics',
    'ExportReports', 'AdminNotifications', 'AdminProfile',
    'Notifications', 'PersonalAnalytics',
  ];

  const handleNavigation = (route) => {
    if (onClose) onClose();
    setTimeout(() => {
      if (validRoutes.includes(route)) {
        navigation.navigate(route);
      } else {
        showToast('info', 'Coming Soon', `${route} is under development`);
      }
    }, 280);
  };

  // ── Logout ────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await AsyncStorage.multiRemove(['userToken', 'userData', 'isAuthenticated', 'userId', 'userType']);
        showToast('success', 'Logged Out', 'You have been successfully logged out');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }},
    ]);
  };

  // ── Derived values ────────────────────────────────────────────
  const isAdmin = ['admin', 'administrator'].includes(userType.toLowerCase());
  const menuItems   = isAdmin ? adminMenuItems   : userMenuItems;
  const bottomItems = isAdmin ? adminBottomItems : userBottomItems;
  const gradientColors = isAdmin
    ? ['#8B4513', '#654321', '#4A2C17']
    : ['#D4AC0D', '#B7950B', '#8B4513'];
  const displayStats = isAdmin
    ? [
        { number: stats.reports.toLocaleString(), label: 'Reports', icon: 'document-text-outline' },
        { number: stats.users.toLocaleString(),   label: 'Users',   icon: 'people-outline'        },
      ]
    : [{ number: stats.reports.toString(), label: 'My Reports', icon: 'document-text-outline' }];

  const user = profileData || { username: 'User', email: 'user@example.com', profilePhoto: null };

  // ── Render menu item ──────────────────────────────────────────
  const renderMenuItem = (item, isBottom = false) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.menuItem, isBottom && styles.bottomMenuItem]}
      onPress={() => handleNavigation(item.route)}
      activeOpacity={0.7}
    >
      <Ionicons name={item.icon} size={22} color={C.saddle} />
      <Text style={styles.menuText}>{item.title}</Text>
      <Ionicons name="chevron-forward" size={18} color={C.gold} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.saddle} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={gradientColors} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={26} color={C.cream} />
          </TouchableOpacity>

          {/* Logo + title */}
          <View style={styles.logoRow}>
            <Image source={require('../assets/logo.png')} style={styles.logoImg} resizeMode="contain" />
            <Text style={styles.logoTitle}>NOISEWATCH</Text>
          </View>

          {/* Profile */}
          <TouchableOpacity
            style={styles.profileSection}
            onPress={() => handleNavigation(isAdmin ? 'AdminProfile' : 'UserProfile')}
            activeOpacity={0.8}
          >
            {user.profilePhoto ? (
              <Image source={{ uri: user.profilePhoto }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileInitials}>
                <Text style={styles.profileInitialsText}>
                  {(user.username || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.username}</Text>
              <Text style={styles.profileEmail} numberOfLines={1}>{user.email}</Text>
              {isAdmin && (
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>System Administrator</Text>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.cream} />
          </TouchableOpacity>

          {/* Stats */}
          <View style={styles.statsContainer}>
            {statsLoading ? (
              <ActivityIndicator size="small" color={C.cream} />
            ) : (
              displayStats.map((s, i) => (
                <React.Fragment key={i}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{s.number}</Text>
                    <Text style={styles.statLabel}>{s.label}</Text>
                  </View>
                  {i < displayStats.length - 1 && <View style={styles.statDivider} />}
                </React.Fragment>
              ))
            )}
          </View>
        </LinearGradient>

        {/* Menu */}
        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>{isAdmin ? 'Admin Panel' : 'Noise Monitoring'}</Text>
          {menuItems.map(item => renderMenuItem(item))}

          {/* Admin quick actions — mirrors web CustomDrawer */}
          {isAdmin && (
            <View style={styles.quickActionsContainer}>
              <Text style={styles.quickActionsTitle}>Admin Quick Actions</Text>
              <View style={styles.quickActionsGrid}>
                {[
                  { icon: 'bar-chart-outline',      label: 'Analytics',     route: 'Analytics'         },
                  { icon: 'warning-outline',         label: 'Notifications', route: 'AdminNotifications'},
                  { icon: 'download-outline',        label: 'Export',        route: 'ExportReports'     },
                  { icon: 'person-circle-outline',   label: 'Profile',       route: 'AdminProfile'      },
                ].map((a, i) => (
                  <TouchableOpacity key={i} style={styles.quickActionButton} onPress={() => handleNavigation(a.route)} activeOpacity={0.7}>
                    <Ionicons name={a.icon} size={28} color={C.saddle} />
                    <Text style={styles.quickActionText}>{a.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* User quick actions */}
          {!isAdmin && (
            <View style={styles.quickActionsContainer}>
              <Text style={styles.quickActionsTitle}>Quick Actions</Text>
              <View style={styles.quickActionsGrid}>
                {[
                  { icon: 'mic-circle-outline', label: 'Quick Record', route: 'Record'    },
                  { icon: 'warning-outline',    label: 'Emergency',    route: 'Record'    },
                  { icon: 'location-outline',   label: 'Nearby',       route: 'MapScreen' },
                  { icon: 'stats-chart-outline',label: 'My Stats',     route: 'ReportHistory'},
                ].map((a, i) => (
                  <TouchableOpacity key={i} style={[styles.quickActionButton, i === 1 && styles.emergencyButton]} onPress={() => handleNavigation(a.route)} activeOpacity={0.7}>
                    <Ionicons name={a.icon} size={28} color={i === 1 ? C.red : C.saddle} />
                    <Text style={styles.quickActionText}>{a.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Bottom items */}
          <View style={styles.bottomSection}>
            <View style={styles.divider} />
            {bottomItems.map(item => renderMenuItem(item, true))}
          </View>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={22} color={C.red} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: C.cream },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.cream },
  header:           { paddingHorizontal: 20, paddingTop: 50, paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  closeBtn:         { alignSelf: 'flex-end', padding: 4, marginBottom: 8 },
  logoRow:          { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  logoImg:          { width: 36, height: 36, borderRadius: 8 },
  logoTitle:        { color: C.cream, fontWeight: '800', fontSize: 16, letterSpacing: 2 },
  profileSection:   { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 12, marginBottom: 14 },
  profileImage:     { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: C.cream, marginRight: 12 },
  profileInitials:  { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  profileInitialsText: { color: C.cream, fontWeight: '800', fontSize: 20 },
  profileInfo:      { flex: 1 },
  profileName:      { color: C.white, fontWeight: '700', fontSize: 16, marginBottom: 2 },
  profileEmail:     { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 4 },
  adminBadge:       { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  adminBadgeText:   { color: C.white, fontSize: 10, fontWeight: '600' },
  statsContainer:   { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingVertical: 12 },
  statItem:         { alignItems: 'center', flex: 1 },
  statNumber:       { fontSize: 20, fontWeight: '800', color: C.white },
  statLabel:        { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  statDivider:      { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.3)' },
  menuContainer:    { paddingHorizontal: 18, paddingTop: 22 },
  sectionTitle:     { fontSize: 16, fontWeight: '700', color: C.saddle, marginBottom: 12, paddingLeft: 4 },
  menuItem:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, backgroundColor: C.white, borderRadius: 12, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: C.gold, elevation: 2, shadowColor: C.dark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  bottomMenuItem:   { backgroundColor: '#FFFACD', borderLeftColor: '#B7950B' },
  menuText:         { flex: 1, fontSize: 15, color: C.saddle, marginLeft: 12, fontWeight: '500' },
  quickActionsContainer: { backgroundColor: C.white, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F5DEB3', elevation: 2, shadowColor: C.dark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  quickActionsTitle:{ fontSize: 14, fontWeight: '700', color: C.saddle, marginBottom: 12 },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  quickActionButton:{ width: '48%', alignItems: 'center', paddingVertical: 14, backgroundColor: '#FFFACD', borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F5DEB3' },
  emergencyButton:  { backgroundColor: '#FFF5F5', borderColor: '#FFE4E1' },
  quickActionText:  { fontSize: 11, color: C.saddle, marginTop: 6, fontWeight: '600', textAlign: 'center' },
  bottomSection:    { marginTop: 6 },
  divider:          { height: 1, backgroundColor: '#F5DEB3', marginVertical: 12 },
  logoutButton:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, backgroundColor: '#FFF5F5', borderRadius: 12, marginTop: 8, marginBottom: 32, borderWidth: 1, borderColor: '#FFE4E1' },
  logoutText:       { fontSize: 15, color: C.red, marginLeft: 8, fontWeight: '600' },
});

export default CustomDrawer;
