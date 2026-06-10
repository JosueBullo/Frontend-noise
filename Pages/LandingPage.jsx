import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image,
  Dimensions, StatusBar, Platform, Animated, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import API_BASE_URL from '../utils/api';

const { width, height } = Dimensions.get('window');
const SB_HEIGHT = Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;

const C = {
  dark:   '#3E2C23',
  mid:    '#5D4A36',
  saddle: '#8B4513',
  gold:   '#DAA520',
  cream:  '#FDF5E6',
  bg:     '#F5F0E8',
  white:  '#FFFFFF',
  green:  '#4CAF50',
  red:    '#E53935',
  text:   '#333333',
  sub:    '#8B7355',
  muted:  '#A89070',
};

const TABS = ['ABOUT US', 'FEATURES', 'HOW TO USE', 'RESOURCES'];

const MEMBERS = [
  { key: 'RICO',    image: require('../assets/RICO.png'),    name: 'Dr. Rico S. Santos',   role: 'Technical Adviser',                             program: null,            icon: 'school-outline' },
  { key: 'CHAN',    image: require('../assets/CHAN.png'),    name: 'Christian Salagubang', role: 'Leader · Full Stack Developer · Documentation', program: 'BSIT 4th Year', icon: 'code-slash-outline' },
  { key: 'CARLA',  image: require('../assets/CARLA.jpg'),   name: 'Carla Dasal',          role: 'Full Stack Developer · Prototype Developer',    program: 'BSIT 4th Year', icon: 'construct-outline' },
  { key: 'JL',     image: require('../assets/JL.jpg'),     name: 'John Lawrence Josue',  role: 'Full Stack Developer · Prototype Developer',    program: 'BSIT 4th Year', icon: 'construct-outline' },
  { key: 'CHARLES',image: require('../assets/CHARLES.jpg'), name: 'Charles Derick Bulante', role: 'UI/UX Designer · Documentation',               program: 'BSIT 4th Year', icon: 'color-palette-outline' },
];

const FEATURES = [
  {
    image: require('../assets/RECORDING.png'),
    title: 'Noise Recording',
    icon: 'mic-outline',
    color: '#E53935',
    bg: '#FFEBEE',
    desc: 'Capture real-time audio evidence of noise disturbances directly from your device. The system automatically analyzes recordings using AI to detect noise type, measure decibel levels, and assess reportability — ensuring every complaint is backed by verifiable data.',
  },
  {
    image: require('../assets/REPORTING.png'),
    title: 'Noise Reporting',
    icon: 'document-text-outline',
    color: '#1E88E5',
    bg: '#E3F2FD',
    desc: 'Submit structured noise complaints to local barangay authorities with a single tap. Each report is automatically tagged with location, timestamp, noise classification, and AI-generated insights — enabling faster and more informed government response.',
  },
  {
    image: require('../assets/MAPPING.png'),
    title: 'Noise Mapping',
    icon: 'map-outline',
    color: '#43A047',
    bg: '#E8F5E9',
    desc: 'Visualize noise pollution across your community through an interactive street-level heatmap. Identify high-disturbance zones, track recurring hotspots, and empower local officials with spatial data to prioritize enforcement and intervention.',
  },
  {
    image: require('../assets/NOISE LEVELS.png'),
    title: 'Noise Level Analysis',
    icon: 'analytics-outline',
    color: '#FB8C00',
    bg: '#FFF3E0',
    desc: 'Understand the severity of noise incidents through a standardized classification system — from Low (Green) to Critical (Purple). AI-powered decibel measurement and distance estimation provide objective, data-driven assessments for every reported incident.',
  },
];

const HOW_TO_USE = [
  { step: '01', icon: 'person-add-outline',    color: '#8B4513', title: 'Create Your Account',   desc: 'Register using your email address and set a secure password. Your account enables you to submit reports, track complaint history, and receive real-time status updates from barangay officials.' },
  { step: '02', icon: 'mic-circle-outline',    color: '#E53935', title: 'Record the Noise',      desc: 'Navigate to the Report screen and tap the record button to capture audio of the disturbance. The system will automatically analyze the recording — detecting noise type, measuring decibel levels, and evaluating reportability.' },
  { step: '03', icon: 'location-outline',      color: '#43A047', title: 'Confirm Your Location', desc: 'Allow the app to access your GPS location or manually pin the exact address of the noise source. Accurate location data ensures your report reaches the correct barangay jurisdiction.' },
  { step: '04', icon: 'send-outline',          color: '#1E88E5', title: 'Submit Your Report',    desc: 'Review the auto-generated report details — including noise classification, AI analysis, and location — then submit. Your complaint is instantly forwarded to the appropriate barangay authority for review.' },
  { step: '05', icon: 'notifications-outline', color: '#FB8C00', title: 'Track Report Status',   desc: 'Monitor the progress of your submitted reports in real time. Receive push notifications when barangay officials update the status — from Pending Review to Monitoring, Action Required, or Resolved.' },
  { step: '06', icon: 'map-outline',           color: '#9C27B0', title: 'Explore the Noise Map', desc: 'Browse the community heatmap to view noise hotspots in your area. Identify streets with recurring disturbances and stay informed about noise conditions across your neighborhood.' },
];

const ARTICLES = [
  {
    title: 'DILG Orders Crackdowns on Loud Videoke During Remote Classes',
    category: 'GOVERNMENT DIRECTIVE',
    date: 'October 2020',
    source: 'DILG Press Release',
    fullText: 'The Department of the Interior and Local Government (DILG) directed local government units (LGUs) and the Philippine National Police (PNP) to strictly implement ordinances prohibiting loud videoke and other loud noises that disrupt online classes and remote work.\n\nFormer DILG Secretary Eduardo Año emphasized that as students adjust to blended learning, they require a quiet environment to study. LGUs were urged to pass ordinances banning videoke and other distracting noises during class hours (typically 7:00 AM to 5:00 PM, Monday to Friday).\n\nPenalties for violators range from warnings to fines, and confiscation of sound equipment by local barangay officials or police officers. NoiseWatch helps citizens directly log these daytime offenses and report them with decibel data.',
    image: require('../assets/nuisance.jpg')
  },
  {
    title: 'Metro Manila Traffic Noise Impact on Mental Health & Cardiovascular Safety',
    category: 'ENVIRONMENTAL STUDY',
    date: 'March 2023',
    source: 'DOST / Clean Air Asia',
    fullText: 'A study conducted on urban noise levels across major thoroughfares in Metro Manila (including EDSA, C-5, and Taft Avenue) revealed that average daytime noise levels regularly exceed 75 decibels (dB), far above the WHO-recommended safety limit of 55 dB.\n\nResearchers highlighted that persistent exposure to traffic noise, train transits, and unregulated vehicle mufflers is a major contributor to high stress, hypertension, sleep disruption, and decreased productivity.\n\nThe report recommends strict implementation of muffler bans, sound barriers near residential zones, and community-driven monitoring systems like NoiseWatch to build high-resolution noise heatmaps for policy formulation.',
    image: require('../assets/who.jpg')
  }
];

// ── Fade-slide in (content only, not headers) ────────────────────────────────
function FadeSlide({ delay = 0, children }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 500, delay, useNativeDriver: true }),
    ]).start();
  }, [delay, opacity, translateY]);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

// ── NOISEWATCH logo with sound-wave tap animation ────────────────────────────
function NoisewatchLogoAnimated() {
  const ring1Scale   = useRef(new Animated.Value(1)).current;
  const ring2Scale   = useRef(new Animated.Value(1)).current;
  const ring3Scale   = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;
  const ring3Opacity = useRef(new Animated.Value(0)).current;
  const logoScale    = useRef(new Animated.Value(1)).current;
  const [playing, setPlaying] = useState(false);

  const makeRingAnim = (scale, opacity) =>
    Animated.parallel([
      Animated.timing(scale,   { toValue: 3.2, duration: 750, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 100, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0,   duration: 650, useNativeDriver: true }),
      ]),
    ]);

  const triggerWave = () => {
    if (playing) return;
    setPlaying(true);
    ring1Scale.setValue(1); ring2Scale.setValue(1); ring3Scale.setValue(1);
    ring1Opacity.setValue(0); ring2Opacity.setValue(0); ring3Opacity.setValue(0);
    logoScale.setValue(1);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(logoScale, { toValue: 1.13, duration: 150, useNativeDriver: true }),
        Animated.timing(logoScale, { toValue: 1,    duration: 200, useNativeDriver: true }),
      ]),
      Animated.stagger(140, [
        makeRingAnim(ring1Scale, ring1Opacity),
        makeRingAnim(ring2Scale, ring2Opacity),
        makeRingAnim(ring3Scale, ring3Opacity),
      ]),
    ]).start(() => setPlaying(false));
  };

  return (
    <TouchableOpacity onPress={triggerWave} activeOpacity={0.85} style={s.nwLogoWrap}>
      {/* Rings — scale from center, opacity fades out */}
      {[[ring1Scale, ring1Opacity], [ring2Scale, ring2Opacity], [ring3Scale, ring3Opacity]].map(([sc, op], i) => (
        <Animated.View
          key={i}
          style={[s.nwRing, { opacity: op, transform: [{ scale: sc }] }]}
        />
      ))}
      <Animated.View style={{ transform: [{ scale: logoScale }] }}>
        <View style={s.heroLogoWrap}>
          <Image source={require('../assets/logo.png')} style={s.heroLogo} resizeMode="contain" />
        </View>
      </Animated.View>
      <Text style={s.nwTapHint}>Tap me!</Text>
    </TouchableOpacity>
  );
}

// ── Simple pulsing wrapper (kept for other uses) ─────────────────────────────
function PulseLogo({ children }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.06, duration: 1400, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,    duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, [scale]);
  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}

export default function LandingPage({ navigation }) {
  const [activeTab, setActiveTab] = useState(0);
  const scrollRef = useRef(null);
  const [tabKey, setTabKey] = useState(0);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          // Fetch profile to verify token status
          const response = await axios.get(`${API_BASE_URL}/user/profile`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          if (response.data.success) {
            const user = response.data.user;
            if (user.isDeactivated) {
              navigation.replace('DeactivatedScreen', { reason: user.deactivationReason });
            } else {
              const dest = user.userType === 'admin' ? 'AdminDashboard' : 'Home';
              navigation.reset({ index: 0, routes: [{ name: dest }] });
            }
          }
        }
      } catch (error) {
        if (error.response?.status === 403 && error.response?.data?.isDeactivated) {
          navigation.replace('DeactivatedScreen', { reason: error.response.data.deactivationReason });
        } else if (error.response?.status === 401 || error.response?.status === 404) {
          // Token invalid or user deleted, clear session cache
          await AsyncStorage.multiRemove([
            'userToken', 'userData', 'isAuthenticated', 'userId', 'userType'
          ]);
        }
      }
    };
    checkSession();
  }, [navigation]);

  const handleTabPress = useCallback((idx) => {
    setActiveTab(idx);
    setTabKey(k => k + 1);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />

      {/* ── Top Header — no fade, always visible ── */}
      <LinearGradient colors={[C.dark, C.saddle]} style={s.topBar}>
        <View style={{ paddingTop: SB_HEIGHT + 6, paddingHorizontal: 20, paddingBottom: 16 }}>
          <View style={s.topBarRow}>
            <Image source={require('../assets/logo.png')} style={s.topLogo} resizeMode="contain" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.topTitle}>NOISEWATCH</Text>
              <Text style={s.topSub}>Noise Disturbance Reporting and Monitoring System</Text>
            </View>
            <TouchableOpacity style={s.loginBtn} onPress={() => navigation.navigate('Login')}>
              <Text style={s.loginBtnText}>Login</Text>
              <Ionicons name="arrow-forward" size={14} color={C.saddle} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* ── Tab Bar — no fade ── */}
      <View style={s.tabBar}>
        {TABS.map((tab, i) => (
          <TouchableOpacity key={tab} style={s.tabItem} onPress={() => handleTabPress(i)} activeOpacity={0.8}>
            <Text style={[s.tabText, activeTab === i && s.tabTextActive]}>{tab}</Text>
            {activeTab === i && <View style={s.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView ref={scrollRef} style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ════════════════ ABOUT US ════════════════ */}
        {activeTab === 0 && (
          <View key={`about-${tabKey}`}>

            {/* Hero — no fade */}
            <LinearGradient colors={[C.saddle, '#654321', C.dark]} style={s.hero}>
              <NoisewatchLogoAnimated />
              <Text style={s.heroTitle}>NOISEWATCH</Text>
              <Text style={s.heroTagline}>Noise Disturbance Reporting{'\n'}and Monitoring System</Text>
              <View style={s.heroDivider} />
              <Text style={s.heroDesc}>
                A community-driven mobile platform designed to monitor, report, and address noise pollution at the barangay level — bridging the gap between citizens and local governance.
              </Text>
            </LinearGradient>

            {/* Mission cards */}
            <FadeSlide delay={80}>
              <View style={s.section}>
                <View style={s.sectionLabelRow}>
                  <View style={s.sectionDot} />
                  <Text style={s.sectionLabel}>OUR MISSION</Text>
                </View>
                <Text style={s.sectionTitle}>What is NOISEWATCH?</Text>

                <View style={s.descCard}>
                  <View style={s.descCardIconWrap}>
                    <Ionicons name="information-circle-outline" size={22} color={C.saddle} />
                  </View>
                  <Text style={s.descCardText}>
                    NOISEWATCH is an AI-powered noise monitoring and reporting system developed by 4th Year BSIT students of TUP Taguig to help Filipino communities effectively document and escalate noise disturbances to the appropriate local government units.
                  </Text>
                </View>

                <View style={[s.descCard, { borderLeftColor: C.gold }]}>
                  <View style={[s.descCardIconWrap, { backgroundColor: '#FFF8E1' }]}>
                    <Ionicons name="bulb-outline" size={22} color={C.gold} />
                  </View>
                  <Text style={s.descCardText}>
                    By combining real-time audio analysis, GPS-based location tagging, and automated barangay notification, NOISEWATCH transforms how communities respond to noise pollution — making the process transparent, data-driven, and accessible to every citizen.
                  </Text>
                </View>

                <View style={[s.descCard, { borderLeftColor: '#43A047' }]}>
                  <View style={[s.descCardIconWrap, { backgroundColor: '#E8F5E9' }]}>
                    <Ionicons name="shield-checkmark-outline" size={22} color="#43A047" />
                  </View>
                  <Text style={s.descCardText}>
                    Designed in alignment with local governance frameworks, the system empowers barangay officials with actionable data — enabling faster, evidence-based responses to noise complaints across the community.
                  </Text>
                </View>
              </View>
            </FadeSlide>

            {/* Stats */}
            <FadeSlide delay={160}>
              <View style={s.statsRow}>
                {[
                  { icon: 'mic-outline',              value: 'AI-Powered', label: 'Audio Analysis', color: C.red     },
                  { icon: 'map-outline',              value: 'Real-Time',  label: 'Noise Mapping',  color: '#43A047' },
                  { icon: 'shield-checkmark-outline', value: 'Barangay',   label: 'Integrated',     color: C.saddle  },
                ].map((st, i) => (
                  <View key={i} style={s.statCard}>
                    <View style={[s.statIconWrap, { backgroundColor: st.color + '18' }]}>
                      <Ionicons name={st.icon} size={22} color={st.color} />
                    </View>
                    <Text style={s.statValue}>{st.value}</Text>
                    <Text style={s.statLabel2}>{st.label}</Text>
                  </View>
                ))}
              </View>
            </FadeSlide>

            {/* Team header */}
            <FadeSlide delay={220}>
              <View style={s.section}>
                <View style={s.sectionLabelRow}>
                  <View style={s.sectionDot} />
                  <Text style={s.sectionLabel}>THE TEAM</Text>
                </View>
                <Text style={s.sectionTitle}>Meet the Developers</Text>
                <Text style={s.bodyText}>
                  NOISEWATCH was built by a dedicated team of 4th Year Bachelor of Science in Information Technology (BSIT) students of TUP Taguig, committed to creating technology that serves the public good.
                </Text>
              </View>
            </FadeSlide>

            {/* Members */}
            {MEMBERS.map((m, i) => (
              <FadeSlide key={m.key} delay={280 + i * 70}>
                <View style={s.memberCard}>
                  <Image source={m.image} style={s.memberPhoto} resizeMode="cover" />
                  <View style={s.memberInfo}>
                    <Text style={s.memberName}>{m.name}</Text>
                    <Text style={s.memberRole}>{m.role}</Text>
                    {m.program && (
                      <View style={s.memberBadge}>
                        <Ionicons name="school-outline" size={10} color={C.saddle} />
                        <Text style={s.memberBadgeText}>{m.program}</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.memberIconWrap}>
                    <Ionicons name={m.icon} size={18} color={C.saddle} />
                  </View>
                </View>
              </FadeSlide>
            ))}

            {/* TUP logo — after Charles */}
            <FadeSlide delay={640}>
              <View style={s.tupFooterCard}>
                <Image source={require('../assets/TUP.png')} style={s.tupFooterLogo} resizeMode="contain" />
                <View style={s.tupInfo}>
                  <Text style={s.tupName}>Technological University of the Philippines</Text>
                  <Text style={s.tupCampus}>Taguig City Campus</Text>
                  <View style={s.tupBadge}>
                    <Ionicons name="school-outline" size={11} color={C.saddle} />
                    <Text style={s.tupBadgeText}>BSIT 4th Year</Text>
                  </View>
                </View>
              </View>
            </FadeSlide>

            <FadeSlide delay={720}>
              <LinearGradient colors={[C.saddle, C.dark]} style={s.ctaBox}>
                <Ionicons name="volume-high-outline" size={36} color={C.gold} />
                <Text style={s.ctaTitle}>Ready to make your community quieter?</Text>
                <Text style={s.ctaDesc}>Join NOISEWATCH and help build a more peaceful neighborhood.</Text>
                <TouchableOpacity style={s.ctaBtn} onPress={() => navigation.navigate('Register')}>
                  <Text style={s.ctaBtnText}>Get Started — It's Free</Text>
                  <Ionicons name="arrow-forward" size={16} color={C.saddle} />
                </TouchableOpacity>
              </LinearGradient>
            </FadeSlide>
          </View>
        )}

        {/* ════════════════ FEATURES ════════════════ */}
        {activeTab === 1 && (
          <View key={`features-${tabKey}`}>

            {/* Page hero — no fade */}
            <LinearGradient colors={[C.saddle, '#654321']} style={s.pageHero}>
              <Ionicons name="star-outline" size={32} color={C.gold} />
              <Text style={s.pageHeroTitle}>Core Features</Text>
              <Text style={s.pageHeroSub}>Everything you need to monitor and report noise disturbances in your community</Text>
            </LinearGradient>

            {FEATURES.map((f, i) => (
              <FadeSlide key={i} delay={60 + i * 110}>
                <View style={s.featureCard}>
                  {/* Large full image */}
                  <View style={[s.featureImageWrap, { backgroundColor: f.bg }]}>
                    <Image source={f.image} style={s.featureImage} resizeMode="contain" />
                  </View>
                  {/* Colored accent bar */}
                  <View style={[s.featureAccentBar, { backgroundColor: f.color }]} />
                  <View style={s.featureBody}>
                    <View style={s.featureTitleRow}>
                      <View style={[s.featureIconWrap, { backgroundColor: f.bg }]}>
                        <Ionicons name={f.icon} size={22} color={f.color} />
                      </View>
                      <Text style={s.featureTitle}>{f.title}</Text>
                    </View>
                    <Text style={s.featureDesc}>{f.desc}</Text>
                  </View>
                </View>
              </FadeSlide>
            ))}

            <FadeSlide delay={520}>
              <LinearGradient colors={[C.saddle, C.dark]} style={s.ctaBox}>
                <Ionicons name="rocket-outline" size={36} color={C.gold} />
                <Text style={s.ctaTitle}>Experience all features firsthand</Text>
                <Text style={s.ctaDesc}>Sign up now and start contributing to a quieter, safer community.</Text>
                <TouchableOpacity style={s.ctaBtn} onPress={() => navigation.navigate('Register')}>
                  <Text style={s.ctaBtnText}>Create Free Account</Text>
                  <Ionicons name="arrow-forward" size={16} color={C.saddle} />
                </TouchableOpacity>
              </LinearGradient>
            </FadeSlide>
          </View>
        )}

        {/* ════════════════ HOW TO USE ════════════════ */}
        {activeTab === 2 && (
          <View key={`howto-${tabKey}`}>

            {/* Page hero — no fade */}
            <LinearGradient colors={[C.saddle, '#654321']} style={s.pageHero}>
              <Ionicons name="compass-outline" size={32} color={C.gold} />
              <Text style={s.pageHeroTitle}>How to Use</Text>
              <Text style={s.pageHeroSub}>Get started with NOISEWATCH in just a few simple steps</Text>
            </LinearGradient>

            <View style={s.section}>
              {HOW_TO_USE.map((step, i) => (
                <FadeSlide key={i} delay={60 + i * 80}>
                  <View style={s.stepCard}>
                    <View style={s.stepLeft}>
                      <View style={[s.stepIconCircle, { backgroundColor: step.color }]}>
                        <Ionicons name={step.icon} size={22} color={C.white} />
                      </View>
                      {i < HOW_TO_USE.length - 1 && <View style={s.stepConnector} />}
                    </View>
                    <View style={s.stepRight}>
                      <Text style={[s.stepNum, { color: step.color }]}>STEP {step.step}</Text>
                      <Text style={s.stepTitle}>{step.title}</Text>
                      <Text style={s.stepDesc}>{step.desc}</Text>
                    </View>
                  </View>
                </FadeSlide>
              ))}
            </View>

            <FadeSlide delay={560}>
              <View style={s.tipsBox}>
                <View style={s.tipsHeader}>
                  <Ionicons name="bulb-outline" size={20} color={C.gold} />
                  <Text style={s.tipsTitle}>Pro Tips</Text>
                </View>
                {[
                  'Record at least 10 seconds of audio for accurate AI analysis.',
                  'Enable GPS for precise location tagging on every report.',
                  'Check the Noise Map regularly to stay aware of hotspots near you.',
                  'Use the History screen to track all your past submissions.',
                ].map((tip, i) => (
                  <View key={i} style={s.tipRow}>
                    <View style={s.tipDot} />
                    <Text style={s.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            </FadeSlide>

            <FadeSlide delay={640}>
              <LinearGradient colors={[C.saddle, C.dark]} style={s.ctaBox}>
                <Ionicons name="checkmark-circle-outline" size={36} color={C.gold} />
                <Text style={s.ctaTitle}>You're ready to get started!</Text>
                <Text style={s.ctaDesc}>Create your account and submit your first noise report today.</Text>
                <TouchableOpacity style={s.ctaBtn} onPress={() => navigation.navigate('Register')}>
                  <Text style={s.ctaBtnText}>Register Now</Text>
                  <Ionicons name="arrow-forward" size={16} color={C.saddle} />
                </TouchableOpacity>
                <TouchableOpacity style={s.ctaSecondaryBtn} onPress={() => navigation.navigate('Login')}>
                  <Text style={s.ctaSecondaryText}>Already have an account? Login</Text>
                </TouchableOpacity>
              </LinearGradient>
            </FadeSlide>
          </View>
        )}

        {/* ════════════════ RESOURCES ════════════════ */}
        {activeTab === 3 && (
          <View key={`resources-${tabKey}`}>
            
            {/* Page Hero */}
            <LinearGradient colors={[C.saddle, '#654321']} style={s.pageHero}>
              <Ionicons name="book-outline" size={32} color={C.gold} />
              <Text style={s.pageHeroTitle}>Articles & Legal Resources</Text>
              <Text style={s.pageHeroSub}>Educating communities on noise pollution, global health standards, and local legal rights</Text>
            </LinearGradient>

            {/* Section 1: Intro */}
            <FadeSlide delay={60}>
              <View style={s.section}>
                <View style={s.sectionLabelRow}>
                  <View style={s.sectionDot} />
                  <Text style={s.sectionLabel}>THE INVISIBLE THREAT</Text>
                </View>
                <Text style={s.sectionTitle}>Silence is Health: Understanding Noise Pollution</Text>
                <Text style={s.bodyText}>
                  Noise pollution is often dismissed as a mere temporary annoyance, yet it remains one of the most pervasive, invisible health hazards of modern urban life. Unlike visible waste, excess sound waves accumulate silently in our nervous systems, inducing chronic stress and deteriorating our well-being. NoiseWatch is built to make this invisible hazard measurable, empowering citizens to reclaim their peace and protect their health.
                </Text>

                <Text style={[s.detailLabel, { marginTop: 18, marginBottom: 8 }]}>🔍 Noise Disturbance vs. Noise Pollution</Text>

                <View style={[s.descCard, { borderLeftColor: C.gold }]}>
                  <View style={[s.descCardIconWrap, { backgroundColor: '#FFF8E1' }]}>
                    <Ionicons name="alert-circle-outline" size={20} color={C.gold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.descCardTitle}>Noise Disturbance (Panandaliang Ingay)</Text>
                    <Text style={s.descCardSubText}>
                      Short-term, localized, and specific noise incidents (e.g., loud videoke, barking dogs, loud vehicle exhausts). These are immediate disturbances governed by local barangay curfews and public nuisance laws.
                    </Text>
                  </View>
                </View>

                <View style={[s.descCard, { borderLeftColor: '#E53935' }]}>
                  <View style={[s.descCardIconWrap, { backgroundColor: '#FFEBEE' }]}>
                    <Ionicons name="warning-outline" size={20} color="#E53935" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.descCardTitle}>Noise Pollution (Polusyon sa Ingay)</Text>
                    <Text style={s.descCardSubText}>
                      Chronic, systemic, and continuous high-decibel exposure (e.g., highway traffic roar, construction zones, airport flight paths). It represents a persistent environmental hazard that degrades public health over time.
                    </Text>
                  </View>
                </View>
              </View>
            </FadeSlide>

            {/* Section 2: WHO Standards */}
            <FadeSlide delay={120}>
              <View style={s.section}>
                <View style={s.sectionLabelRow}>
                  <View style={s.sectionDot} />
                  <Text style={s.sectionLabel}>GLOBAL HEALTH GUIDELINES</Text>
                </View>
                <Text style={s.sectionTitle}>World Health Organization (WHO) Standards</Text>

                <TouchableOpacity style={s.resourceImageWrap} activeOpacity={0.88} onPress={() => setFullscreenImage(require('../assets/who.jpg'))}>
                  <Image source={require('../assets/who.jpg')} style={s.resourceImage} resizeMode="contain" />
                  <View style={s.resourceImageOverlay}>
                    <Ionicons name="expand-outline" size={18} color={C.white} />
                    <Text style={s.resourceImageHint}>Tap to view fullscreen</Text>
                  </View>
                </TouchableOpacity>

                <Text style={s.bodyText}>
                  NoiseWatch's standardized decibel threshold system directly aligns with the WHO Guidelines for Community Noise, ensuring your noise reports match global health definitions:
                </Text>

                <View style={[s.descCard, { borderLeftColor: C.green, marginTop: 12 }]}>
                  <View style={[s.descCardIconWrap, { backgroundColor: '#E8F5E9' }]}>
                    <Ionicons name="moon-outline" size={20} color={C.green} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.descCardTitle}>Indoors & Sleep: 30 dB Limit</Text>
                    <Text style={s.descCardSubText}>For peaceful, uninterrupted sleep, indoor noise levels must not exceed 30 dB. Any noise above this disrupts sleep cycles, leading to cognitive fatigue.</Text>
                  </View>
                </View>

                <View style={[s.descCard, { borderLeftColor: C.red }]}>
                  <View style={[s.descCardIconWrap, { backgroundColor: '#FFEBEE' }]}>
                    <Ionicons name="heart-outline" size={20} color={C.red} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.descCardTitle}>Chronic Stress: 55–65 dB Limit</Text>
                    <Text style={s.descCardSubText}>Exposure to daytime ambient levels above 55 dB triggers the body's fight-or-flight response, releasing cortisol, elevating heart rates, and raising long-term cardiovascular risks.</Text>
                  </View>
                </View>

                {/* Interactive Decibel Scale Infographic */}
                <Text style={[s.detailLabel, { marginTop: 14, marginBottom: 8 }]}>🔊 Decibel Scale Comparison Chart</Text>
                <View style={s.chartBox}>
                  {[
                    { source: 'Whispering Leaves', db: 20, barColor: C.green },
                    { source: 'Quiet Bedroom (WHO Sleep)', db: 30, barColor: C.green },
                    { source: 'Normal Conversation', db: 60, barColor: C.gold },
                    { source: 'Heavy Traffic (WHO Danger)', db: 80, barColor: C.red },
                    { source: 'Loud Videoke / Muffled Motor', db: 100, barColor: '#9C27B0' },
                  ].map((item, idx) => (
                    <View key={idx} style={s.chartRow}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                        <Text style={s.chartRowLabel}>{item.source}</Text>
                        <Text style={[s.chartRowVal, { color: item.barColor }]}>{item.db} dB</Text>
                      </View>
                      <View style={s.chartBarBg}>
                        <View style={[s.chartBarFill, { width: `${item.db}%`, backgroundColor: item.barColor }]} />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </FadeSlide>

            {/* Section 3: Philippine Laws */}
            <FadeSlide delay={180}>
              <View style={s.section}>
                <View style={s.sectionLabelRow}>
                  <View style={s.sectionDot} />
                  <Text style={s.sectionLabel}>LEGAL FRAMEWORK</Text>
                </View>
                <Text style={s.sectionTitle}>Philippine Noise Laws & Rights</Text>

                <TouchableOpacity style={s.resourceImageWrap} activeOpacity={0.88} onPress={() => setFullscreenImage(require('../assets/nuisance.jpg'))}>
                  <Image source={require('../assets/nuisance.jpg')} style={s.resourceImage} resizeMode="contain" />
                  <View style={s.resourceImageOverlay}>
                    <Ionicons name="expand-outline" size={18} color={C.white} />
                    <Text style={s.resourceImageHint}>Tap to view fullscreen</Text>
                  </View>
                </TouchableOpacity>

                <Text style={s.bodyText}>
                  Your right to peace is backed by Philippine legislation. Knowing these laws helps you file effective reports:
                </Text>

                <View style={s.lawCard}>
                  <Text style={s.lawTitle}>📜 Civil Code (Article 694) - Nuisance</Text>
                  <Text style={s.lawText}>
                    Defines a "nuisance" as any act, omission, or condition which injures or endangers the safety or health of others, or offends the senses. Persistent noise disturbance is classified as a legal nuisance (public or private) and is actionable in court or via barangay arbitration.
                  </Text>
                </View>

                <View style={s.lawCard}>
                  <Text style={s.lawTitle}>📜 P.D. 1152 - PH Environment Code</Text>
                  <Text style={s.lawText}>
                    Section 48 mandates the establishment of ambient noise standards. Ambient noise constraints protect the public from physical injury and physiological impairment due to excessive noise.
                  </Text>
                </View>

                <View style={s.lawCard}>
                  <Text style={s.lawTitle}>📜 NPCC Residential Decibel Limits</Text>
                  <Text style={s.lawText}>
                    Under the National Pollution Control Commission (NPCC), maximum allowable noise levels for residential zones are:
                  </Text>
                  <View style={s.lawSubCol}>
                    <Text style={s.lawSubText}>• Daytime (9 AM – 6 PM): <Text style={{ fontWeight: '800', color: C.saddle }}>55 dB max</Text></Text>
                    <Text style={s.lawSubText}>• Evening (6 PM – 10 PM): <Text style={{ fontWeight: '800', color: C.gold }}>50 dB max</Text></Text>
                    <Text style={s.lawSubText}>• Nighttime (10 PM – 5 AM): <Text style={{ fontWeight: '800', color: C.red }}>45 dB max</Text></Text>
                  </View>
                </View>

                <View style={s.lawCard}>
                  <Text style={s.lawTitle}>📜 Barangay Ordinances & Curfews</Text>
                  <Text style={s.lawText}>
                    Most cities and municipal councils enforce the DILG-backed 10:00 PM videoke/audio curfew. Noise complaints filed during these hours are subject to immediate confiscation of equipment and local penal fines.
                  </Text>
                </View>
              </View>
            </FadeSlide>

            {/* Section 4: Real-World News & Case Studies */}
            <FadeSlide delay={240}>
              <View style={s.section}>
                <View style={s.sectionLabelRow}>
                  <View style={s.sectionDot} />
                  <Text style={s.sectionLabel}>LATEST LOCAL CASES</Text>
                </View>
                <Text style={s.sectionTitle}>Real-World Noise Issues in PH</Text>

                <View style={s.articleCard}>
                  <Text style={s.articleTitle}>DILG Orders Crackdowns on Loud Videoke During Remote Classes</Text>
                  <Text style={s.articleDesc}>
                    Following complaints from teachers and remote workers, the Department of the Interior and Local Government (DILG) ordered local police and barangay councils to curb loud videoke systems and noisy vehicle exhausts during daytime working and class hours.
                  </Text>
                  <TouchableOpacity style={s.readMoreBtn} onPress={() => setSelectedArticle(ARTICLES[0])}>
                    <Text style={s.readMoreBtnText}>Read Article</Text>
                    <Ionicons name="open-outline" size={14} color={C.saddle} />
                  </TouchableOpacity>
                </View>

                <View style={s.articleCard}>
                  <Text style={s.articleTitle}>Metro Manila Traffic Noise Linked to Long-term Stress & Sleep Disorders</Text>
                  <Text style={s.articleDesc}>
                    Urban planning studies conducted in Metro Manila show that ambient noise from major roads regularly exceeds 75 dB. Exposure of residential areas to this traffic roar increases cases of hypertension and chronic sleep disturbances among residents.
                  </Text>
                  <TouchableOpacity style={s.readMoreBtn} onPress={() => setSelectedArticle(ARTICLES[1])}>
                    <Text style={s.readMoreBtnText}>Read Study Summary</Text>
                    <Ionicons name="open-outline" size={14} color={C.saddle} />
                  </TouchableOpacity>
                </View>
              </View>
            </FadeSlide>

            {/* Section 5: CTA */}
            <FadeSlide delay={300}>
              <LinearGradient colors={[C.saddle, C.dark]} style={s.ctaBox}>
                <Ionicons name="shield-outline" size={36} color={C.gold} />
                <Text style={s.ctaTitle}>Empower Your Voice with Data</Text>
                <Text style={s.ctaDesc}>Don't let noise pollution harm your health. Use NoiseWatch to capture verifiable audio records and file structured complaints with your barangay council.</Text>
                <TouchableOpacity style={s.ctaBtn} onPress={() => navigation.navigate('Register')}>
                  <Text style={s.ctaBtnText}>Register Now</Text>
                  <Ionicons name="arrow-forward" size={16} color={C.saddle} />
                </TouchableOpacity>
              </LinearGradient>
            </FadeSlide>
          </View>
        )}
      </ScrollView>

      {/* ── Bottom bar ── */}
      <View style={s.bottomBar}>
        <TouchableOpacity style={s.bottomLoginBtn} onPress={() => navigation.navigate('Login')}>
          <Ionicons name="log-in-outline" size={18} color={C.saddle} />
          <Text style={s.bottomLoginText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.bottomRegisterBtn} onPress={() => navigation.navigate('Register')}>
          <Text style={s.bottomRegisterText}>Create Account</Text>
          <Ionicons name="arrow-forward" size={16} color={C.white} />
        </TouchableOpacity>
      </View>

      {/* ── Article Detail Modal ── */}
      <Modal
        visible={!!selectedArticle}
        animationType="slide"
        onRequestClose={() => setSelectedArticle(null)}
      >
        {selectedArticle && (
          <View style={s.modalRoot}>
            {/* Modal header */}
            <LinearGradient colors={[C.dark, C.saddle]} style={s.modalHeader}>
              <TouchableOpacity style={s.modalCloseBtn} onPress={() => setSelectedArticle(null)}>
                <Ionicons name="close" size={22} color={C.white} />
              </TouchableOpacity>
              <Text style={s.modalCategory}>{selectedArticle.category}</Text>
              <Text style={s.modalHeaderTitle} numberOfLines={3}>{selectedArticle.title}</Text>
              <View style={s.modalMeta}>
                <Ionicons name="calendar-outline" size={13} color={C.gold} />
                <Text style={s.modalMetaText}>{selectedArticle.date}</Text>
                <Ionicons name="library-outline" size={13} color={C.gold} />
                <Text style={s.modalMetaText}>{selectedArticle.source}</Text>
              </View>
            </LinearGradient>

            {/* Scrollable body */}
            <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
              <View style={s.modalImageWrap}>
                <Image
                  source={selectedArticle.image}
                  style={s.modalImage}
                  resizeMode="contain"
                />
              </View>
              <View style={s.modalTextWrap}>
                {selectedArticle.fullText.split('\n\n').map((paragraph, i) => (
                  <Text key={i} style={s.modalParagraph}>{paragraph}</Text>
                ))}
                <View style={s.modalSourceBadge}>
                  <Ionicons name="information-circle-outline" size={14} color={C.saddle} />
                  <Text style={s.modalSourceText}>Source: {selectedArticle.source}</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* ── Fullscreen Image Viewer ── */}
      <Modal
        visible={!!fullscreenImage}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setFullscreenImage(null)}
      >
        <View style={s.fsRoot}>
          <Image
            source={fullscreenImage}
            style={s.fsImage}
            resizeMode="contain"
          />
          <TouchableOpacity style={s.fsCloseBtn} onPress={() => setFullscreenImage(null)}>
            <Ionicons name="close" size={24} color={C.white} />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: C.bg },

  // Top bar
  topBar:         {},
  topBarRow:      { flexDirection: 'row', alignItems: 'center' },
  topLogo:        { width: 40, height: 40, borderRadius: 8 },
  topTitle:       { fontSize: 16, fontWeight: '900', color: C.white, letterSpacing: 1.5 },
  topSub:         { fontSize: 9.5, color: 'rgba(255,255,255,0.75)', marginTop: 2, lineHeight: 13 },
  loginBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.gold, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  loginBtnText:   { fontSize: 13, fontWeight: '700', color: C.saddle },

  // Tab bar
  tabBar:         { flexDirection: 'row', backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: '#E8DDD0', elevation: 3 },
  tabItem:        { flex: 1, alignItems: 'center', paddingVertical: 13, position: 'relative' },
  tabText:        { fontSize: 11, fontWeight: '600', color: C.muted, letterSpacing: 0.5 },
  tabTextActive:  { color: C.saddle, fontWeight: '800' },
  tabIndicator:   { position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 3, backgroundColor: C.saddle, borderRadius: 2 },

  // Hero
  hero:           { paddingHorizontal: 24, paddingTop: 36, paddingBottom: 36, alignItems: 'center' },
  heroLogoWrap:   { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: C.gold },
  heroLogo:       { width: 70, height: 70, borderRadius: 35 },
  heroTitle:      { fontSize: 28, fontWeight: '900', color: C.white, letterSpacing: 4, marginBottom: 8 },
  heroTagline:    { fontSize: 14, color: C.gold, textAlign: 'center', fontWeight: '600', lineHeight: 20, marginBottom: 16 },
  heroDivider:    { width: 50, height: 2, backgroundColor: C.gold, borderRadius: 1, marginBottom: 16 },
  heroDesc:       { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 20 },

  // TUP section (top of About Us — static)
  tupSection:     { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, marginHorizontal: 20, marginTop: 20, borderRadius: 18, padding: 16, elevation: 3, shadowColor: C.dark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, borderWidth: 1, borderColor: '#F5DEB3', gap: 16 },
  tupLogo:        { width: 64, height: 64 },
  tupInfo:        { flex: 1 },
  tupName:        { fontSize: 13, fontWeight: '800', color: C.dark, lineHeight: 18, marginBottom: 3 },
  tupCampus:      { fontSize: 12, color: C.sub, marginBottom: 6 },
  tupBadge:       { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#F5DEB3' },
  tupBadgeText:   { fontSize: 10, color: C.saddle, fontWeight: '700' },
  // TUP footer card (below Charles)
  tupFooterCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, marginHorizontal: 20, marginBottom: 12, borderRadius: 18, padding: 16, elevation: 3, shadowColor: C.dark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, borderWidth: 1, borderColor: '#F5DEB3', gap: 16 },
  tupFooterLogo:  { width: 64, height: 64 },
  // NOISEWATCH logo wave animation
  nwLogoWrap:     { width: 90, height: 90, justifyContent: 'center', alignItems: 'center', marginBottom: 20, position: 'relative' },
  nwRing:         { position: 'absolute', width: 90, height: 90, borderRadius: 45, borderWidth: 2.5, borderColor: C.gold },
  nwTapHint:      { position: 'absolute', bottom: -18, fontSize: 10, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' },

  // Page hero
  pageHero:       { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 28, alignItems: 'center', gap: 8 },
  pageHeroTitle:  { fontSize: 22, fontWeight: '900', color: C.white, letterSpacing: 1 },
  pageHeroSub:    { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 19 },

  // Section
  section:        { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 },
  sectionLabelRow:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  sectionDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: C.gold },
  sectionLabel:   { fontSize: 11, fontWeight: '800', color: C.gold, letterSpacing: 1.5 },
  sectionTitle:   { fontSize: 20, fontWeight: '800', color: C.dark, marginBottom: 12 },
  bodyText:       { fontSize: 13.5, color: C.sub, lineHeight: 21 },

  // Description cards
  descCard:       { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: C.saddle, elevation: 2, shadowColor: C.dark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, gap: 12 },
  descCardIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  descCardText:   { flex: 1, fontSize: 13, color: C.sub, lineHeight: 20 },

  // Stats
  statsRow:       { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginTop: 4, marginBottom: 8 },
  statCard:       { flex: 1, backgroundColor: C.white, borderRadius: 14, padding: 14, alignItems: 'center', elevation: 2, shadowColor: C.dark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  statIconWrap:   { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue:      { fontSize: 12, fontWeight: '800', color: C.dark, textAlign: 'center' },
  statLabel2:     { fontSize: 10, color: C.muted, textAlign: 'center', marginTop: 2 },

  // Members
  memberCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, marginHorizontal: 20, marginBottom: 12, borderRadius: 16, padding: 14, elevation: 2, shadowColor: C.dark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, borderLeftWidth: 4, borderLeftColor: C.gold },
  memberPhoto:    { width: 58, height: 58, borderRadius: 29, borderWidth: 2, borderColor: C.gold, marginRight: 14 },
  memberInfo:     { flex: 1 },
  memberName:     { fontSize: 14, fontWeight: '800', color: C.dark, marginBottom: 3 },
  memberRole:     { fontSize: 11.5, color: C.sub, lineHeight: 16 },
  memberIconWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center' },
  memberBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF3E0', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start', marginTop: 5, borderWidth: 1, borderColor: '#F5DEB3' },
  memberBadgeText:{ fontSize: 10, color: C.saddle, fontWeight: '700' },

  // Features — big image, full display
  featureCard:      { backgroundColor: C.white, marginHorizontal: 20, marginTop: 18, borderRadius: 20, overflow: 'hidden', elevation: 4, shadowColor: C.dark, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 6 },
  featureImageWrap: { width: '100%', paddingVertical: 20, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  featureImage:     { width: width - 64, height: (width - 64) * 0.65, borderRadius: 12 },
  featureAccentBar: { height: 5, width: '100%' },
  featureBody:      { padding: 20 },
  featureTitleRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  featureIconWrap:  { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  featureTitle:     { fontSize: 18, fontWeight: '800', color: C.dark, flex: 1 },
  featureDesc:      { fontSize: 13.5, color: C.sub, lineHeight: 21 },

  // Steps
  stepCard:       { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 0 },
  stepLeft:       { alignItems: 'center', width: 52 },
  stepIconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
  stepConnector:  { width: 2, flex: 1, backgroundColor: '#E8DDD0', marginVertical: 4, minHeight: 24 },
  stepRight:      { flex: 1, paddingLeft: 16, paddingBottom: 24 },
  stepNum:        { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
  stepTitle:      { fontSize: 15, fontWeight: '800', color: C.dark, marginBottom: 6 },
  stepDesc:       { fontSize: 13, color: C.sub, lineHeight: 20 },

  // Tips
  tipsBox:        { backgroundColor: C.white, marginHorizontal: 20, marginTop: 8, marginBottom: 16, borderRadius: 16, padding: 18, borderLeftWidth: 4, borderLeftColor: C.gold, elevation: 2 },
  tipsHeader:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  tipsTitle:      { fontSize: 15, fontWeight: '800', color: C.dark },
  tipRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  tipDot:         { width: 7, height: 7, borderRadius: 4, backgroundColor: C.gold, marginTop: 6 },
  tipText:        { flex: 1, fontSize: 13, color: C.sub, lineHeight: 19 },

  // CTA
  ctaBox:         { marginHorizontal: 20, marginTop: 20, marginBottom: 8, borderRadius: 20, padding: 28, alignItems: 'center', gap: 10 },
  ctaTitle:       { fontSize: 17, fontWeight: '800', color: C.white, textAlign: 'center' },
  ctaDesc:        { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 19 },
  ctaBtn:         { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.gold, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 30, marginTop: 6 },
  ctaBtnText:     { fontSize: 14, fontWeight: '800', color: C.saddle },
  ctaSecondaryBtn:{ marginTop: 4 },
  ctaSecondaryText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textDecorationLine: 'underline' },

  // Bottom bar
  bottomBar:         { flexDirection: 'row', backgroundColor: C.white, paddingHorizontal: 20, paddingVertical: 12, gap: 12, borderTopWidth: 1, borderTopColor: '#E8DDD0', elevation: 4 },
  bottomLoginBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 30, borderWidth: 2, borderColor: C.saddle },
  bottomLoginText:   { fontSize: 14, fontWeight: '700', color: C.saddle },
  bottomRegisterBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 30, backgroundColor: C.saddle },
  bottomRegisterText:{ fontSize: 14, fontWeight: '800', color: C.white },

  // Resources layout styles
  detailLabel:    { fontSize: 12, fontWeight: '800', color: C.saddle, letterSpacing: 0.5 },
  resourceImageWrap: { width: '100%', height: 240, backgroundColor: '#F0EBE3', borderRadius: 14, marginVertical: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  resourceImage:   { width: '100%', height: '100%' },
  resourceImageOverlay: { position: 'absolute', bottom: 8, right: 10, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  resourceImageHint: { fontSize: 11, color: C.white, fontWeight: '600' },
  descCardTitle: { fontSize: 13, fontWeight: '700', color: C.dark, marginBottom: 2 },
  descCardSubText: { fontSize: 12, color: C.sub, lineHeight: 18 },
  
  chartBox: { backgroundColor: C.white, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#F0E8DC', elevation: 2, marginBottom: 12 },
  chartRow: { marginBottom: 12 },
  chartRowLabel: { fontSize: 12, color: C.text, fontWeight: '600' },
  chartRowVal: { fontSize: 11, fontWeight: '800' },
  chartBarBg: { height: 8, backgroundColor: '#FAF8F5', borderRadius: 4, overflow: 'hidden' },
  chartBarFill: { height: '100%', borderRadius: 4 },
  
  lawCard: { backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#F0E8DC', elevation: 1 },
  lawTitle: { fontSize: 13, fontWeight: '800', color: C.dark, marginBottom: 6 },
  lawText: { fontSize: 12, color: C.sub, lineHeight: 18 },
  lawSubRow: { marginTop: 6, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  lawSubCol: { marginTop: 8, flexDirection: 'column', gap: 4 },
  lawSubText: { fontSize: 12, color: C.sub, fontWeight: '600', lineHeight: 20 },
  
  articleCard: { backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: '#F0E8DC' },
  articleTitle: { fontSize: 13, fontWeight: '800', color: C.dark, marginBottom: 6, lineHeight: 18 },
  articleDesc: { fontSize: 12, color: C.sub, lineHeight: 18, marginBottom: 10 },
  readMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 4 },
  readMoreBtnText: { fontSize: 12, fontWeight: '700', color: C.saddle },

  // Article detail modal
  modalRoot:        { flex: 1, backgroundColor: C.bg },
  modalHeader:      { paddingTop: 52, paddingHorizontal: 20, paddingBottom: 24, gap: 6 },
  modalCloseBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  modalCategory:    { fontSize: 10, fontWeight: '800', color: C.gold, letterSpacing: 1.5 },
  modalHeaderTitle: { fontSize: 18, fontWeight: '900', color: C.white, lineHeight: 25 },
  modalMeta:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  modalMetaText:    { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  modalBody:        { flex: 1 },
  modalImageWrap:   { width: '100%', height: 260, backgroundColor: '#F0EBE3', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  modalImage:       { width: '100%', height: '100%' },
  modalTextWrap:    { padding: 20 },
  modalParagraph:   { fontSize: 14, color: C.sub, lineHeight: 22, marginBottom: 16 },
  modalSourceBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.white, borderRadius: 10, padding: 12, marginTop: 8, borderWidth: 1, borderColor: '#F0E8DC' },
  modalSourceText:  { fontSize: 12, color: C.saddle, fontWeight: '700' },

  // Fullscreen image viewer
  fsRoot:           { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  fsImage:          { width: width, height: height },
  fsCloseBtn:       { position: 'absolute', top: 52, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
});
