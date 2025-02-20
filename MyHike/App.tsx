import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { NavigationContainer, RouteProp } from "@react-navigation/native";
import {
  createStackNavigator,
  StackNavigationProp,
} from "@react-navigation/stack";
import MapView, { PROVIDER_GOOGLE, Marker } from "react-native-maps";
import * as Location from "expo-location";
import { MapPin, User, Lock, Plus, List, Check } from "lucide-react-native";
import axios from "axios";

// Type definitions
interface User {
  id: string;
  username: string;
  role: string;
}

interface Event {
  id: string;
  name: string;
  icon: string;
  checkpoints: number;
}

type RootStackParamList = {
  Login: undefined;
  Home: { user: User };
  CreateEvent: undefined;
};

type LoginScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, "Login">;
};

type HomeScreenProps = {
  route: RouteProp<RootStackParamList, "Home">;
  navigation: StackNavigationProp<RootStackParamList, "Home">;
};

type CreateEventScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, "CreateEvent">;
};

const API_URL = "http://localhost:3001";
const Stack = createStackNavigator<RootStackParamList>();

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const handleLogin = async (): Promise<void> => {
    try {
      const response = await axios.post<User>(`${API_URL}/login`, {
        username,
        password,
      });
      navigation.navigate("Home", { user: response.data });
    } catch (error) {
      Alert.alert("Login Failed", "Invalid credentials");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hike Tracker</Text>
      <View style={styles.inputContainer}>
        <User color="#666" size={20} />
        <TextInput
          style={styles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
        />
      </View>
      <View style={styles.inputContainer}>
        <Lock color="#666" size={20} />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const HomeScreen: React.FC<HomeScreenProps> = ({ route, navigation }) => {
  const { user } = route.params;
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const fetchEvents = async (): Promise<void> => {
      const response = await axios.get<Event[]>(`${API_URL}/events`);
      setEvents(response.data);
    };
    fetchEvents();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {user.role}</Text>
      <ScrollView>
        {events.map((event) => (
          <TouchableOpacity key={event.id} style={styles.eventCard}>
            <Text style={styles.eventName}>{event.name}</Text>
            <Text style={styles.eventDetails}>
              {event.checkpoints} checkpoints
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("CreateEvent")}
      >
        <Plus color="#fff" size={24} />
      </TouchableOpacity>
    </View>
  );
};

const CreateEventScreen: React.FC<CreateEventScreenProps> = ({
  navigation,
}) => {
  const [name, setName] = useState<string>("");
  const [icon, setIcon] = useState<string>("");
  const [checkpoints, setCheckpoints] = useState<string>("");

  const handleCreateEvent = async (): Promise<void> => {
    try {
      await axios.post<Event>(`${API_URL}/events`, {
        name,
        icon,
        checkpoints: parseInt(checkpoints, 10),
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "Failed to create event");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Event</Text>
      <TextInput
        style={styles.input}
        placeholder="Event Name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Icon"
        value={icon}
        onChangeText={setIcon}
      />
      <TextInput
        style={styles.input}
        placeholder="Number of Checkpoints"
        value={checkpoints}
        onChangeText={setCheckpoints}
        keyboardType="numeric"
      />
      <TouchableOpacity style={styles.button} onPress={handleCreateEvent}>
        <Text style={styles.buttonText}>Create</Text>
      </TouchableOpacity>
    </View>
  );
};

const App: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
  },
  button: {
    backgroundColor: "#147EFB",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  eventCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  eventName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  eventDetails: {
    fontSize: 14,
    color: "#666",
  },
  fab: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "#147EFB",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default App;
