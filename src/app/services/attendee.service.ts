import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, shareReplay, tap } from 'rxjs';

import { ApiResponse, Attendee, CheckInRecord, WalkInRegistration } from '../models/attendance';

const API_URL = '/api/apps-script';
const textHeaders = new HttpHeaders({ 'Content-Type': 'text/plain;charset=utf-8' });
type AttendeeRecord = Pick<Attendee, 'sourceRow' | 'name' | 'phoneNumber' | 'location'>;
type AttendeeListResponse = ApiResponse<AttendeeRecord[]> & { attendees?: AttendeeRecord[] };

@Injectable({ providedIn: 'root' })
export class AttendeeService {
  private attendees: Attendee[] = [];
  private checkIns: CheckInRecord[] = [];
  private attendeeLoad$?: Observable<ApiResponse<Attendee[]>>;

  constructor(private readonly http: HttpClient) {}

  loadAttendees(reload = false): Observable<ApiResponse<Attendee[]>> {
    if (reload || !this.attendeeLoad$) {
      this.attendeeLoad$ = forkJoin({
      attendees: this.http.get<AttendeeListResponse>(API_URL, { params: { action: 'getAll' } }),
      checkIns: this.http.get<ApiResponse<CheckInRecord[]>>(API_URL, { params: { action: 'checkIns' } }),
    }).pipe(
      map(({ attendees, checkIns }) => {
        if (!attendees.success || !checkIns.success) {
          return { success: false, message: attendees.message ?? checkIns.message ?? 'Attendees could not be loaded.' };
        }

        this.attendees = (attendees.data ?? attendees.attendees ?? []).map((attendee) => ({
          sourceRow: attendee.sourceRow,
          name: attendee.name,
          phoneNumber: attendee.phoneNumber,
          location: attendee.location,
          checkedIn: false,
        }));
        this.applyCheckIns(checkIns.data ?? []);
        return { success: true, data: this.attendees };
      }),
      catchError((error: unknown) => of({ success: false, message: this.errorMessage(error) })),
      shareReplay({ bufferSize: 1, refCount: false }),
      );
    }

    return this.attendeeLoad$;
  }

  refreshCheckIns(): Observable<ApiResponse<CheckInRecord[]>> {
    return this.http.get<ApiResponse<CheckInRecord[]>>(API_URL, { params: { action: 'checkIns' } }).pipe(
      tap((response) => {
        if (response.success) this.applyCheckIns(response.data ?? []);
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
      checkedIn,
      walkIns: this.checkIns.filter((checkIn) => checkIn.registrationType === 'WALK_IN').length,
      totalCheckedIn: this.checkIns.length,
    };
  }

  recentArrivals(): CheckInRecord[] {
    return [...this.checkIns]
      .sort((left, right) => right.checkInTime.localeCompare(left.checkInTime));
  }

  checkIn(attendee: Attendee): Observable<ApiResponse> {
    return this.post({
      action: 'checkIn',
      sourceRow: attendee.sourceRow,
    }).pipe(tap((response) => {
      if (response.success) {
        this.applyCheckIns([...this.checkIns, this.toCheckInRecord(attendee, 'REGISTRATION')]);
      }
    }));
  }

  registerWalkIn(attendee: WalkInRegistration): Observable<ApiResponse> {
    return this.post({
      action: 'walkIn',
      attendee,
    }).pipe(tap((response) => {
      if (response.success) this.applyCheckIns([...this.checkIns, this.toCheckInRecord(attendee, 'WALK_IN')]);
    }));
  }

  private applyCheckIns(checkIns: CheckInRecord[]): void {
    this.checkIns = checkIns;
    const recordsByPhone = new Map(checkIns.map((checkIn) => [this.normalizePhone(checkIn.phoneNumber), checkIn]));
    this.attendees.forEach((attendee) => {
      const record = recordsByPhone.get(this.normalizePhone(attendee.phoneNumber));
      attendee.checkedIn = !!record;
      attendee.checkedInAt = record?.checkInTime;
    });
  }

  private toCheckInRecord(attendee: WalkInRegistration, registrationType: CheckInRecord['registrationType']): CheckInRecord {
    return {
      name: attendee.name,
      phoneNumber: attendee.phoneNumber,
      location: attendee.location,
      registrationType,
      checkInTime: new Date().toISOString(),
    };
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
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
