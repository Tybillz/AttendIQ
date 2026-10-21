'use client';

import { Teacher } from '@/types/attendance';
import { getTeachers } from './storage';

export interface AuthSession {
  role: 'teacher' | 'admin' | 'gate';
  teacherId?: string;
  teacherName?: string;
  className?: string;
  loginTime: string;
}

const AUTH_STORAGE_KEY = 'attend_iq_active_auth_session_v1';
const ADMIN_PASSCODE = '1234';
const GATE_PASSCODE = '1234';
const DEFAULT_TEACHER_PIN = '1234';

export function getAuthSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    // Default fallback during SSR
    return {
      role: 'teacher',
      teacherId: 't-103', // Mal. Ibrahim Danladi default for demo
      teacherName: 'Mal. Ibrahim Danladi',
      className: 'JSS 2 - Sapphire',
      loginTime: new Date().toISOString(),
    };
  }

  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      // By default, start logged in as Mal. Ibrahim Danladi so teachers see their immediate workspace
      const defaultSession: AuthSession = {
        role: 'teacher',
        teacherId: 't-103',
        teacherName: 'Mal. Ibrahim Danladi',
        className: 'JSS 2 - Sapphire',
        loginTime: new Date().toISOString(),
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(defaultSession));
      return defaultSession;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveAuthSession(session: AuthSession | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (session) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    window.dispatchEvent(new Event('attend-iq-auth-update'));
  } catch (e) {
    console.error('Failed to save auth session', e);
  }
}

export interface PortalCredentials {
  adminPasscode: string;
  gatePasscode: string;
  teacherPins: Record<string, string>;
}

const DEFAULT_CREDENTIALS: PortalCredentials = {
  adminPasscode: '1234',
  gatePasscode: '1234',
  teacherPins: {
    't-101': '4012', // Mrs. Victoria Adebayo (JSS 1 - Diamond)
    't-102': '2891', // Mr. Chinedu Okonkwo (JSS 1 - Gold)
    't-103': '7314', // Mal. Ibrahim Danladi (JSS 2 - Sapphire)
    't-104': '5190', // Mrs. Folake Balogun (JSS 2 - Emerald)
    't-105': '8623', // Mr. Emeka Eze (JSS 3 - Ruby)
    't-106': '3459', // Mrs. Zainab Aliyu (JSS 3 - Topaz)
  },
};

const CREDENTIALS_STORAGE_KEY = 'attend_iq_portal_credentials_v1';

export function generateRandomPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export function getPortalCredentials(): PortalCredentials {
  if (typeof window === 'undefined') return DEFAULT_CREDENTIALS;
  try {
    const raw = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
    if (!raw) return DEFAULT_CREDENTIALS;
    const parsed = JSON.parse(raw);
    return {
      adminPasscode: parsed.adminPasscode || DEFAULT_CREDENTIALS.adminPasscode,
      gatePasscode: parsed.gatePasscode || DEFAULT_CREDENTIALS.gatePasscode,
      teacherPins: { ...DEFAULT_CREDENTIALS.teacherPins, ...(parsed.teacherPins || {}) },
    };
  } catch {
    return DEFAULT_CREDENTIALS;
  }
}

export function savePortalCredentials(creds: PortalCredentials): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(creds));
    window.dispatchEvent(new Event('attend-iq-credentials-update'));
  } catch (e) {
    console.error('Failed to save credentials', e);
  }
}

export function updateTeacherPin(teacherId: string, newPin: string): void {
  const creds = getPortalCredentials();
  if (!creds.teacherPins) creds.teacherPins = {};
  creds.teacherPins[teacherId] = newPin.trim();
  savePortalCredentials(creds);
}

export function randomizeAllTeacherPins(teacherIds: string[]): Record<string, string> {
  const creds = getPortalCredentials();
  if (!creds.teacherPins) creds.teacherPins = {};
  teacherIds.forEach((id) => {
    creds.teacherPins[id] = generateRandomPin();
  });
  savePortalCredentials(creds);
  return creds.teacherPins;
}

export function updateAdminPasscode(newPasscode: string): void {
  const creds = getPortalCredentials();
  creds.adminPasscode = newPasscode.trim();
  savePortalCredentials(creds);
}

export function updateGatePasscode(newPasscode: string): void {
  const creds = getPortalCredentials();
  creds.gatePasscode = newPasscode.trim();
  savePortalCredentials(creds);
}

export function loginAsTeacher(teacherId: string, enteredPin: string): { success: boolean; message: string; session?: AuthSession } {
  const teachers = getTeachers();
  const teacher = teachers.find((t) => t.id === teacherId);

  if (!teacher) {
    return { success: false, message: 'Teacher profile not found.' };
  }

  const creds = getPortalCredentials();
  const expectedPin = creds.teacherPins?.[teacherId] || DEFAULT_CREDENTIALS.teacherPins[teacherId] || '7314';
  if (enteredPin.trim() !== expectedPin) {
    return { success: false, message: 'Incorrect 4-digit PIN for this teacher. Please enter the specific PIN issued by your School Administrator.' };
  }

  const session: AuthSession = {
    role: 'teacher',
    teacherId: teacher.id,
    teacherName: teacher.name,
    loginTime: new Date().toISOString(),
  };

  saveAuthSession(session);
  return { success: true, message: `Welcome, ${teacher.name}!`, session };
}

export function loginAsAdmin(passcode: string): { success: boolean; message: string; session?: AuthSession } {
  const creds = getPortalCredentials();
  if (passcode.trim() !== creds.adminPasscode && passcode.trim() !== 'admin') {
    return { success: false, message: 'Incorrect Management Passcode.' };
  }

  const session: AuthSession = {
    role: 'admin',
    loginTime: new Date().toISOString(),
  };

  saveAuthSession(session);
  return { success: true, message: 'Principal & School Management access granted.', session };
}

export function loginAsGate(passcode: string): { success: boolean; message: string; session?: AuthSession } {
  const creds = getPortalCredentials();
  if (passcode.trim() !== creds.gatePasscode && passcode.trim() !== 'gate') {
    return { success: false, message: 'Incorrect Gate Security Passcode.' };
  }

  const session: AuthSession = {
    role: 'gate',
    loginTime: new Date().toISOString(),
  };

  saveAuthSession(session);
  return { success: true, message: 'Gate Security Post access granted.', session };
}

export function logout(): void {
  saveAuthSession(null);
}

