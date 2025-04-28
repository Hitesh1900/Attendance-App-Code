import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Button,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Image,
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import Webcam from 'react-webcam';
import * as ImagePicker from 'expo-image-picker';
import { CameraType } from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';



type RootStackParamList = {
  Home: undefined;
  Register: undefined;
  Attendance: { userId: string };
  History: { userId: string };
  Profile: { userId: string };
};

type AttendanceScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const API_URL = 'https://attendance-app-code-production.up.railway.app';

const AttendanceScreen = () => {
  const navigation = useNavigation<AttendanceScreenNavigationProp>();

  const webcamRef = useRef<Webcam | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [attendanceMessage, setAttendanceMessage] = useState<string | null>(null);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [photoTaken, setPhotoTaken] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'Home' | 'History' | 'Profile'>('Home');

  useEffect(() => {
    const init = async () => {
      const [userId, username, token] = await Promise.all([
        AsyncStorage.getItem('userId'),
        AsyncStorage.getItem('username'),
        AsyncStorage.getItem('authToken'),
      ]);
      if (userId) setUserId(userId);
      if (username) setUsername(username);
      if (token) setAuthToken(token);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setAttendanceMessage('Location permission denied. Please enable it in settings.');
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });

      setLoading(false);
    };

    init();
  }, []);

  const capturePhotoWeb = () => {
    const screenshot = webcamRef.current?.getScreenshot();
    if (screenshot) {
      setPhotoTaken(screenshot);
      setCameraOpen(false);
    }
  };

  const capturePhotoMobile = async () => {
    console.log('Opening camera...');
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      cameraType: ImagePicker.CameraType.front,
    };

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    console.log('Camera permission status:', permission.status);
    if (permission.status !== 'granted') {
      console.log('Camera permission denied');
      return;
    }

    
    try {
        setPhotoTaken(null); 

        const result = await ImagePicker.launchCameraAsync(options);
  console.log('Camera result:', result);

  if (result?.canceled) {
    console.log('User cancelled image picker');
    setCameraOpen(false);
  } else if (result.assets && result.assets.length > 0) {
    const uri = result.assets[0].uri;

  
    const base64Image = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    
    setPhotoTaken(`data:image/jpeg;base64,${base64Image}`);
    setCameraOpen(false);
    console.log('Photo taken:', base64Image);
  }
   } catch (error) {
       console.error('Error opening camera:', error);
   }
  };

  const markAttendance = async () => {
    if (!photoTaken) {
      setAttendanceMessage('Please capture your photo for face verification.');
      return;
    }

    setMarkingAttendance(true);
    setAttendanceMessage(null);
    setCameraOpen(false);

    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      const storedToken = await AsyncStorage.getItem('authToken');

      if (!storedUserId || !storedToken) {
        setAttendanceMessage('Authentication error. Please log in again.');
        setMarkingAttendance(false);
        return;
      }

      const faceResponse = await fetch(`${API_URL}/api/face/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${storedToken}`,
        },
        body: JSON.stringify({ image: photoTaken }),
      });

      const faceData = await faceResponse.json();
      if (!faceResponse.ok || faceData.status !== 'success') {
        setAttendanceMessage(faceData.message || 'Face verification failed.');
        setMarkingAttendance(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });

      const attendanceResponse = await fetch(`${API_URL}/api/attendance/mark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${storedToken}`,
        },
        body: JSON.stringify({
          userId: storedUserId,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        }),
      });

      const attendanceData = await attendanceResponse.json();
      if (attendanceResponse.ok) {
        setAttendanceMessage(attendanceData.message || 'Attendance marked successfully!');
        setAttendanceMarked(true);
      } else {
        setAttendanceMessage(attendanceData.message || 'Failed to mark attendance.');
      }
    } catch (err) {
      console.error(err);
      setAttendanceMessage('Something went wrong. Try again.');
    } finally {
      setMarkingAttendance(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GRAB YOUR ATTENDANCE</Text>
      <Text style={styles.subtitle}>Your location will be used to mark attendance.</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" />
      ) : (
        <View style={styles.card}>
          <Text style={styles.label}>User ID:</Text>
          <Text style={styles.value}>{userId}</Text>

          <Text style={styles.label}>User Name:</Text>
          <Text style={styles.value}>{username}</Text>

          <Text style={styles.label}>Location:</Text>
          {location ? (
            <Text style={styles.value}>
              Latitude: {location.latitude}, Longitude: {location.longitude}
            </Text>
          ) : (
            <Text style={[styles.value, { color: '#EF4444' }]}>Location not available</Text>
          )}

          {cameraOpen && (
            <View style={{ alignItems: 'center', marginBottom: 10 }}>
              {Platform.OS === 'web' ? (
                <>
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    height={240}
                    width={320}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ facingMode: 'user' }}
                  />
                  <Button
                    title="Capture Photo"
                    onPress={capturePhotoWeb}
                    color="#0EA5E9"
                  />
                </>
              ) : (
                <Button
                  title="Open Camera"
                  onPress={capturePhotoMobile}
                  color="#0EA5E9"
                />
              )}
            </View>
          )}

          {photoTaken && (
            <Image
              source={{ uri: photoTaken }}
              style={{
                width: 120,
                height: 120,
                alignSelf: 'center',
                borderRadius: 8,
                marginBottom: 10,
              }}
            />
          )}

          <Button
            title="Mark Attendance"
            onPress={() => {
              setCameraOpen(true);
              setPhotoTaken(null);
            }}
            color="#2563EB"
            disabled={attendanceMarked || markingAttendance || photoTaken !== null}
          />

          {photoTaken && (
            <Button
              title="Submit Attendance"
              onPress={markAttendance}
              color="#22C55E"
              disabled={markingAttendance || attendanceMarked}
            />
          )}

          {markingAttendance && (
            <ActivityIndicator size="small" color="#2563EB" style={{ marginTop: 10 }} />
          )}
          {attendanceMessage && (
            <Text
              style={{
                marginTop: 15,
                fontSize: 14,
                textAlign: 'center',
                fontWeight: 'bold',
                color: attendanceMarked ? '#16A34A' : '#DC2626',
              }}
            >
              {attendanceMessage}
            </Text>
          )}
        </View>
      )}

      <View style={styles.bottomNav}>
        {(['Home', 'History', 'Profile'] as const).map((tab) => (
          <View style={styles.iconContainer} key={tab}>
            <Ionicons
              name={
                tab === 'Home'
                  ? activeTab === tab
                    ? 'home'
                    : 'home-outline'
                  : tab === 'History'
                  ? activeTab === tab
                    ? 'time'
                    : 'time-outline'
                  : activeTab === tab
                  ? 'person-circle'
                  : 'person-circle-outline'
              }
              size={28}
              color={activeTab === tab ? '#2563EB' : '#333'}
              onPress={() => {
                setActiveTab(tab);
                if (tab === 'Home') {
                  navigation.navigate('Home');
                } else if (tab === 'History') {
                  navigation.navigate('History', { userId: userId || '' });
                } else if (tab === 'Profile') {
                  navigation.navigate('Profile', { userId: userId || '' });
                }
              }}
            />
            <Text
              style={[
                styles.iconLabel,
                activeTab === tab && { color: '#2563EB', fontWeight: 'bold' },
              ]}
            >
              {tab}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default AttendanceScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 20,
    paddingBottom: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 40,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderColor: '#2563EB',
    borderWidth: 2,
    borderRadius: 10,
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  value: {
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 10,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderTopColor: '#E5E7EB',
    borderTopWidth: 1,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  iconContainer: {
    alignItems: 'center',
  },
  iconLabel: {
    fontSize: 12,
    color: '#333',
  },
});