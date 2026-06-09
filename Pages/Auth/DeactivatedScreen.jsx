import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Dimensions, StatusBar, Platform, Linking
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const SB_HEIGHT = Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;

const C = {
  dark:   '#3E2C23',
  saddle: '#8B4513',
  gold:   '#DAA520',
  cream:  '#FDF5E6',
  bg:     '#F5F0E8',
  white:  '#FFFFFF',
  red:    '#EF4444',
  text:   '#333333',
  sub:    '#8B7355',
  muted:  '#A89070',
};

export default function DeactivatedScreen({ route, navigation }) {
  // Extract reason from route params, fallback to default message
  const reason = route.params?.reason || 'No specific reason provided by administration.';

  const handleEmailSupport = async () => {
    const email = 'noisewatch2526@gmail.com';
    const subject = encodeURIComponent('Account Appeal - NOISEWATCH');
    const body = encodeURIComponent('Hi Support,\n\nMy account has been suspended/deactivated. I would like to request a review of my account.\n\nDeactivation Reason: ' + reason + '\n\nThank you.');
    const url = `mailto:${email}?subject=${subject}&body=${body}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        alert('Could not open native mail app. Please email ' + email + ' manually.');
      }
    } catch (e) {
      console.error('Email Support Error:', e);
      alert('An error occurred. Please email noisewatch2526@gmail.com.');
    }
  };

  const handleBackToLogin = async () => {
    // Clear credentials on logout/redirect
    await AsyncStorage.multiRemove([
      'userToken', 'userData', 'isAuthenticated', 'userId', 'userType'
    ]);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      
      <LinearGradient 
        colors={[C.dark, C.saddle, '#1C1510']} 
        style={s.gradient}
        start={{ x: 0.2, y: 0 }} 
        end={{ x: 0.8, y: 1 }}
      >
        <View style={s.card}>
          <View style={s.iconContainer}>
            <Ionicons name="lock-closed" size={56} color={C.red} />
          </View>
          
          <Text style={s.title}>Account Suspended</Text>
          <Text style={s.subtitle}>
            Your access to NOISEWATCH has been deactivated due to a policy violation.
          </Text>

          <View style={s.reasonBox}>
            <Text style={s.reasonLabel}>Deactivation Reason:</Text>
            <Text style={s.reasonText}>{reason}</Text>
          </View>

          <TouchableOpacity 
            style={s.supportBtn} 
            onPress={handleEmailSupport}
            activeOpacity={0.8}
          >
            <Ionicons name="mail" size={20} color={C.white} />
            <Text style={s.supportBtnText}>Email Support</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={s.backBtn} 
            onPress={handleBackToLogin}
            activeOpacity={0.8}
          >
            <Text style={s.backBtnText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>

        <View style={s.footer}>
          <Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" />
          <Text style={s.footerText}>NOISEWATCH Support Team</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const s = StyleSheet.create({
  root: { 
    flex: 1, 
    backgroundColor: C.bg 
  },
  gradient: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 24, 
    paddingTop: SB_HEIGHT 
  },
  card: { 
    backgroundColor: C.white, 
    borderRadius: 24, 
    padding: 28, 
    width: '100%', 
    alignItems: 'center', 
    elevation: 12, 
    shadowColor: C.dark, 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 16 
  },
  iconContainer: { 
    width: 90, 
    height: 90, 
    borderRadius: 45, 
    backgroundColor: '#FEE2E2', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  title: { 
    fontSize: 24, 
    fontWeight: '900', 
    color: '#111827', 
    marginBottom: 10, 
    letterSpacing: 0.5 
  },
  subtitle: { 
    fontSize: 14, 
    color: '#6B7280', 
    textAlign: 'center', 
    lineHeight: 20, 
    marginBottom: 24 
  },
  reasonBox: { 
    width: '100%', 
    backgroundColor: '#F9FAFB', 
    borderRadius: 14, 
    padding: 16, 
    borderWidth: 1.5, 
    borderColor: '#F3F4F6', 
    marginBottom: 24 
  },
  reasonLabel: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: '#9CA3AF', 
    textTransform: 'uppercase', 
    marginBottom: 6, 
    letterSpacing: 0.5 
  },
  reasonText: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#374151', 
    lineHeight: 22 
  },
  supportBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    backgroundColor: C.saddle, 
    paddingVertical: 14, 
    paddingHorizontal: 24, 
    borderRadius: 14, 
    width: '100%', 
    marginBottom: 14, 
    elevation: 2 
  },
  supportBtnText: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: C.white 
  },
  backBtn: { 
    paddingVertical: 12, 
    width: '100%', 
    alignItems: 'center' 
  },
  backBtnText: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: C.saddle, 
    textDecorationLine: 'underline' 
  },
  footer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    marginTop: 30 
  },
  logo: { 
    width: 28, 
    height: 28, 
    borderRadius: 6 
  },
  footerText: { 
    fontSize: 12, 
    color: 'rgba(255,255,255,0.6)', 
    fontWeight: '600' 
  }
});
