export type ConnectionState = 'connected' | 'connecting' | 'offline' | 'syncing' | 'error';

export interface Attendee {
  sourceRow: number;
  name: string;
  phoneNumber: string;
  location: string;
  checkedIn: boolean;
  checkedInAt?: string;
}

export interface AttendanceSummary {
  checkedIn: number;
  walkIns: number;
  totalCheckedIn: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  count?: number;
  data?: T;
  message?: string;
  error?: { code?: string; message?: string };
}

export interface CheckInRecord {
  name: string;
  phoneNumber: string;
  location: string;
  registrationType: 'REGISTRATION' | 'WALK_IN';
  checkInTime: string;
}

export interface WalkInRegistration {
  name: string;
  phoneNumber: string;
  location: string;
}
