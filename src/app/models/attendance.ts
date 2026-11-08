export type ConnectionState = 'connected' | 'connecting' | 'offline' | 'syncing' | 'error';

export interface Attendee {
  sourceRow: number;
  timestamp: string;
  name: string;
  phoneNumber: string;
  location: string;
  checkedIn: boolean;
  checkedInAt?: string;
}

export interface AttendanceSummary {
  totalRegistered: number;
  checkedIn: number;
  yetToArrive: number;
  walkIns: number;
  totalCheckedIn: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  attendees?: T;
  message?: string;
  error?: { code?: string; message?: string };
}

export interface WalkInRegistration {
  name: string;
  phoneNumber: string;
  location: string;
}
