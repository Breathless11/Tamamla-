import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  Alert,
  useColorScheme,
  LayoutAnimation,
  UIManager,
  ActivityIndicator, // Yükleme göstergesi için
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

// Android'de LayoutAnimation'ı etkinleştir
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// --- Renk Paleti Tanımları ---
const LightColors = {
  primary: '#007bff',
  primaryDark: '#0056b3',
  success: '#28a745',
  successDark: '#1e7e34',
  danger: '#dc3545',
  dangerDark: '#bd2130',
  background: '#f0f2f5',
  cardBackground: '#ffffff',
  textPrimary: '#333333',
  textSecondary: '#666666',
  border: '#e0e0e0',
  lightGray: '#f8f9fa',
  mediumGray: '#adb5bd',
  darkGray: '#495057',
  gradientStartLight: '#e0f7fa',
  gradientEndLight: '#c5e4e7',
};

const DarkColors = {
  primary: '#8ab4f8',
  primaryDark: '#6a9ee8',
  success: '#6aa84f',
  successDark: '#568c40',
  danger: '#e06c75',
  dangerDark: '#c75a64',
  background: '#1a1a1a',
  cardBackground: '#2a2a2a',
  textPrimary: '#e0e0e0',
  textSecondary: '#b0b0b0',
  border: '#3a3a3a',
  lightGray: '#333333',
  mediumGray: '#777777',
  darkGray: '#aaaaaa',
  gradientStartDark: '#121212',
  gradientEndDark: '#242424',
};

// AsyncStorage anahtarları
const USERS_STORAGE_KEY = '@users';
const TASKS_STORAGE_KEY = '@tasks';
const CURRENT_USER_STORAGE_KEY = '@currentUser'; // Artık kullanıcı adını saklayacak

export default function App() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? DarkColors : LightColors;

  // --- State Tanımları ---
  const [currentUsername, setCurrentUsername] = useState(null); // Giriş yapmış kullanıcının kullanıcı adı
  const [username, setUsername] = useState(''); // E-posta yerine kullanıcı adı
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // Kayıt için
  const [isRegistering, setIsRegistering] = useState(false); // Kayıt ekranında mı?
  const [loading, setLoading] = useState(true); // Yükleme durumu

  const [task, setTask] = useState('');
  const [tasks, setTasks] = useState([]); // Görevler yerel depolamadan gelecek
  const [selectedDateTime, setSelectedDateTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [currentEditTaskId, setCurrentEditTaskId] = useState(null);

  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [filter, setFilter] = useState('all');

  // --- Yerel Depolama Fonksiyonları ---

  // Tüm kullanıcıları getir
  const getAllUsers = async () => {
    try {
      const usersJson = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      return usersJson ? JSON.parse(usersJson) : [];
    } catch (e) {
      console.error("Kullanıcılar getirilirken hata:", e);
      return [];
    }
  };

  // Kullanıcıları kaydet
  const saveAllUsers = async (users) => {
    try {
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
      console.error("Kullanıcılar kaydedilirken hata:", e);
    }
  };

  // Mevcut kullanıcının görevlerini getir
  const getTasksForUser = useCallback(async (userIdentifier) => { // userEmail yerine userIdentifier
    if (!userIdentifier) return [];
    try {
      const allTasksJson = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
      const allTasks = allTasksJson ? JSON.parse(allTasksJson) : {};
      return allTasks[userIdentifier] || [];
    } catch (e) {
      console.error("Görevler getirilirken hata:", e);
      return [];
    }
  }, []);

  // Mevcut kullanıcının görevlerini kaydet
  const saveTasksForUser = useCallback(async (userIdentifier, userTasks) => { // userEmail yerine userIdentifier
    if (!userIdentifier) return;
    try {
      const allTasksJson = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
      const allTasks = allTasksJson ? JSON.parse(allTasksJson) : {};
      allTasks[userIdentifier] = userTasks;
      await AsyncStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(allTasks));
    } catch (e) {
      console.error("Görevler kaydedilirken hata:", e);
    }
  }, []);

  // Mevcut kullanıcıyı kaydet
  const saveCurrentUser = async (username) => { // email yerine username
    try {
      await AsyncStorage.setItem(CURRENT_USER_STORAGE_KEY, username || '');
    } catch (e) {
      console.error("Mevcut kullanıcı kaydedilirken hata:", e);
    }
  };

  // Mevcut kullanıcıyı yükle
  const loadCurrentUser = async () => {
    try {
      const storedUsername = await AsyncStorage.getItem(CURRENT_USER_STORAGE_KEY); // storedEmail yerine storedUsername
      setCurrentUsername(storedUsername); // setCurrentUserEmail yerine setCurrentUsername
      return storedUsername;
    } catch (e) {
      console.error("Mevcut kullanıcı yüklenirken hata:", e);
      return null;
    }
  };

  // --- useEffect Hook'u: Uygulama Başlangıcı ve Kullanıcı Yükleme ---
  useEffect(() => {
    const initApp = async () => {
      setLoading(true);
      const storedUsername = await loadCurrentUser(); // storedEmail yerine storedUsername
      if (storedUsername) {
        setTasks(await getTasksForUser(storedUsername)); // storedEmail yerine storedUsername
      }
      setLoading(false);
      registerForPushNotificationsAsync(); // Bildirim izinlerini iste
    };
    initApp();

    // Uygulama ön plandayken bildirimleri işlemek için dinleyici
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log("Bildirim alındı (uygulama ön planda):", notification);
      Alert.alert(
        notification.request.content.title,
        notification.request.content.body,
        [{ text: "Tamam" }]
      );
    });

    // Bildirime tıklandığında ne olacağını dinlemek için
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log("Bildirime tıklandı:", response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, [getTasksForUser]); // getTasksForUser fonksiyonu değiştiğinde tekrar çalıştır

  // --- useEffect Hook'u: Tarih/Saati Güncelleme ---
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Stillerin Temaya Göre Dinamik Olarak Oluşturulması
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 50,
      paddingBottom: 20,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      marginBottom: 10,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    currentDateTimeText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 25,
      fontWeight: '600',
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 15,
      fontSize: 17,
      backgroundColor: colors.cardBackground,
      color: colors.textPrimary,
      marginBottom: 15,
      shadowColor: colorScheme === 'dark' ? '#000' : '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    button: {
      backgroundColor: colors.primary,
      padding: 15,
      borderRadius: 12,
      marginBottom: 15,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      shadowColor: colorScheme === 'dark' ? '#000' : '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: colorScheme === 'dark' ? 0.4 : 0.2,
      shadowRadius: 5,
      elevation: 4,
    },
    buttonText: {
      color: colors.cardBackground,
      fontWeight: 'bold',
      fontSize: 17,
      marginLeft: 8,
    },
    dateText: {
      marginBottom: 20,
      color: colors.textPrimary,
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: 16,
    },
    taskRow: {
      backgroundColor: colors.cardBackground,
      padding: 18,
      borderRadius: 15,
      marginBottom: 12,
      elevation: 5,
      shadowColor: colorScheme === 'dark' ? '#000' : '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.15,
      shadowRadius: 6,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderLeftWidth: 5,
      borderLeftColor: colors.primary,
    },
    completedTaskRow: {
        borderLeftColor: colors.success,
    },
    taskTextContainer: {
      flex: 1,
      marginRight: 10,
    },
    task: {
      fontSize: 17,
      color: colors.textPrimary,
    },
    completedTask: {
      textDecorationLine: 'line-through',
      color: colors.mediumGray,
      fontStyle: 'italic',
    },
    taskDeadline: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 5,
    },
    taskActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    deleteButton: {
      paddingHorizontal: 8,
      paddingVertical: 5,
    },
    editButton: {
      paddingHorizontal: 8,
      paddingVertical: 5,
    },
    emptyTasksContainer: {
      marginTop: 60,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      backgroundColor: colors.cardBackground,
      borderRadius: 15,
      elevation: 3,
      shadowColor: colorScheme === 'dark' ? '#000' : '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.15,
      shadowRadius: 5,
    },
    emptyTasksText: {
      fontSize: 22,
      color: colors.mediumGray,
      marginTop: 15,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    emptyTasksSubText: {
      fontSize: 15,
      color: colors.mediumGray,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 22,
    },
    filterContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 25,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: colors.cardBackground,
      elevation: 2,
      shadowColor: colorScheme === 'dark' ? '#000' : '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: colorScheme === 'dark' ? 0.25 : 0.1,
      shadowRadius: 4,
    },
    filterButton: {
      flex: 1,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRightWidth: 1,
      borderColor: colors.border,
    },
    filterButtonLast: {
      borderRightWidth: 0,
    },
    activeFilterButton: {
      backgroundColor: colors.primary,
    },
    filterButtonText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    activeFilterButtonText: {
      color: colors.cardBackground,
    },
    // Yeni Stil: Hesap Silme Butonu
    deleteAccountButton: {
      backgroundColor: colors.danger,
      marginTop: 20,
    },
    // Yeni Stil: Giriş/Kayıt geçiş butonu
    toggleAuthModeButton: {
      marginTop: 15,
      alignSelf: 'center',
    },
    toggleAuthModeButtonText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: 'bold',
    },
  });

  // --- Bildirim İzinlerini İsteme Fonksiyonu ---
  async function registerForPushNotificationsAsync() {
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        Alert.alert('Bildirim İzni', 'Uygulamanın bildirim gönderebilmesi için izin vermelisiniz.');
        console.log('Bildirim izni verilmedi!');
        return;
      }
      console.log('Bildirim izni verildi.');
    } else {
      Alert.alert('Simülatör Uyarısı', 'Uygulama bir fiziksel cihazda çalıştırılmadığı için bildirimler çalışmayabilir.');
      console.log('Simülatörde çalışıyor, bildirimler çalışmayabilir.');
    }
  }

  // --- Kullanıcı Girişi Fonksiyonu ---
  const handleLogin = async () => {
    setLoading(true);
    const users = await getAllUsers();
    const user = users.find(u => u.username === username && u.passwordHash === btoa(password)); // E-posta yerine kullanıcı adı kontrolü

    if (user) {
      setCurrentUsername(user.username); // currentUserEmail yerine currentUsername
      await saveCurrentUser(user.username); // user.email yerine user.username
      setTasks(await getTasksForUser(user.username)); // user.email yerine user.username
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Başarılı', 'Giriş yapıldı!');
      setUsername(''); // Giriş sonrası alanları temizle
      setPassword('');
    } else {
      Alert.alert('Hata', 'Yanlış kullanıcı adı veya şifre.'); // E-posta yerine kullanıcı adı
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setLoading(false);
  };

  // --- Kullanıcı Kayıt Fonksiyonu ---
  const handleRegister = async () => {
    if (password !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (password.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalı.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    const users = await getAllUsers();
    if (users.some(u => u.username === username)) { // E-posta yerine kullanıcı adı kontrolü
      Alert.alert('Hata', 'Bu kullanıcı adı zaten kullanılıyor.'); // E-posta yerine kullanıcı adı
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      const newUser = { username, passwordHash: btoa(password) }; // E-posta yerine kullanıcı adı
      users.push(newUser);
      await saveAllUsers(users);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Başarılı', 'Hesap başarıyla oluşturuldu! Şimdi giriş yapabilirsiniz.');
      setIsRegistering(false); // Kayıt sonrası giriş ekranına dön
      setUsername(''); // Alanları temizle
      setPassword('');
      setConfirmPassword('');
    }
    setLoading(false);
  };

  // --- Kullanıcı Çıkışı Fonksiyonu ---
  const handleLogout = async () => {
    setLoading(true);
    setCurrentUsername(null); // currentUserEmail yerine currentUsername
    setTasks([]);
    await saveCurrentUser(null); // Mevcut kullanıcıyı temizle
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Başarılı', 'Çıkış yapıldı.');
    setLoading(false);
  };

  // --- Hesabı Silme Fonksiyonu ---
  const handleDeleteAccount = async () => {
    if (!currentUsername) { // currentUserEmail yerine currentUsername
      Alert.alert('Hata', 'Giriş yapmış bir kullanıcı yok.');
      return;
    }

    Alert.alert(
      'Hesabı Sil',
      'Hesabınızı ve tüm görevlerinizi kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Sil',
          onPress: async () => {
            setLoading(true);
            try {
              // Kullanıcıyı users listesinden sil
              let users = await getAllUsers();
              users = users.filter(u => u.username !== currentUsername); // currentUserEmail yerine currentUsername
              await saveAllUsers(users);

              // Kullanıcının görevlerini sil
              const allTasksJson = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
              const allTasks = allTasksJson ? JSON.parse(allTasksJson) : {};
              delete allTasks[currentUsername]; // currentUserEmail yerine currentUsername
              await AsyncStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(allTasks));

              // Mevcut kullanıcıyı temizle ve çıkış yap
              await saveCurrentUser(null);
              setCurrentUsername(null); // currentUserEmail yerine currentUsername
              setTasks([]);
              
              Alert.alert('Başarılı', 'Hesabınız ve tüm verileriniz başarıyla silindi.');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error("Hesap silme hatası:", error);
              Alert.alert('Hata', 'Hesap silinirken bir sorun oluştu.');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            } finally {
              setLoading(false);
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  // --- DateTimePicker OnChange Fonksiyonları ---
  const onDateChange = (event, newSelectedDate) => {
    setShowDatePicker(false); // Tarih seçiciyi kapat
    if (newSelectedDate !== undefined) { // Kullanıcı bir tarih seçtiyse (iptal etmediyse)
      // Mevcut saati koruyarak yeni tarihi ayarla
      const updatedDateTime = new Date(newSelectedDate);
      updatedDateTime.setHours(selectedDateTime.getHours());
      updatedDateTime.setMinutes(selectedDateTime.getMinutes());
      updatedDateTime.setSeconds(selectedDateTime.getSeconds());
      setSelectedDateTime(updatedDateTime);
    }
  };

  const onTimeChange = (event, newSelectedTime) => {
    setShowTimePicker(false); // Saat seçiciyi kapat
    if (newSelectedTime !== undefined) { // Kullanıcı bir saat seçtiyse (iptal etmediyse)
      // Mevcut tarihi koruyarak yeni saati ayarla
      const updatedDateTime = new Date(selectedDateTime);
      updatedDateTime.setHours(newSelectedTime.getHours());
      updatedDateTime.setMinutes(newSelectedTime.getMinutes());
      updatedDateTime.setSeconds(newSelectedTime.getSeconds());
      setSelectedDateTime(updatedDateTime);
    }
  };

  // --- Görevleri Yerel Depolamaya Kaydetme ---
  const saveTaskToLocal = async (taskData) => {
    if (!currentUsername) { // currentUserEmail yerine currentUsername
      Alert.alert('Hata', 'Giriş yapmış bir kullanıcı yok.');
      return;
    }
    let currentTasks = await getTasksForUser(currentUsername); // currentUserEmail yerine currentUsername
    if (taskData.id) { // Mevcut görevi güncelle
      currentTasks = currentTasks.map(t => t.id === taskData.id ? taskData : t);
    } else { // Yeni görev ekle
      taskData.id = Date.now().toString(); // Basit bir ID oluştur
      currentTasks.push(taskData);
    }
    await saveTasksForUser(currentUsername, currentTasks); // currentUserEmail yerine currentUsername
    setTasks(currentTasks); // State'i güncelle
  };

  // --- Görev Düzenlemeye Başlama Fonksiyonu ---
  const startEditingTask = (id) => {
    const taskToEdit = tasks.find(t => t.id === id);
    if (taskToEdit) {
      setTask(taskToEdit.text);
      setSelectedDateTime(new Date(taskToEdit.deadline));
      setIsEditing(true);
      setCurrentEditTaskId(id);
      console.log(`Görevi düzenlemeye başlandı: ID ${id}`);
    }
  };

  // --- Görevi Güncelleme Fonksiyonu ---
  const updateTask = async () => {
    if (task.trim() === '') {
      Alert.alert('Uyarı', 'Görev boş bırakılamaz.');
      return;
    }
    if (!currentUsername) { // currentUserEmail yerine currentUsername
      Alert.alert('Hata', 'Giriş yapmış bir kullanıcı yok.');
      return;
    }

    const now = new Date();
    if (selectedDateTime.getTime() <= now.getTime()) {
      Alert.alert('Uyarı', 'Bildirim zamanı şu anki zamandan ileri bir tarih veya saat olmalıdır.');
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const taskToUpdate = tasks.find(t => t.id === currentEditTaskId);
    if (taskToUpdate && taskToUpdate.notificationId) {
        Notifications.cancelScheduledNotificationAsync(taskToUpdate.notificationId);
        console.log("Eski bildirim iptal edildi:", taskToUpdate.notificationId);
    }

    // Yeni bildirimi planla ve ID'sini al
    const newNotificationId = await scheduleNotification(task, selectedDateTime);

    const updatedTaskData = {
      id: currentEditTaskId,
      text: task,
      deadline: selectedDateTime.toLocaleString(),
      notificationId: newNotificationId,
      completed: taskToUpdate.completed, // Tamamlanma durumunu koru
    };

    await saveTaskToLocal(updatedTaskData);

    setTask('');
    setSelectedDateTime(new Date());
    setIsEditing(false);
    setCurrentEditTaskId(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Başarılı', 'Görev güncellendi.');
  };

  // --- Yeni Görev Ekleme Fonksiyonu ---
  const addTask = async () => {
    if (task.trim() === '') {
      Alert.alert('Uyarı', 'Görev boş bırakılamaz.');
      return;
    }
    if (!currentUsername) { // currentUserEmail yerine currentUsername
      Alert.alert('Hata', 'Giriş yapmış bir kullanıcı yok.');
      return;
    }

    const now = new Date();
    if (selectedDateTime.getTime() <= now.getTime()) {
      Alert.alert('Uyarı', 'Bildirim zamanı şu anki zamandan ileri bir tarih veya saat olmalıdır.');
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    console.log(`Yeni görev ekleniyor: "${task}", Zaman: ${selectedDateTime.toLocaleString()}`);
    const notificationId = await scheduleNotification(task, selectedDateTime);

    const newTaskData = {
      text: task,
      completed: false,
      deadline: selectedDateTime.toLocaleString(),
      notificationId: notificationId,
    };

    await saveTaskToLocal(newTaskData);

    setTask('');
    setSelectedDateTime(new Date());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // --- Görev Silme Fonksiyonu (Yerel Depolama) ---
  const deleteTask = async (id) => {
    if (!currentUsername) { // currentUserEmail yerine currentUsername
      Alert.alert('Hata', 'Giriş yapmış bir kullanıcı yok.');
      return;
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const taskToDelete = tasks.find(t => t.id === id);
    if (taskToDelete && taskToDelete.notificationId) {
      Notifications.cancelScheduledNotificationAsync(taskToDelete.notificationId);
      console.log("Silinen görevin bildirimi iptal edildi:", taskToDelete.notificationId);
    }

    const updatedTasks = tasks.filter(t => t.id !== id);
    await saveTasksForUser(currentUsername, updatedTasks); // currentUserEmail yerine currentUsername
    setTasks(updatedTasks);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  // --- Görev Tamamlama/Geri Alma Fonksiyonu (Yerel Depolama) ---
  const toggleTask = async (id) => {
    if (!currentUsername) { // currentUserEmail yerine currentUsername
      Alert.alert('Hata', 'Giriş yapmış bir kullanıcı yok.');
      return;
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const updatedTasks = tasks.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    await saveTasksForUser(currentUsername, updatedTasks); // currentUserEmail yerine currentUsername
    setTasks(updatedTasks);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // --- Bildirim Planlama Fonksiyonu ---
  const scheduleNotification = async (text, when) => {
    const now = new Date();
    const timeInSeconds = (when.getTime() - now.getTime()) / 1000;

    console.log(`Bildirim planlama denemesi: Görev "${text}", Zaman: ${when.toLocaleString()}`);
    console.log(`Şimdiki zaman: ${now.toLocaleString()}, Fark (saniye): ${timeInSeconds}`);

    if (timeInSeconds <= 0) {
      console.log('Bildirim planlanamadı: Zaman geçmişte veya şu anda.');
      return null;
    }
    
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Görev Hatırlatma',
          body: text,
          sound: 'default',
        },
        trigger: { 
          seconds: timeInSeconds,
          repeats: false,
        },
      });
      console.log("Bildirim planlandı:", text, "için", when.toLocaleString(), "ID:", notificationId);
      return notificationId;
    } catch (error) {
      console.log("Bildirim planlama hatası (catch bloğu):", error);
      Alert.alert('Bildirim Hatası', 'Bildirim planlanamadı. Lütfen tekrar deneyin.');
      return null;
    }
  };

  // --- Filtrelenmiş Görevleri Döndüren Fonksiyon ---
  const getFilteredTasks = () => {
    switch (filter) {
      case 'pending':
        return tasks.filter(task => !task.completed);
      case 'completed':
        return tasks.filter(task => task.completed);
      case 'all':
      default:
        return tasks;
    }
  };

  // --- Yükleme Ekranı ---
  if (loading) {
    return (
      <LinearGradient
        colors={colorScheme === 'dark' ? [DarkColors.gradientStartDark, DarkColors.gradientEndDark] : [LightColors.gradientStartLight, LightColors.gradientEndLight]}
        style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 10, color: colors.textPrimary }}>Yükleniyor...</Text>
      </LinearGradient>
    );
  }

  // --- Giriş/Kayıt Ekranı Render ---
  if (!currentUsername) { // currentUserEmail yerine currentUsername
    return (
      <LinearGradient
        colors={colorScheme === 'dark' ? [DarkColors.gradientStartDark, DarkColors.gradientEndDark] : [LightColors.gradientStartLight, LightColors.gradientEndLight]}
        style={styles.container}
      >
        <Text style={styles.title}>
          {isRegistering ? '📝 Kayıt Ol' : '🔐 Giriş Yap'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Kullanıcı Adı" // E-posta yerine Kullanıcı Adı
          placeholderTextColor={colors.textSecondary}
          keyboardType="default" // email-address yerine default
          autoCapitalize="none"
          value={username} // email yerine username
          onChangeText={setUsername} // setEmail yerine setUsername
        />
        <TextInput
          style={styles.input}
          placeholder="Şifre"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {isRegistering && (
          <TextInput
            style={styles.input}
            placeholder="Şifreyi Onayla"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={isRegistering ? handleRegister : handleLogin}
        >
          <Ionicons
            name={isRegistering ? "person-add-outline" : "log-in-outline"}
            size={20}
            color={colors.cardBackground}
          />
          <Text style={styles.buttonText}>
            {isRegistering ? 'Kayıt Ol' : 'Giriş Yap'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toggleAuthModeButton}
          onPress={() => setIsRegistering(!isRegistering)}
        >
          <Text style={styles.toggleAuthModeButtonText}>
            {isRegistering ? 'Zaten hesabın var mı? Giriş Yap' : 'Hesabın yok mu? Kayıt Ol'}
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  // --- Ana Görev Takip Ekranı Render ---
  return (
    <LinearGradient
      colors={colorScheme === 'dark' ? [DarkColors.gradientStartDark, DarkColors.gradientEndDark] : [LightColors.gradientStartLight, LightColors.gradientEndLight]}
      style={styles.container}
    >
      <Text style={styles.title}>📝 Görev Takip</Text>

      {/* Kullanıcı E-postasını göster */}
      {currentUsername && ( // currentUserEmail yerine currentUsername
        <Text style={[styles.currentDateTimeText, { fontSize: 12, marginBottom: 5 }]}>
          Kullanıcı: {currentUsername} {/* currentUserEmail yerine currentUsername */}
        </Text>
      )}

      {/* Sürekli Güncel Tarih/Saat */}
      <Text style={styles.currentDateTimeText}>
        {currentDateTime.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        {'\n'}
        {currentDateTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </Text>

      {/* Görev Giriş/Düzenleme Alanı */}
      <TextInput
        style={styles.input}
        placeholder={isEditing ? "Görevi düzenle..." : "Görev gir..."}
        placeholderTextColor={colors.textSecondary}
        value={task}
        onChangeText={setTask}
      />

      {/* Tarih Seçme Butonu */}
      <TouchableOpacity style={styles.button} onPress={() => setShowDatePicker(true)}>
        <Ionicons name="calendar-outline" size={20} color={colors.cardBackground} />
        <Text style={styles.buttonText}> Tarih Seç</Text>
      </TouchableOpacity>

      {/* Saat Seçme Butonu */}
      <TouchableOpacity style={styles.button} onPress={() => setShowTimePicker(true)}>
        <Ionicons name="time-outline" size={20} color={colors.cardBackground} />
        <Text style={styles.buttonText}> Saat Seç</Text>
      </TouchableOpacity>

      {/* Seçilen Tarih ve Saati Göster */}
      <Text style={styles.dateText}>
        Seçilen Zaman: {selectedDateTime.toLocaleString()}
      </Text>

      {/* Tarih Seçici Bileşeni */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDateTime}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          {...(Platform.OS === 'ios' && { themeVariant: colorScheme })}
        />
      )}

      {/* Saat Seçici Bileşeni */}
      {showTimePicker && (
        <DateTimePicker
          value={selectedDateTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onTimeChange}
          {...(Platform.OS === 'ios' && { themeVariant: colorScheme })}
        />
      )}

      {/* Ekle/Kaydet Butonu */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: isEditing ? colors.primary : colors.success }]}
        onPress={isEditing ? updateTask : addTask}
      >
        <Ionicons
          name={isEditing ? "save-outline" : "add-circle-outline"}
          size={20}
          color={colors.cardBackground}
        />
        <Text style={styles.buttonText}> {isEditing ? "Kaydet" : "Ekle"}</Text>
      </TouchableOpacity>

      {/* Düzenleme modundan çıkış butonu */}
      {isEditing && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.danger }]}
          onPress={() => {
            setIsEditing(false);
            setCurrentEditTaskId(null);
            setTask('');
            setSelectedDateTime(new Date());
          }}
        >
          <Ionicons name="close-circle-outline" size={20} color={colors.cardBackground} />
          <Text style={styles.buttonText}> İptal</Text>
        </TouchableOpacity>
      )}

      {/* --- Filtreleme Butonları --- */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.activeFilterButton]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterButtonText, filter === 'all' && styles.activeFilterButtonText]}>Tümü</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'pending' && styles.activeFilterButton]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterButtonText, filter === 'pending' && styles.activeFilterButtonText]}>Bekleyen</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, styles.filterButtonLast, filter === 'completed' && styles.activeFilterButton]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterButtonText, filter === 'completed' && styles.activeFilterButtonText]}>Tamamlandı</Text>
        </TouchableOpacity>
      </View>
      {/* --- Filtreleme Butonları Sonu --- */}

      {/* Görev Listesi */}
      <FlatList
        data={getFilteredTasks()}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.taskRow, item.completed && styles.completedTaskRow]}>
            <View style={styles.taskTextContainer}>
              <Text
                style={[
                  styles.task,
                  item.completed && styles.completedTask,
                ]}
                onPress={() => toggleTask(item.id)}
              >
                {item.text}
              </Text>
              <Text style={styles.taskDeadline}>
                Son Tarih: {item.deadline}
              </Text>
            </View>
            <View style={styles.taskActions}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => startEditingTask(item.id)}
              >
                <Ionicons name="create-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteTask(item.id)}
              >
                <Ionicons name="trash-outline" size={24} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyTasksContainer}>
            <Ionicons name="checkbox-outline" size={60} color={colors.mediumGray} />
            <Text style={styles.emptyTasksText}>
              {filter === 'pending' ? 'Hiç bekleyen göreviniz yok!' :
               filter === 'completed' ? 'Henüz tamamlanmış göreviniz yok!' :
               'Henüz göreviniz yok!'}
            </Text>
            <Text style={styles.emptyTasksSubText}>İlk görevinizi eklemek için yukarıdaki alanı kullanın.</Text>
          </View>
        )}
      />

      {/* Çıkış ve Hesap Silme Butonları */}
      <TouchableOpacity style={[styles.button, { backgroundColor: colors.primaryDark, marginTop: 20 }]} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={colors.cardBackground} />
        <Text style={styles.buttonText}> Çıkış Yap</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.deleteAccountButton]} onPress={handleDeleteAccount}>
        <Ionicons name="trash-bin-outline" size={20} color={colors.cardBackground} />
        <Text style={styles.buttonText}> Hesabı Sil</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}
