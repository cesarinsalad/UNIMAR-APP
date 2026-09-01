import Constants from 'expo-constants';

const fromExtra = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl;

export const API_BASE_URL: string = fromExtra ?? 'http://localhost:3000/api/v1';

export const TOKEN_STORAGE_KEY = 'unimar.auth_token';

export const SESSION_HYDRATION_WINDOW_MS = 5 * 60 * 1000;