import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import { useNavigation } from '@react-navigation/native';
import CustomDrawer from '../CustomDrawer';
import API_BASE_URL from '../../utils/api';

const { width } = Dimensions.get('window');

const UserManagement = ({ setShowUserModal }) => {
  const navigation = useNavigation();
  
  // Drawer state
  const [drawerVisible, setDrawerVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Data state
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFilters, setSelectedFilters] = useState({
    userType: [],
    status: []
  });

  // User Modal & Report History state
  const [selectedUserForModal, setSelectedUserForModal] = useState(null);
  const [userReports, setUserReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState(null);
  const [reportsPage, setReportsPage] = useState(1);
  const reportsPerPage = 5;
  const [showDeactivatePrompt, setShowDeactivatePrompt] = useState(false);
  const [deactivateReasonType, setDeactivateReasonType] = useState('spam');
  const [customDeactivateReason, setCustomDeactivateReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchUserReports = async (userId) => {
    try {
      setReportsLoading(true);
      setReportsError(null);
      const response = await fetch(`${API_BASE_URL}/reports/get-user-report/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch user reports');
      const data = await response.json();
      setUserReports(data.reports || []);
    } catch (err) {
      setReportsError(err.message);
      setUserReports([]);
    } finally {
      setReportsLoading(false);
    }
  };

  const deactivateUser = async (userId, reason) => {
    try {
      setProcessing(true);
      const response = await fetch(`${API_BASE_URL}/user/deactivate/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setUsers(prevUsers => prevUsers.map(u => 
          (u._id === userId || u.id === userId) ? { ...u, isDeactivated: true, deactivationReason: reason } : u
        ));
        if (selectedUserForModal && (selectedUserForModal._id === userId || selectedUserForModal.id === userId)) {
          setSelectedUserForModal(prev => ({ ...prev, isDeactivated: true, deactivationReason: reason }));
        }
        setShowDeactivatePrompt(false);
        Alert.alert('Success', `User deactivated. Reason: ${reason}`);
      } else {
        throw new Error(data.message || 'Deactivation failed');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setProcessing(false);
    }
  };

  const activateUser = async (userId) => {
    try {
      setProcessing(true);
      const response = await fetch(`${API_BASE_URL}/user/activate/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setUsers(prevUsers => prevUsers.map(u => 
          (u._id === userId || u.id === userId) ? { ...u, isDeactivated: false, deactivationReason: null } : u
        ));
        if (selectedUserForModal && (selectedUserForModal._id === userId || selectedUserForModal.id === userId)) {
          setSelectedUserForModal(prev => ({ ...prev, isDeactivated: false, deactivationReason: null }));
        }
        Alert.alert('Success', 'User activated successfully.');
      } else {
        throw new Error(data.message || 'Activation failed');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setProcessing(false);
    }
  };

  const openUserDetailModal = (user) => {
    setSelectedUserForModal(user);
    setReportsPage(1);
    fetchUserReports(user._id || user.id);
  };

  // Drawer animations
  const openDrawer = () => {
    setDrawerVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -width * 0.8,
        duration: 300,
        easing: Easing.bezier(0.55, 0.06, 0.68, 0.19),
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 250,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      })
    ]).start(() => setDrawerVisible(false));
  };

  // Fetch users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/user/getAll`);
        const data = await response.json();
        if (data.success) {
          setUsers(data.users);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
        Alert.alert('Error', 'Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleFilterChange = (filterType, value) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterType]: prev[filterType].includes(value)
        ? prev[filterType].filter(item => item !== value)
        : [...prev[filterType], value]
    }));
  };

  const clearFilters = () => {
    setSelectedFilters({
      userType: [],
      status: []
    });
  };

   const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesUserType = selectedFilters.userType.length === 0 || 
      selectedFilters.userType.includes(user.userType);
    
    const matchesStatus = selectedFilters.status.length === 0 || 
      selectedFilters.status.includes(user.status || 'active');
    
    return matchesSearch && matchesUserType && matchesStatus;
  });

  const hasActiveFilters = selectedFilters.userType.length > 0 || selectedFilters.status.length > 0;

  const getBadgeStyle = (type, value) => {
    const baseStyle = styles.badge;
    
    if (type === 'userType') {
      switch (value) {
        case 'admin':
          return [baseStyle, styles.badgePurple];
        case 'vet':
          return [baseStyle, styles.badgeBlue];
        default:
          return [baseStyle, styles.badgeGray];
      }
    } else if (type === 'status') {
      if (value === 'active') return [baseStyle, styles.badgeGreen];
      if (value === 'deactivated') return [baseStyle, styles.badgeRed];
      return [baseStyle, styles.badgeOrange];
    }
    
    return baseStyle;
  };

  const getBadgeTextStyle = (type, value) => {
    if (type === 'userType') {
      switch (value) {
        case 'admin':
          return styles.badgePurpleText;
        case 'vet':
          return styles.badgeBlueText;
        default:
          return styles.badgeGrayText;
      }
    } else if (type === 'status') {
      if (value === 'active') return styles.badgeGreenText;
      if (value === 'deactivated') return styles.badgeRedText;
      return styles.badgeOrangeText;
    }
    
    return styles.badgeGrayText;
  };

  const FilterOption = ({ label, isSelected, onPress }) => (
    <TouchableOpacity style={styles.filterOption} onPress={onPress}>
      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
        {isSelected && <Ionicons name="checkmark" size={12} color="#fff" />}
      </View>
      <Text style={styles.filterLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const FilterModal = () => (
    <Modal
      visible={showFilterDropdown}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowFilterDropdown(false)}
    >
      <TouchableOpacity 
        style={styles.filterOverlay}
        activeOpacity={1}
        onPress={() => setShowFilterDropdown(false)}
      >
        <View style={styles.filterDropdown}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>User Type</Text>
              {['user', 'admin', 'vet'].map(type => (
                <FilterOption
                  key={type}
                  label={type}
                  isSelected={selectedFilters.userType.includes(type)}
                  onPress={() => handleFilterChange('userType', type)}
                />
              ))}
            </View>
            
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Status</Text>
              {['active', 'inactive', 'deactivated'].map(status => (
                <FilterOption
                  key={status}
                  label={status}
                  isSelected={selectedFilters.status.includes(status)}
                  onPress={() => handleFilterChange('status', status)}
                />
              ))}
            </View>
            
            <View style={styles.filterActions}>
              <TouchableOpacity 
                style={styles.btnText}
                onPress={clearFilters}
              >
                <Text style={styles.btnTextLabel}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.btnPrimary}
                onPress={() => setShowFilterDropdown(false)}
              >
                <Text style={styles.btnPrimaryLabel}>Apply</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderActiveFilters = () => {
    if (!hasActiveFilters) return null;
    
    const allFilters = [
      ...selectedFilters.userType.map(type => ({ type: 'userType', value: type, label: `User Type: ${type}` })),
      ...selectedFilters.status.map(status => ({ type: 'status', value: status, label: `Status: ${status}` }))
    ];

    return (
      <View style={styles.activeFiltersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.activeFilters}>
            {allFilters.map((filter, index) => (
              <View key={index} style={styles.filterTag}>
                <Text style={styles.filterTagText}>{filter.label}</Text>
                <TouchableOpacity 
                  onPress={() => handleFilterChange(filter.type, filter.value)}
                  style={styles.filterTagRemove}
                >
                  <Ionicons name="close" size={14} color="#8B4513" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderUserItem = ({ item }) => {
    const status = item.isDeactivated ? 'deactivated' : (item.isVerified ? 'active' : 'inactive');

    return (
      <TouchableOpacity style={styles.userRow} onPress={() => openUserDetailModal(item)}>
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>{item.name || item.username}</Text>
          <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
        </View>
        <View style={styles.userMeta}>
          <View style={styles.badgeRow}>
            <View style={getBadgeStyle('userType', item.userType)}>
              <Text style={[styles.badgeText, getBadgeTextStyle('userType', item.userType)]}>
                {item.userType}
              </Text>
            </View>
            <View style={getBadgeStyle('status', status)}>
              <Text style={[styles.badgeText, getBadgeTextStyle('status', status)]}>
                {status}
              </Text>
            </View>
          </View>
          <Text style={styles.joinDate}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color="#CCC" />
      <Text style={styles.emptyStateText}>
        {users.length === 0 ? 'No users found' : 'No users match your filters'}
      </Text>
      <Text style={styles.emptySubtext}>
        {users.length === 0 ? 'Users will appear here once added' : 'Try adjusting your search or filters'}
      </Text>
    </View>
  );

  const UserDetailModal = () => {
    if (!selectedUserForModal) return null;

    const user = selectedUserForModal;
    const isDeactivated = user.isDeactivated;
    const status = isDeactivated ? 'deactivated' : (user.isVerified ? 'active' : 'inactive');

    const startIndex = (reportsPage - 1) * reportsPerPage;
    const paginatedReports = userReports.slice(startIndex, startIndex + reportsPerPage);
    const totalPages = Math.ceil(userReports.length / reportsPerPage) || 1;

    return (
      <Modal
        visible={true}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedUserForModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            <View style={styles.detailModalHeader}>
              <Text style={styles.detailModalTitle}>User Details</Text>
              <TouchableOpacity onPress={() => setSelectedUserForModal(null)}>
                <Ionicons name="close" size={24} color="#8B4513" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.detailModalScroll} showsVerticalScrollIndicator={false}>
              {/* User summary */}
              <View style={styles.detailUserSummary}>
                <View style={styles.detailAvatarContainer}>
                  {user.profilePhoto ? (
                    <Image source={{ uri: user.profilePhoto }} style={styles.detailAvatar} />
                  ) : (
                    <View style={styles.detailAvatarPlaceholder}>
                      <Text style={styles.detailAvatarPlaceholderText}>
                        {(user.username || user.name || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.detailUserInfo}>
                  <Text style={styles.detailUserName}>{user.username || user.name}</Text>
                  <Text style={styles.detailUserEmail}>{user.email}</Text>
                  <View style={styles.detailBadgesRow}>
                    <View style={getBadgeStyle('userType', user.userType)}>
                      <Text style={[styles.badgeText, getBadgeTextStyle('userType', user.userType)]}>
                        {user.userType}
                      </Text>
                    </View>
                    <View style={getBadgeStyle('status', status)}>
                      <Text style={[styles.badgeText, getBadgeTextStyle('status', status)]}>
                        {status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.detailJoinedText}>
                    Joined: {new Date(user.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              {isDeactivated && (
                <View style={styles.suspendedNoticeBox}>
                  <Ionicons name="warning" size={20} color="#EF4444" style={styles.suspendedNoticeIcon} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.suspendedNoticeTitle}>Suspended Account</Text>
                    <Text style={styles.suspendedNoticeReason}>Reason: {user.deactivationReason || 'No reason provided.'}</Text>
                  </View>
                </View>
              )}

              <View style={styles.detailDivider} />

              {/* Report history */}
              <View style={styles.detailReportsSection}>
                <Text style={styles.detailReportsTitle}>
                  Report History ({userReports.length})
                </Text>

                {reportsLoading ? (
                  <ActivityIndicator size="small" color="#8B4513" style={{ marginVertical: 20 }} />
                ) : reportsError ? (
                  <Text style={styles.detailReportsError}>{reportsError}</Text>
                ) : userReports.length === 0 ? (
                  <Text style={styles.detailReportsEmpty}>No reports submitted by this user.</Text>
                ) : (
                  <View>
                    {paginatedReports.map((report) => (
                      <View key={report._id} style={styles.detailReportItem}>
                        <View style={styles.detailReportHeader}>
                          <View style={[styles.detailReportLevelDot, { 
                            backgroundColor: report.noiseLevel === 'green' ? '#10B981' : 
                                            report.noiseLevel === 'yellow' ? '#F59E0B' : 
                                            report.noiseLevel === 'red' ? '#EF4444' : '#8B5CF6' 
                          }]} />
                          <Text style={styles.detailReportReason} numberOfLines={1}>
                            {report.reason || 'Noise Report'}
                          </Text>
                          <Text style={styles.detailReportDate}>
                            {new Date(report.createdAt).toLocaleDateString()}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 14, marginTop: 4, marginBottom: 2, flexWrap: 'wrap' }}>
                          {report.averageDecibel ? (
                            <Text style={{ fontSize: 12, color: '#666', fontWeight: '500' }}>🔊 {report.averageDecibel} dB</Text>
                          ) : null}
                          {(() => {
                            const isReportable = report.isReportable != null ? report.isReportable : ((report.aiSummary && report.aiSummary.reportableCount) || 0) > 0;
                            return (
                              <View style={[
                                styles.reportMiniBadge,
                                isReportable ? styles.reportMiniBadgeReportable : styles.reportMiniBadgeNotReportable
                              ]}>
                                <Text style={[
                                  styles.reportMiniBadgeText,
                                  isReportable ? styles.reportMiniBadgeTextReportable : styles.reportMiniBadgeTextNotReportable
                                ]}>
                                  {isReportable ? '⚡ Reportable' : '🚫 Not Reportable'}
                                </Text>
                              </View>
                            );
                          })()}
                        </View>
                        {report.comment ? (
                          <Text style={styles.detailReportComment} numberOfLines={2}>
                            "{report.comment}"
                          </Text>
                        ) : null}
                      </View>
                    ))}

                    {totalPages > 1 && (
                      <View style={styles.detailPaginationRow}>
                        <TouchableOpacity 
                          style={[styles.paginationArrow, reportsPage === 1 && styles.paginationArrowDisabled]}
                          disabled={reportsPage === 1}
                          onPress={() => setReportsPage(prev => Math.max(1, prev - 1))}
                        >
                          <Ionicons name="chevron-back" size={16} color={reportsPage === 1 ? '#CCC' : '#8B4513'} />
                        </TouchableOpacity>
                        <Text style={styles.paginationText}>Page {reportsPage} of {totalPages}</Text>
                        <TouchableOpacity 
                          style={[styles.paginationArrow, reportsPage === totalPages && styles.paginationArrowDisabled]}
                          disabled={reportsPage === totalPages}
                          onPress={() => setReportsPage(prev => Math.min(totalPages, prev + 1))}
                        >
                          <Ionicons name="chevron-forward" size={16} color={reportsPage === totalPages ? '#CCC' : '#8B4513'} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.detailModalActions}>
              {!isDeactivated ? (
                <TouchableOpacity 
                  style={styles.btnDeactivateLarge}
                  onPress={() => {
                    setDeactivateReasonType('spam');
                    setCustomDeactivateReason('');
                    setShowDeactivatePrompt(true);
                  }}
                >
                  <Ionicons name="ban" size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.btnDeactivateLargeText}>Deactivate User</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.btnActivateLarge}
                  onPress={() => activateUser(user._id || user.id)}
                  disabled={processing}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.btnActivateLargeText}>Reactivate User</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={styles.btnTextLarge}
                onPress={() => setSelectedUserForModal(null)}
              >
                <Text style={styles.btnTextLargeText}>Close</Text>
              </TouchableOpacity>
            </View>

            {/* Inner Deactivation Prompt Modal */}
            {showDeactivatePrompt && (
              <Modal
                visible={true}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowDeactivatePrompt(false)}
              >
                <TouchableOpacity 
                  style={styles.promptOverlay}
                  activeOpacity={1}
                  onPress={() => setShowDeactivatePrompt(false)}
                >
                  <View style={styles.promptContent} onStartShouldSetResponder={() => true}>
                    <Text style={styles.promptTitle}>Deactivate User</Text>
                    <Text style={styles.promptSubtitle}>Select suspension reason:</Text>
                    
                    <View style={styles.promptOptions}>
                      {[
                        { key: 'spam', label: 'Spamming of reports' },
                        { key: 'warning', label: 'Frequent warnings on the forum' },
                        { key: 'custom', label: 'Other (Please specify)' }
                      ].map(opt => (
                        <TouchableOpacity 
                          key={opt.key} 
                          style={styles.promptRadioOption}
                          onPress={() => setDeactivateReasonType(opt.key)}
                        >
                          <View style={styles.promptRadioOuter}>
                            {deactivateReasonType === opt.key && <View style={styles.promptRadioInner} />}
                          </View>
                          <Text style={styles.promptRadioLabel}>{opt.label}</Text>
                        </TouchableOpacity>
                      ))}

                      {deactivateReasonType === 'custom' && (
                        <TextInput
                          style={styles.promptCustomTextarea}
                          placeholder="Enter custom deactivation reason..."
                          placeholderTextColor="#999"
                          multiline={true}
                          numberOfLines={3}
                          value={customDeactivateReason}
                          onChangeText={setCustomDeactivateReason}
                        />
                      )}
                    </View>

                    <View style={styles.promptActionsRow}>
                      <TouchableOpacity 
                        style={styles.btnText}
                        onPress={() => setShowDeactivatePrompt(false)}
                      >
                        <Text style={styles.btnTextLabel}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.btnConfirmDeactivate, processing || (deactivateReasonType === 'custom' && !customDeactivateReason.trim()) ? styles.btnDisabled : null]}
                        disabled={processing || (deactivateReasonType === 'custom' && !customDeactivateReason.trim())}
                        onPress={() => {
                          let reasonText = 'Spamming of reports';
                          if (deactivateReasonType === 'warning') {
                            reasonText = 'Frequent warnings on the forum';
                          } else if (deactivateReasonType === 'custom') {
                            reasonText = customDeactivateReason.trim();
                          }
                          deactivateUser(user._id || user.id, reasonText);
                        }}
                      >
                        <Text style={styles.btnConfirmDeactivateText}>
                          {processing ? 'Processing...' : 'Confirm'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              </Modal>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B4513" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={openDrawer} style={styles.headerButton}>
              <Ionicons name="menu" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>User Management</Text>
              <Text style={styles.headerSubtitle}>Manage your users and roles</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.headerButton}>
                <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton}>
                <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.dashboardContainer}>
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search users..."
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholderTextColor="#999"
              />
            </View>
            <TouchableOpacity 
              style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
              onPress={() => setShowFilterDropdown(true)}
            >
              <Ionicons name="filter" size={16} color={hasActiveFilters ? "#FFF" : "#8B4513"} />
              <Text style={[styles.filterButtonText, hasActiveFilters && styles.filterButtonTextActive]}>
                Filter
              </Text>
              {hasActiveFilters && (
                <View style={styles.filterCount}>
                  <Text style={styles.filterCountText}>
                    {selectedFilters.userType.length + selectedFilters.status.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          
          {renderActiveFilters()}

          <View style={styles.usersList}>
            <FlatList
              data={filteredUsers}
              renderItem={renderUserItem}
              keyExtractor={(item) => item._id}
              ListEmptyComponent={renderEmptyState}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={filteredUsers.length === 0 ? styles.emptyListContainer : styles.listContent}
            />
          </View>
        </View>
      </View>

      <FilterModal />
      <UserDetailModal />

      {/* Custom Drawer */}
      <Modal visible={drawerVisible} transparent animationType="none" onRequestClose={closeDrawer}>
        <View style={styles.modalContainer}>
          <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeDrawer} />
          </Animated.View>
          <Animated.View style={[styles.drawerContainer, { transform: [{ translateX: slideAnim }] }]}>
            <CustomDrawer navigation={navigation} onClose={closeDrawer} />
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5E6D3',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5E6D3',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#8B4513',
  },
  header: {
    backgroundColor: '#8B4513',
    paddingBottom: 20,
    paddingTop: getStatusBarHeight(),
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 15,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#F5E6D3',
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  dashboardContainer: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#D4AC0D',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 2,
    borderColor: '#D4AC0D',
    borderRadius: 12,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterButtonActive: {
    backgroundColor: '#D4AC0D',
    borderColor: '#8B4513',
  },
  filterButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#8B4513',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#FFF',
  },
  filterCount: {
    backgroundColor: '#8B4513',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  activeFiltersContainer: {
    marginBottom: 16,
  },
  activeFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#D4AC0D',
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
  },
  filterTagText: {
    fontSize: 12,
    color: '#8B4513',
    fontWeight: '600',
  },
  filterTagRemove: {
    marginLeft: 6,
    padding: 2,
  },
  usersList: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  listContent: {
    paddingBottom: 10,
  },
  modalContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawerContainer: {
    width: width * 0.8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  filterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterDropdown: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    margin: 20,
    maxHeight: 400,
    minWidth: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#D4AC0D',
  },
  filterSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B4513',
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#8B4513',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  checkboxSelected: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  filterLabel: {
    fontSize: 14,
    color: '#333',
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  btnText: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  btnTextLabel: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  btnPrimary: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  btnPrimaryLabel: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFF',
  },
  userInfo: {
    flex: 1,
    marginRight: 12,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: '#666',
  },
  userMeta: {
    alignItems: 'flex-end',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  badgePurple: {
    backgroundColor: '#F3E8FF',
    borderColor: '#A855F7',
  },
  badgePurpleText: {
    color: '#7E22CE',
  },
  badgeBlue: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  badgeBlueText: {
    color: '#1E40AF',
  },
  badgeGray: {
    backgroundColor: '#F3F4F6',
    borderColor: '#9CA3AF',
  },
  badgeGrayText: {
    color: '#4B5563',
  },
  badgeGreen: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  badgeGreenText: {
    color: '#047857',
  },
  badgeOrange: {
    backgroundColor: '#FED7AA',
    borderColor: '#F97316',
  },
  badgeOrangeText: {
    color: '#C2410C',
  },
  joinDate: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BBB',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyListContainer: {
    flex: 1,
  },
  badgeRed: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  badgeRedText: {
    color: '#B91C1C',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 2,
    borderColor: '#D4AC0D',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FAF5F0',
    borderBottomWidth: 1,
    borderBottomColor: '#EAE6DF',
  },
  detailModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  detailModalScroll: {
    padding: 20,
  },
  detailUserSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  detailAvatarContainer: {
    position: 'relative',
  },
  detailAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#D4AC0D',
  },
  detailAvatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D4AC0D',
  },
  detailAvatarPlaceholderText: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  detailUserInfo: {
    flex: 1,
    gap: 4,
  },
  detailUserName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  detailUserEmail: {
    fontSize: 14,
    color: '#666',
  },
  detailBadgesRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  detailJoinedText: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  suspendedNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    gap: 8,
  },
  suspendedNoticeIcon: {
    marginTop: 2,
  },
  suspendedNoticeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#991B1B',
  },
  suspendedNoticeReason: {
    fontSize: 13,
    color: '#7F1D1D',
    marginTop: 2,
    lineHeight: 18,
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#EAE6DF',
    marginVertical: 16,
  },
  detailReportsSection: {
    gap: 12,
  },
  detailReportsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 8,
  },
  detailReportsError: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    padding: 16,
  },
  detailReportsEmpty: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    padding: 16,
    backgroundColor: '#FAF9F6',
    borderRadius: 10,
  },
  detailReportItem: {
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#EAE6DF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 4,
  },
  detailReportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailReportLevelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  detailReportReason: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  detailReportDate: {
    fontSize: 11,
    color: '#999',
  },
  detailReportMeta: {
    fontSize: 12,
    color: '#666',
    marginLeft: 14,
  },
  detailReportComment: {
    fontSize: 13,
    color: '#555',
    fontStyle: 'italic',
    marginLeft: 14,
    marginTop: 2,
  },
  detailPaginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  paginationArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#D4AC0D',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  paginationArrowDisabled: {
    opacity: 0.4,
    borderColor: '#CCC',
  },
  paginationText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  detailModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FAF5F0',
    borderTopWidth: 1,
    borderTopColor: '#EAE6DF',
    gap: 12,
  },
  btnDeactivateLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  btnDeactivateLargeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  btnActivateLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  btnActivateLargeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  btnTextLarge: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  btnTextLargeText: {
    color: '#666',
    fontSize: 14,
    fontWeight: 'bold',
  },
  promptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: '85%',
    padding: 24,
    borderWidth: 2,
    borderColor: '#EF4444',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#B91C1C',
  },
  promptSubtitle: {
    fontSize: 14,
    color: '#4B5563',
  },
  promptOptions: {
    gap: 12,
  },
  promptRadioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  promptRadioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  promptRadioLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  promptCustomTextarea: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#333',
    width: '100%',
    textAlignVertical: 'top',
  },
  promptActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  btnConfirmDeactivate: {
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  btnConfirmDeactivateText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  reportMiniBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportMiniBadgeReportable: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  reportMiniBadgeNotReportable: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  reportMiniBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  reportMiniBadgeTextReportable: {
    color: '#EF4444',
  },
  reportMiniBadgeTextNotReportable: {
    color: '#4B5563',
  },
});

export default UserManagement;