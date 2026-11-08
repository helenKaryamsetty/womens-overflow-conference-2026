import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { ApiResponse, Attendee, WalkInRegistration } from '../models/attendance';

const API_URL = '/api/apps-script';
const textHeaders = new HttpHeaders({ 'Content-Type': 'text/plain;charset=utf-8' });

@Injectable({ providedIn: 'root' })
export class AttendeeService {
  private attendees: Attendee[] = [];
  private walkIns = 0;

  constructor(private readonly http: HttpClient) {}

  loadAttendees(): Observable<ApiResponse<Attendee[]>> {
    return this.http.get<ApiResponse<Array<Omit<Attendee, 'checkedIn' | 'checkedInAt'>>>>(API_URL).pipe(
      map((response) => ({
        success: response.success,
        message: response.message,
        attendees: response.attendees?.map((attendee) => ({ ...attendee, checkedIn: false })),
      })),
      tap((response) => {
        if (response.success) {
          this.attendees = response.attendees ?? [];
          this.walkIns = 0;
        }
      }),
      catchError((error: unknown) => of({ success: false, message: this.errorMessage(error) })),
    );
  }

  search(query: string): Attendee[] {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const digits = query.replace(/\D/g, '');
    if (!normalizedQuery) return [];
    return this.attendees.filter((attendee) =>
      attendee.name.toLocaleLowerCase().includes(normalizedQuery) ||
      (digits.length > 0 && attendee.phoneNumber.replace(/\D/g, '').includes(digits)),
    );
  }

  getAttendees(): Attendee[] {
    return this.attendees;
  }

  getStats() {
    const checkedIn = this.attendees.filter((attendee) => attendee.checkedIn).length;
    return {
      totalRegistered: this.attendees.length,
      checkedIn,
      yetToArrive: this.attendees.length - checkedIn,
      walkIns: this.walkIns,
      totalCheckedIn: checkedIn + this.walkIns,
    };
  }

  recentArrivals(): Attendee[] {
    return this.attendees.filter((attendee) => attendee.checkedIn)
      .sort((left, right) => (right.checkedInAt ?? '').localeCompare(left.checkedInAt ?? ''))
      .slice(0, 5);
  }

  checkIn(sourceRow: number): Observable<ApiResponse> {
    return this.post({ action: 'checkIn', sourceRow }).pipe(tap((response) => {
      if (response.success) {
        const attendee = this.attendees.find((entry) => entry.sourceRow === sourceRow);
        if (attendee && !attendee.checkedIn) {
          attendee.checkedIn = true;
          attendee.checkedInAt = new Date().toISOString();
        }
      }
    }));
  }

  registerWalkIn(attendee: WalkInRegistration): Observable<ApiResponse> {
    return this.post({ action: 'walkIn', attendee }).pipe(tap((response) => {
      if (response.success) this.walkIns += 1;
    }));
  }

  private post(payload: object): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(API_URL, JSON.stringify(payload), { headers: textHeaders }).pipe(
      catchError((error: unknown) => of({ success: false, message: this.errorMessage(error) })),
    );
  }

  private errorMessage(error: unknown): string {
    const body = (error as { error?: { message?: string } })?.error;
    return body?.message ?? 'Could not reach the check-in service. Check your connection and retry.';
  }
}
