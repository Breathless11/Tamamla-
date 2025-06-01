import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [task, setTask] = useState('');
  const [tasks, setTasks] = useState([]);
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    loadTasks();
    registerForPushNotificationsAsync();
  }, []);

  async function registerForPushNotificationsAsync() {
    if (Device.isDevice) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Bildirim izni verilmedi!');
      }
    }
  }

  const saveTasks = async (taskList) => {
    try {
      await AsyncStorage.setItem('tasks', JSON.stringify(taskList));
    } catch (err) {
      console.log('Kayıt hatası:', err);
    }
  };

  const loadTasks = async () => {
    try {
      const data = await AsyncStorage.getItem('tasks');
      if (data) setTasks(JSON.parse(data));
    } catch (err) {
      console.log('Yükleme hatası:', err);
    }
  };

  const scheduleNotification = async (text, when) => {
    const timeInSeconds = (when.getTime() - new Date().getTime()) / 1000;
    if (timeInSeconds > 5) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Görev Hatırlatma',
          body: text,
        },
        trigger: { seconds: timeInSeconds },
      });
    }
  };

  const addTask = () => {
    if (task.trim() === '') return;

    const newTask = {
      id: Date.now().toString(),
      text: task,
      completed: false,
      deadline: date.toLocaleDateString(),
    };

    const updated = [...tasks, newTask];
    setTasks(updated);
    saveTasks(updated);
    scheduleNotification(task, date);
    setTask('');
    setDate(new Date());
  };

  const deleteTask = (id) => {
    const filtered = tasks.filter((t) => t.id !== id);
    setTasks(filtered);
    saveTasks(filtered);
  };

  const toggleTask = (id) => {
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    setTasks(updated);
    saveTasks(updated);
  };

  const handleLogin = () => {
    if (username === 'admin' && password === '1234') {
      setLoggedIn(true);
    } else {
      alert('Hatalı giriş!');
    }
  };

  if (!loggedIn) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🔐 Giriş Yap</Text>

        <TextInput
          style={styles.input}
          placeholder="Kullanıcı Adı"
          placeholderTextColor="#999"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Şifre"
          placeholderTextColor="#999"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Giriş Yap</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📝 Görev Takip</Text>

      <TextInput
        style={styles.input}
        placeholder="Görev gir..."
        placeholderTextColor="#999"
        value={task}
        onChangeText={setTask}
      />

      <TouchableOpacity style={styles.button} onPress={() => setShowPicker(true)}>
        <Text style={styles.buttonText}>📅 Tarih Seç</Text>
      </TouchableOpacity>

      <Text style={styles.dateText}>Seçilen Tarih: {date.toLocaleDateString()}</Text>

      {showPicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowPicker(false);
            if (selectedDate) setDate(selectedDate);
          }}
        />
      )}

      <TouchableOpacity style={[styles.button, { backgroundColor: '#4caf50' }]} onPress={addTask}>
        <Text style={styles.buttonText}>➕ Ekle</Text>
      </TouchableOpacity>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.taskRow}>
            <Text
              style={[
                styles.task,
                item.completed && styles.completedTask,
              ]}
              onPress={() => toggleTask(item.id)}
            >
              {item.text} - {item.deadline}
            </Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteTask(item.id)}
            >
              <Text style={styles.deleteText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#000',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  dateText: {
    marginBottom: 10,
    color: '#000',
    textAlign: 'center',
  },
  taskRow: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  task: {
    fontSize: 16,
    color: '#333',
    maxWidth: '80%',
  },
  completedTask: {
    textDecorationLine: 'line-through',
    color: 'gray',
  },
  deleteButton: {
    paddingHorizontal: 10,
  },
  deleteText: {
    color: 'red',
    fontSize: 20,
  },
});
