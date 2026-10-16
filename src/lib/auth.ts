import api from './api';
import type { AuthResponse, User } from '../types';

// `platform: "web"` tells the backend this is the web app, which only faculty may use
export async function loginUser(payload: { email: string; password: string }): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', { ...payload, platform: 'web' });
  return data;
}

export async function forgotPassword(email: string): Promise<{ message?: string }> {
  const { data } = await api.post('/auth/forgot-password', { email });
  return data;
}

export async function resetPassword(payload: { email: string; otp: string; newPassword: string }) {
  const { data } = await api.post('/auth/reset-password', payload);
  return data;
}

export async function updateUserPassword(payload: { currentPassword: string; newPassword: string }): Promise<{ message?: string }> {
  const { data } = await api.post('/auth/update-password', payload);
  return data;
}

export async function getProfile(): Promise<User> {
  const { data } = await api.get('/auth/me');
  return data.user ?? data;
}

export async function deleteAccount() {
  const { data } = await api.delete('/auth/delete-account');
  return data;
}
