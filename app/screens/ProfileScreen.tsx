import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  Home: undefined;
  Register: undefined;
  Attendance: { userId: string };
  History: { userId: string };
  Profile: { userId: string };
};

type Props = {
  route: { params: { userId: string } };
};

const API_URL = 'http://localhost:5000';

const ProfileScreen = ({ route }: Props) => {
  const { userId } = route.params;
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('Profile');
  const [modalVisible, setModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      if (response.ok) {
        setUser(data.user);
        setEditName(data.user.name);
        setEditEmail(data.user.email);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('authToken');
    Alert.alert('Logged out', 'You have been logged out.');
    navigation.navigate('Home');
  };

  const handleUpdateProfile = async () => {
    const token = await AsyncStorage.getItem('authToken');
    const response = await fetch(`${API_URL}/api/auth/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, name: editName, email: editEmail }),
    });

    if (response.ok) {
      const data = await response.json();
      setUser(data.user);
      Alert.alert('Success', 'Profile updated successfully');
      setModalVisible(false);
    } else {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleChangePassword = async () => {
    const token = await AsyncStorage.getItem('authToken');
    const response = await fetch(`${API_URL}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, currentPassword, newPassword }),
    });

    if (response.ok) {
      Alert.alert('Success', 'Password changed successfully');
      setPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
    } else {
      Alert.alert('Error', 'Failed to change password');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: '#F5F5F5' }]}>
      <Text style={[styles.title, { color: '#333' }]}>User Profile</Text>

      {user ? (
        <View style={[styles.profileCard, { backgroundColor: '#fff' }]}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle-outline" size={80} color={'#1E88E5'} />
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.name, { color: '#333' }]}>Name: {user.name}</Text>
            <Text style={[styles.detail, { color: '#555' }]}>ID: {user.id}</Text>
            <Text style={[styles.detail, { color: '#555' }]}>Email: {user.email}</Text>
          </View>
        </View>
      ) : (
        <Text style={{ color: '#333' }}>Loading...</Text>
      )}

      <View style={styles.buttonGroup}>
        <TouchableOpacity style={styles.button} onPress={() => setModalVisible(true)}>
          <Text style={styles.buttonText}>Update Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => setPasswordModalVisible(true)}
        >
          <Text style={styles.buttonText}>Change Password</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#EF4444', borderColor: 'white', borderWidth: 2 }]}
          onPress={handleLogout}
        >
          <Text style={[styles.buttonText, { color: '#FFF' }]}>Log out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomNav}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={activeTab === 'Attendance' ? 'home' : 'home-outline'}
            size={28}
            color={activeTab === 'Attendance' ? '#2563EB' : '#333'}
            onPress={() => {
              setActiveTab('Attendance');
              navigation.navigate('Attendance', { userId });
            }}
          />
          <Text style={[styles.iconLabel, activeTab === 'Attendance' && { color: '#2563EB', fontWeight: 'bold' }]}>
            Home
          </Text>
        </View>

        <View style={styles.iconContainer}>
          <Ionicons
            name={activeTab === 'History' ? 'time' : 'time-outline'}
            size={28}
            color={activeTab === 'History' ? '#2563EB' : '#333'}
            onPress={() => {
              setActiveTab('History');
              navigation.navigate('History', { userId });
            }}
          />
          <Text style={[styles.iconLabel, activeTab === 'History' && { color: '#2563EB', fontWeight: 'bold' }]}>
            History
          </Text>
        </View>

        <View style={styles.iconContainer}>
          <Ionicons
            name={activeTab === 'Profile' ? 'person-circle' : 'person-circle-outline'}
            size={28}
            color={activeTab === 'Profile' ? '#2563EB' : '#333'}
            onPress={() => {
              setActiveTab('Profile');
              navigation.navigate('Profile', { userId });
            }}
          />
          <Text style={[styles.iconLabel, activeTab === 'Profile' && { color: '#2563EB', fontWeight: 'bold' }]}>
            Profile
          </Text>
        </View>
      </View>

      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TextInput
              placeholder="Name"
              value={editName}
              onChangeText={setEditName}
              style={styles.input}
            />
            <TextInput
              placeholder="Email"
              value={editEmail}
              onChangeText={setEditEmail}
              style={styles.input}
              keyboardType="email-address"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#2563EB' }]} onPress={handleUpdateProfile}>
                <Text style={{ color: '#FFF' }}>Update</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#9CA3AF' }]} onPress={() => setModalVisible(false)}>
                <Text style={{ color: '#FFF' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent={true} visible={passwordModalVisible}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TextInput
              placeholder="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              style={styles.input}
              secureTextEntry={true}
            />
            <TextInput
              placeholder="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              style={styles.input}
              secureTextEntry={true}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#2563EB' }]}
                onPress={handleChangePassword}
              >
                <Text style={{ color: '#FFF' }}>Update</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#9CA3AF' }]}
                onPress={() => setPasswordModalVisible(false)}
              >
                <Text style={{ color: '#FFF' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 80,
    paddingBottom: 120,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2563EB',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
  },
  avatarContainer: {
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 6,
  },
  detail: {
    fontSize: 16,
    marginBottom: 4,
  },
  buttonGroup: {
    marginTop: 24,
    gap: 12,
  },
  button: {
    borderWidth: 2,
    borderColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'center',
    minWidth: 180,
  },
  buttonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLabel: {
    fontSize: 12,
    color: '#333',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
});

export default ProfileScreen;