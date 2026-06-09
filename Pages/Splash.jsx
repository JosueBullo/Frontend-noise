import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Dimensions, Animated, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import API_BASE_URL from '../utils/api';

const { width, height } = Dimensions.get('window');

const C = {
  dark: '#3E2C23',
  mid: '#5D4A36',
  saddle: '#8B4513',
  gold: '#DAA520',
  cream: '#FDF5E6',
};

export default function SplashScreen({ navigation }) {
  const ring1Scale = useRef(new Animated.Value(1)).current;
  const ring2Scale = useRef(new Animated.Value(1)).current;
  const ring3Scale = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;
  const ring3Opacity = useRef(new Animated.Value(0)).current;

  const logoScale = useRef(new Animated.Value(0.4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  const makeRingAnim = (scale, opacity) =>
    Animated.parallel([
      Animated.timing(scale, { toValue: 3.5, duration: 1800, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.6, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ]),
    ]);

  const startRipples = () => {
    Animated.loop(
      Animated.stagger(450, [
        makeRingAnim(ring1Scale, ring1Opacity),
        makeRingAnim(ring2Scale, ring2Opacity),
        makeRingAnim(ring3Scale, ring3Opacity),
      ])
    ).start();
  };

  useEffect(() => {
    // Logo bounce entry animation
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 12, friction: 4, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]).start();

    startRipples();

    let destination = 'Landing';
    let deactivatedReason = null;

    const checkSessionAndPrepareRoute = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const response = await axios.get(`${API_BASE_URL}/user/profile`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.data.success) {
            const user = response.data.user;
            if (user.isDeactivated) {
              destination = 'DeactivatedScreen';
              deactivatedReason = user.deactivationReason;
            } else {
              destination = user.userType === 'admin' ? 'AdminDashboard' : 'Home';
            }
          }
        }
      } catch (error) {
        if (error.response?.status === 403 && error.response?.data?.isDeactivated) {
          destination = 'DeactivatedScreen';
          deactivatedReason = error.response.data.deactivationReason;
        } else if (error.response?.status === 401 || error.response?.status === 404) {
          await AsyncStorage.multiRemove(['userToken', 'userData', 'isAuthenticated', 'userId', 'userType']);
        }
      }
    };

    checkSessionAndPrepareRoute();

    // 2.8 seconds splash time then navigate
    const timer = setTimeout(() => {
      if (destination === 'DeactivatedScreen') {
        navigation.replace('DeactivatedScreen', { reason: deactivatedReason });
      } else if (destination === 'Landing') {
        navigation.replace('Landing');
      } else {
        navigation.reset({ index: 0, routes: [{ name: destination }] });
      }
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient colors={[C.dark, '#2C1E18']} style={styles.container}>
      <View style={styles.waveContainer}>
        {/* Ripples */}
        <Animated.View style={[styles.ring, { opacity: ring1Opacity, transform: [{ scale: ring1Scale }] }]} />
        <Animated.View style={[styles.ring, { opacity: ring2Opacity, transform: [{ scale: ring2Scale }] }]} />
        <Animated.View style={[styles.ring, { opacity: ring3Opacity, transform: [{ scale: ring3Scale }] }]} />

        {/* Logo */}
        <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
          <View style={styles.logoWrap}>
            <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          </View>
        </Animated.View>
      </View>

      <Animated.View style={[styles.footerText, { opacity: logoOpacity }]}>
        <Text style={styles.title}>NOISEWATCH</Text>
        <Text style={styles.tagline}>A Quiet Community Awaits</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ring: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2.5,
    borderColor: C.gold,
  },
  logoWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.gold,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  footerText: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: C.cream,
    letterSpacing: 4,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 12,
    color: C.gold,
    fontWeight: '500',
    opacity: 0.8,
  },
});
