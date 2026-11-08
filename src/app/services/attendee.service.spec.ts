import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AttendeeService } from './attendee.service';

describe('AttendeeService', () => {
  let service: AttendeeService;
  let http: HttpTestingController;
  const apiUrl = '/api/apps-script';
  const attendee = {
    sourceRow: 2,
    timestamp: '2026-11-08T09:00:00.000Z',
    name: 'Jamie Example',
    phoneNumber: '9876543210',
    location: 'Hyderabad',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AttendeeService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads attendees once and searches the stored data locally', () => {
    service.loadAttendees().subscribe((response) => expect(response.success).toBeTrue());
    const request = http.expectOne(apiUrl);
    expect(request.request.method).toBe('GET');
    request.flush({ success: true, attendees: [attendee] });

    expect(service.search('JAMIE')[0].sourceRow).toBe(2);
    expect(service.search('(987) 654-3210')[0].name).toBe('Jamie Example');
    http.expectNone(apiUrl);
  });

  it('sends the source row and updates registered counts only on success', () => {
    service.loadAttendees().subscribe();
    http.expectOne(apiUrl).flush({ success: true, attendees: [attendee] });

    service.checkIn(2).subscribe((response) => expect(response.success).toBeTrue());
    const request = http.expectOne(apiUrl);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBe('{"action":"checkIn","sourceRow":2}');
    request.flush({ success: true });

    expect(service.getStats()).toEqual({
      totalRegistered: 1,
      checkedIn: 1,
      yetToArrive: 0,
      walkIns: 0,
      totalCheckedIn: 1,
    });
  });

  it('sends the walk-in contract and increments counts only on success', () => {
    const walkIn = { name: 'New Guest', phoneNumber: '1234567890', location: 'Pune' };
    service.registerWalkIn(walkIn).subscribe((response) => expect(response.success).toBeTrue());
    const request = http.expectOne(apiUrl);
    expect(request.request.body).toBe(JSON.stringify({ action: 'walkIn', attendee: walkIn }));
    request.flush({ success: true });

    expect(service.getStats().walkIns).toBe(1);
    expect(service.getStats().totalCheckedIn).toBe(1);
  });

  it('does not count a rejected check-in', () => {
    service.loadAttendees().subscribe();
    http.expectOne(apiUrl).flush({ success: true, attendees: [attendee] });
    service.checkIn(2).subscribe((response) => expect(response.success).toBeFalse());
    http.expectOne(apiUrl).flush({ success: false, message: 'Already checked in.' });

    expect(service.getStats().checkedIn).toBe(0);
  });

  it('sends JSON as text/plain to avoid a cross-origin preflight', () => {
    service.registerWalkIn({ name: 'Guest', phoneNumber: '1234567890', location: 'Pune' }).subscribe();
    const request = http.expectOne(apiUrl);
    expect(request.request.headers.get('Content-Type')).toBe('text/plain;charset=utf-8');
    request.flush({ success: false });
  });
});
