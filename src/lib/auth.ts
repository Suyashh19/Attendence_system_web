import api from './api';
import type { AuthResponse, User } from '../types';

// `platform: "web"` tells the backend this is the web app, which only faculty may use
export async function loginUser(payload: { email: string; password: string }): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', { ...payload, platform: 'web' });
  return data;
}

export async function sendSignupOtp(email: string) {
  const { data } = await api.post('/auth/send-signup-otp', { email });
  return data;
}

// The web app only creates faculty accounts; the backend refuses anything else here
export async function registerFaculty(payload: { name: string; email: string; password: string; otp: string }) {
  const { data } = await api.post('/auth/register', { ...payload, role: 'faculty', platform: 'web' });
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

// Change password while signed in: a code goes to the account's own email, so no email is typed
export async function requestPasswordChange() {
  const { data } = await api.post('/auth/update-password/request');
  return data;
}

export async function confirmPasswordChange(payload: { otp: string; newPassword: string }): Promise<{ message?: string }> {
  const { data } = await api.post('/auth/update-password/confirm', payload);
  return data;
}

export async function getProfile(): Promise<User> {
  const { data } = await api.get('/auth/me');
  return data.user ?? data;
}

// The password is required, so a borrowed unlocked phone cannot delete an account
export async function deleteAccount(password: string) {
  const { data } = await api.delete('/auth/delete-account', { data: { password } });
  return data;
}
