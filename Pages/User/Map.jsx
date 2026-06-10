import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  View,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Animated,
  StatusBar,
  Dimensions,
  Platform,
  Easing,
  Text,
  Alert,
  Linking,
} from "react-native";
import { WebView } from 'react-native-webview';
import * as Location from "expo-location";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import CustomDrawer from '../CustomDrawer';
import API_BASE_URL from '../../utils/api';

const { width, height } = Dimensions.get('window');

const getStatusBarHeight = () => {
  return Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;
};

const MapScreen = ({ navigation }) => {
  const [region, setRegion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [reports, setReports] = useState([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const webviewRef = useRef(null);

  // Animation refs for drawer
  const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Fetch map data from backend
  useEffect(() => {
    const fetchMapData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/reports/map-data`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        console.log('Fetched reports:', data);
        setReports(data);
      } catch (err) {
        console.error("Error fetching map data:", err);
        Alert.alert("Error", "Could not load noise reports. Please check your connection.");
      }
    };
    fetchMapData();

    // Refresh data every 30 seconds
    const interval = setInterval(fetchMapData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setPermissionDenied(true);
          // Use default location (Manila, Philippines)
          setRegion({
            latitude: 14.5995,
            longitude: 120.9842,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
          setIsLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        setRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      } catch (error) {
        console.error("Error getting location:", error);
        // Use default location on error
        setRegion({
          latitude: 14.5995,
          longitude: 120.9842,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Post data to WebView when ready
  useEffect(() => {
    if (isMapLoaded && region && webviewRef.current) {
      webviewRef.current.postMessage(JSON.stringify({
        type: 'INIT_MAP',
        lat: region.latitude,
        lon: region.longitude,
        zoom: 12,
        userLat: permissionDenied ? null : region.latitude,
        userLon: permissionDenied ? null : region.longitude
      }));

      if (reports && reports.length > 0) {
        webviewRef.current.postMessage(JSON.stringify({
          type: 'UPDATE_DATA',
          reports: reports
        }));
      }
    }
  }, [isMapLoaded, region, reports]);

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'LOADED') {
        setIsMapLoaded(true);
      }
    } catch (e) {
      console.error("Error parsing message from webview:", e);
    }
  };

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
        toValue: 0.5,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
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
      }),
    ]).start(() => setDrawerVisible(false));
  };

  const handleRecenterMap = async () => {
    if (permissionDenied) {
      Alert.alert("Location Access", "Please enable location permissions to use this feature");
      return;
    }

    try {
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newRegion = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

      setRegion(newRegion);

      if (webviewRef.current) {
        webviewRef.current.postMessage(JSON.stringify({
          type: 'RECENTER',
          lat: current.coords.latitude,
          lon: current.coords.longitude,
          zoom: 14
        }));
      }
    } catch (error) {
      console.log('Could not get current location');
      Alert.alert("Location Error", "Unable to get current location");
    }
  };

  const handleNoiseReport = () => {
    try {
      if (navigation && navigation.navigate) {
        navigation.navigate('Report', {
          currentLocation: region ? { latitude: region.latitude, longitude: region.longitude } : null
        });
      }
    } catch { }
  };

  const handleSettingsPress = () => {
    try {
      if (navigation && navigation.navigate) navigation.navigate('Settings');
    } catch { }
  };

  // Helper helpers are now implemented inside the Leaflet WebView HTML template

  if (isLoading || !region) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#8B4513" translucent={false} />
        <LinearGradient colors={["#8B4513", "#654321", "#D4AC0D"]} style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <View style={styles.loadingSpinner}>
              <ActivityIndicator size="large" color="#D4AC0D" />
            </View>
            <Text style={styles.loadingText}>Getting your location...</Text>
            <Text style={styles.loadingSubtext}>Preparing noise map data</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8B4513" translucent={false} />

      {/* Header */}
      <LinearGradient colors={['#8B4513', '#654321']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={openDrawer} style={styles.menuButton}>
            <Ionicons name="menu" size={28} color="#D4AC0D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Noise Map</Text>
        </View>
      </LinearGradient>

      {/* Map Container */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webviewRef}
          source={{ html: HTML_TEMPLATE }}
          style={styles.map}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={['*']}
          onShouldStartLoadWithRequest={(request) => {
            if (request.url.startsWith('https://www.google.com/maps')) {
              Linking.openURL(request.url).catch(err => {
                Alert.alert("Error", "Could not open Google Maps app.");
              });
              return false;
            }
            return true;
          }}
        />

        {/* Legend */}
        <View style={styles.legendContainer}>
          <Text style={styles.legendTitle}>Noise Levels</Text>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#FFC107' }]} />
            <Text style={styles.legendText}>Low (1)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#FF9800' }]} />
            <Text style={styles.legendText}>Medium (2)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#D32F2F' }]} />
            <Text style={styles.legendText}>High (3-4)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#B71C1C' }]} />
            <Text style={styles.legendText}>Critical (5+)</Text>
          </View>
        </View>
      </View>

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fab, { opacity: permissionDenied ? 0.5 : 1 }]}
          onPress={handleRecenterMap}
          disabled={permissionDenied}
        >
          <Ionicons name="locate" size={24} color="#8B4513" />
        </TouchableOpacity>
      </View>

      {/* Drawer Modal */}
      <Modal
        visible={drawerVisible}
        transparent
        animationType="none"
        onRequestClose={closeDrawer}
        statusBarTranslucent
      >
        <View style={styles.modalContainer}>
          <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={closeDrawer}
            />
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
    backgroundColor: '#000',
  },
  header: {
    paddingTop: getStatusBarHeight(),
    paddingBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#D4AC0D',
    flex: 1,
    textAlign: 'center',
  },
  settingsButton: {
    padding: 8,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
  },
  markerCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  markerText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  markerTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  calloutContainer: {
    padding: 10,
    minWidth: 200,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  calloutText: {
    fontSize: 14,
    marginBottom: 3,
  },
  calloutDescription: {
    fontSize: 12,
    color: '#666',
  },
  // Address styles
  calloutAddressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 8 },
  calloutAddressIcon: { fontSize: 16, marginTop: 1 },
  calloutStreet: { fontSize: 14, fontWeight: '800', color: '#3E2C23', lineHeight: 18 },
  calloutArea: { fontSize: 11, color: '#8B7355', marginTop: 2 },
  calloutAddressLoading: { fontSize: 12, color: '#A89070', fontStyle: 'italic' },
  calloutDivider: { height: 1, backgroundColor: '#E8DDD0', marginBottom: 8 },
  legendContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  legendColor: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  legendText: {
    fontSize: 12,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingSpinner: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#D4AC0D',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.8,
  },
  fabContainer: {
    position: 'absolute',
    left: 16,
    bottom: 24,
    alignItems: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D4AC0D',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  modalContainer: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  drawerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: width * 0.8,
  },
});

const HTML_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { padding: 0; margin: 0; }
    html, body, #map { height: 100%; width: 100vw; }
    .leaflet-popup-content-wrapper {
      border-radius: 12px;
      padding: 0;
    }
    .leaflet-popup-content {
      margin: 12px;
    }
    .marker-container {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .marker-circle {
      width: 32px;
      height: 32px;
      border-radius: 16px;
      display: flex;
      justify-content: center;
      align-items: center;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    .marker-text {
      color: white;
      font-size: 14px;
      font-weight: bold;
      font-family: sans-serif;
    }
    .marker-triangle {
      width: 0;
      height: 0;
      background-color: transparent;
      border-style: solid;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 10px solid;
      margin-top: -1px;
    }
    .callout-container {
      padding: 5px;
      min-width: 180px;
      font-family: sans-serif;
    }
    .callout-title {
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 5px;
      color: #333;
    }
    .callout-text {
      font-size: 12px;
      margin-bottom: 3px;
      color: #555;
    }
    .callout-description {
      font-size: 11px;
      color: #666;
    }
    .callout-address-row {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      margin-bottom: 8px;
    }
    .callout-address-icon {
      font-size: 14px;
    }
    .callout-street {
      font-size: 12px;
      font-weight: 800;
      color: #3E2C23;
      line-height: 15px;
    }
    .callout-area {
      font-size: 10px;
      color: #8B7355;
      margin-top: 2px;
    }
    .callout-divider {
      height: 1px;
      background-color: #E8DDD0;
      margin-bottom: 8px;
    }
    .gmaps-btn {
      display: block;
      margin-top: 10px;
      text-align: center;
      background-color: #315342;
      color: white;
      text-decoration: none;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: bold;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .gmaps-btn:active {
      background-color: #213A2E;
    }
    #layer-toggle-btn {
      position: absolute;
      bottom: 24px;
      right: 16px;
      z-index: 1000;
      background-color: #D4AC0D;
      border: none;
      border-radius: 20px;
      padding: 10px 16px;
      color: #8B4513;
      font-size: 13px;
      font-weight: bold;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
      font-family: sans-serif;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    #layer-toggle-btn:active {
      background-color: #B3920B;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <button id="layer-toggle-btn" onclick="toggleMapLayer()">🛰️ Satellite</button>
  <script>
    let map = null;
    let markersLayer = null;
    let userLocationMarker = null;
    const geocodeCache = {};

    let currentLayer = 'street';
    const streetTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    });
    const satelliteTiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri'
    });

    function initMap(lat, lon, zoom) {
      if (map) return;
      map = L.map('map', {
        zoomControl: false,
        attributionControl: false
      }).setView([lat, lon], zoom);

      streetTiles.addTo(map);
      markersLayer = L.layerGroup().addTo(map);
    }

    function toggleMapLayer() {
      if (!map) return;
      if (currentLayer === 'street') {
        map.removeLayer(streetTiles);
        satelliteTiles.addTo(map);
        currentLayer = 'satellite';
        document.getElementById('layer-toggle-btn').innerHTML = '🗺️ Street View';
      } else {
        map.removeLayer(satelliteTiles);
        streetTiles.addTo(map);
        currentLayer = 'street';
        document.getElementById('layer-toggle-btn').innerHTML = '🛰️ Satellite';
      }
    }

    function updateUserLocationMarker(lat, lon) {
      if (!map) return;
      if (userLocationMarker) {
        userLocationMarker.setLatLng([lat, lon]);
      } else {
        const blueDotIcon = L.divIcon({
          className: '',
          html: '<div style="width: 14px; height: 14px; border-radius: 7px; background-color: #2196F3; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>',
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });
        userLocationMarker = L.marker([lat, lon], { icon: blueDotIcon }).addTo(map);
      }
    }

    function getMarkerStyle(count) {
      if (count >= 5) {
        return { color: '#B71C1C', label: 'Critical', radius: 150, opacity: 0.4 };
      } else if (count >= 3) {
        return { color: '#D32F2F', label: 'High', radius: 120, opacity: 0.35 };
      } else if (count === 2) {
        return { color: '#FF9800', label: 'Medium', radius: 90, opacity: 0.3 };
      } else {
        return { color: '#FFC107', label: 'Low', radius: 60, opacity: 0.25 };
      }
    }

    async function reverseGeocode(lat, lon) {
      const key = lat.toFixed(5) + ',' + lon.toFixed(5);
      if (geocodeCache[key]) return geocodeCache[key];
      try {
        const res = await fetch(
          'https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lon + '&format=json&addressdetails=1',
          { headers: { 'Accept-Language': 'en', 'User-Agent': 'NOISEWATCH-Mobile/1.0' } }
        );
        const data = await res.json();
        const a = data.address || {};
        const street = [a.road || a.pedestrian || a.footway || a.path || 'Unknown street', a.house_number || '']
          .filter(Boolean).join(' ');
        const area = [a.suburb || a.neighbourhood || a.village || a.town || '', a.city || a.municipality || '']
          .filter(Boolean).join(', ');
        const result = { street, area };
        geocodeCache[key] = result;
        return result;
      } catch (e) {
        return { street: 'Address unavailable', area: '' };
      }
    }

    function updateMarkers(reports) {
      if (!map || !markersLayer) return;
      markersLayer.clearLayers();

      reports.forEach(item => {
        if (!item.coordinates || item.coordinates.length !== 2) return;
        const [lon, lat] = item.coordinates;
        const count = item.count || 1;
        const style = getMarkerStyle(count);

        // Heatmap circle
        L.circle([lat, lon], {
          radius: style.radius,
          color: style.color,
          fillColor: style.color,
          fillOpacity: style.opacity,
          weight: 2
        }).addTo(markersLayer);

        // DivIcon pin
        const pinIcon = L.divIcon({
          className: '',
          html: '<div class="marker-container">' +
                  '<div class="marker-circle" style="background:' + style.color + '">' +
                    '<span class="marker-text">' + count + '</span>' +
                  '</div>' +
                  '<div class="marker-triangle" style="border-top-color:' + style.color + '"></div>' +
                '</div>',
          iconSize: [32, 42],
          iconAnchor: [16, 42],
          popupAnchor: [0, -44]
        });

        const buildPopupHtml = (street, area) => 
          '<div class="callout-container">' +
            '<div class="callout-address-row">' +
              '<span class="callout-address-icon">📍</span>' +
              '<div style="flex: 1;">' +
                '<div class="callout-street">' + street + '</div>' +
                (area ? '<div class="callout-area">' + area + '</div>' : '') +
              '</div>' +
            '</div>' +
            '<div class="callout-divider"></div>' +
            '<div class="callout-title">' + style.label + ' Noise Level</div>' +
            '<div class="callout-text">' + count + ' Report' + (count > 1 ? 's' : '') + '</div>' +
            '<div class="callout-description">This location has received ' + count + ' noise complaint' + (count > 1 ? 's' : '') + '</div>' +
            '<a href="https://www.google.com/maps?q=' + lat + ',' + lon + '" target="_blank" class="gmaps-btn">🗺️ Open in Google Maps</a>' +
          '</div>';

        const marker = L.marker([lat, lon], { icon: pinIcon })
          .bindPopup(buildPopupHtml('<span style="font-style:italic;color:#999;">Tap to load address...</span>', ''), { maxWidth: 220 })
          .addTo(markersLayer);

        marker.on('popupopen', async () => {
          const { street, area } = await reverseGeocode(lat, lon);
          marker.setPopupContent(buildPopupHtml(street, area));
        });
      });
    }

    function handleMessage(data) {
      if (data.type === 'INIT_MAP') {
        initMap(data.lat, data.lon, data.zoom);
        if (data.userLat && data.userLon) {
          updateUserLocationMarker(data.userLat, data.userLon);
        }
      } else if (data.type === 'UPDATE_DATA') {
        updateMarkers(data.reports);
      } else if (data.type === 'RECENTER') {
        if (map) {
          map.setView([data.lat, data.lon], data.zoom || 14, { animate: true });
          updateUserLocationMarker(data.lat, data.lon);
        }
      }
    }

    document.addEventListener('message', function(event) {
      handleMessage(JSON.parse(event.data));
    });
    window.addEventListener('message', function(event) {
      handleMessage(JSON.parse(event.data));
    });

    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOADED' }));
  </script>
</body>
</html>
`;

export default MapScreen;