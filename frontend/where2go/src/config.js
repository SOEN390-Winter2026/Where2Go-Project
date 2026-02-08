import { Platform } from 'react-native';

// Optional: set API_URL in .env to override (e.g. shared backend or your machine's IP for physical devices)
import { API_URL } from '@env';

/**
 * Backend API base URL.
 * - Set API_URL in .env to override (useful for physical devices or a shared backend for colleagues).
 * - Android emulator: 10.0.2.2 reaches the host machine's localhost.
 * - iOS simulator: localhost works.
 * - Physical devices: use your computer's IP in API_URL (e.g. http://192.168.1.5:3000).
 */
export const API_BASE_URL = 'http://192.168.1.8:3000'

/*
  (typeof API_URL === 'string' && API_URL.trim() && API_URL.trim().replace(/\/$/, '')) ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');
*/