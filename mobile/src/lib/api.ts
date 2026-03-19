import axios from 'axios';
import { useAuthStore } from './store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) useAuthStore.getState().logout();
    return Promise.reject(err);
  }
);

export default api;

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then(r => r.data),
  register: (username: string, email: string, password: string) =>
    api.post('/auth/register', { username, email, password }).then(r => r.data),
};

export const usersApi = {
  me: () => api.get('/users/me').then(r => r.data),
  stats: () => api.get('/users/me/stats').then(r => r.data),
};

export const territoryApi = {
  viewport: (minLat: number, minLng: number, maxLat: number, maxLng: number) =>
    api.get('/territory/viewport', { params: { minLat, minLng, maxLat, maxLng } }).then(r => r.data),
};

export const activityApi = {
  start: () => api.post('/activity/start').then(r => r.data),
  submitPoints: (activityId: string, points: Array<{ lat: number; lng: number; timestamp: string }>) =>
    api.post(`/activity/${activityId}/points`, { points }).then(r => r.data),
  end: (activityId: string) => api.post(`/activity/${activityId}/end`).then(r => r.data),
  recent: () => api.get('/activity/recent').then(r => r.data),
};

export const leaderboardApi = {
  city: () => api.get('/leaderboard/city').then(r => r.data),
  friends: () => api.get('/leaderboard/friends').then(r => r.data),
  weekly: () => api.get('/leaderboard/weekly').then(r => r.data),
};

export const socialApi = {
  feed: () => api.get('/social/feed').then(r => r.data),
  friends: () => api.get('/social/friends').then(r => r.data),
  sendRequest: (username: string) => api.post('/social/friends/request', { username }).then(r => r.data),
  acceptRequest: (id: string) => api.post(`/social/friends/${id}/accept`).then(r => r.data),
  search: (q: string) => api.get('/social/search', { params: { q } }).then(r => r.data),
};
