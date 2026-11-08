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
    name: 'Jamie Example',
    phoneNumber: '9876543210',
    location: 'Hyderabad',
    checkedIn: false,
  };
  const checkIn = {
    name: attendee.name,
    phoneNumber: attendee.phoneNumber,
    location: attendee.location,
    registrationType: 'REGISTRATION' as const,
    checkInTime: '2026-11-08T09:30:00.000Z',
  };

  function loadInitialData(): void {
    service.loadAttendees().subscribe((response) => expect(response.success).toBeTrue());
    http.expectOne((request) => request.url === apiUrl && request.params.get('action') === 'getAll')
      .flush({ success: true, count: 1, data: [{ sourceRow: 2, name: attendee.name, phoneNumber: attendee.phoneNumber, location: attendee.location }] });
    http.expectOne((request) => request.url === apiUrl && request.params.get('action') === 'checkIns')
      .flush({ success: true, count: 0, data: [] });
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AttendeeService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads attendees and check-ins initially, then searches the stored data locally', () => {
    loadInitialData();

    expect(service.search('JAMIE')[0].sourceRow).toBe(2);
    expect(service.search('(987) 654-3210')[0].name).toBe('Jamie Example');
    http.expectNone(apiUrl);
  });

  it('loads attendees from the deployed attendees field and finds duplicate registrations', () => {
    service.loadAttendees().subscribe((response) => expect(response.success).toBeTrue());
    http.expectOne((request) => request.url === apiUrl && request.params.get('action') === 'getAll')
      .flush({ success: true, count: 2, attendees: [
        { sourceRow: 159, name: 'Monica Jonathan ', phoneNumber: '9177030347', location: 'Nallagandla Hyderabad ' },
        { sourceRow: 472, name: 'Monica Jonathan ', phoneNumber: '9177030347', location: 'Nallagandla,Hyderabad ' },
      ] });
    http.expectOne((request) => request.url === apiUrl && request.params.get('action') === 'checkIns')
      .flush({ success: true, count: 0, data: [] });

    expect(service.search('Monica Jonathan').map((match) => match.sourceRow)).toEqual([159, 472]);
    expect(service.search('9177030347').map((match) => match.sourceRow)).toEqual([159, 472]);
  });

  it('sends the registered check-in contract and updates counts on success', () => {
    loadInitialData();
    service.checkIn(attendee).subscribe((response) => expect(response.success).toBeTrue());
    const request = http.expectOne(apiUrl);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBe(JSON.stringify({ action: 'checkIn', sourceRow: attendee.sourceRow }));
    request.flush({ success: true });

    expect(service.getStats()).toEqual({
      checkedIn: 1,
      walkIns: 0,
      totalCheckedIn: 1,
    });
  });

  it('sends a walk-in through the same check-in contract', () => {
    const walkIn = { name: 'New Guest', phoneNumber: '1234567890', location: 'Pune' };
    service.registerWalkIn(walkIn).subscribe((response) => expect(response.success).toBeTrue());
    const request = http.expectOne(apiUrl);
    expect(request.request.body).toBe(JSON.stringify({ action: 'walkIn', attendee: walkIn }));
    request.flush({ success: true });

    expect(service.getStats().walkIns).toBe(1);
    expect(service.getStats().totalCheckedIn).toBe(1);
  });

  it('does not count a rejected check-in', () => {
    loadInitialData();
    service.checkIn(attendee).subscribe((response) => expect(response.success).toBeFalse());
    http.expectOne(apiUrl).flush({ success: false, message: 'Already checked in.' });

    expect(service.getStats().checkedIn).toBe(0);
  });

  it('merges refreshed check-ins into attendee state and totals', () => {
    loadInitialData();

    service.refreshCheckIns().subscribe((response) => expect(response.success).toBeTrue());
    http.expectOne((request) => request.url === apiUrl && request.params.get('action') === 'checkIns')
      .flush({ success: true, count: 2, data: [checkIn, { ...checkIn, registrationType: 'WALK_IN' }] });

    expect(service.search('Jamie')[0].checkedIn).toBeTrue();
    expect(service.getStats()).toEqual({ checkedIn: 1, walkIns: 1, totalCheckedIn: 2 });
  });

  it('returns every checked-in attendee, ordered by most recent arrival', () => {
    const attendees = Array.from({ length: 6 }, (_, index) => ({
      sourceRow: index + 2,
      name: `Guest ${index + 1}`,
      phoneNumber: `98765432${String(index).padStart(2, '0')}`,
      location: 'Hyderabad',
    }));
    const checkIns = attendees.map((item, index) => ({
      name: item.name,
      phoneNumber: item.phoneNumber,
      location: item.location,
      registrationType: 'REGISTRATION' as const,
      checkInTime: `2026-11-08T09:${String(index).padStart(2, '0')}:00.000Z`,
    }));

    service.loadAttendees().subscribe((response) => expect(response.success).toBeTrue());
    http.expectOne((request) => request.url === apiUrl && request.params.get('action') === 'getAll')
      .flush({ success: true, count: attendees.length, data: attendees });
    http.expectOne((request) => request.url === apiUrl && request.params.get('action') === 'checkIns')
      .flush({ success: true, count: checkIns.length, data: checkIns });

    expect(service.recentArrivals().length).toBe(6);
    expect(service.recentArrivals()[0].name).toBe('Guest 6');
  });

  it('sends JSON as text/plain to avoid a cross-origin preflight', () => {
    service.registerWalkIn({ name: 'Guest', phoneNumber: '1234567890', location: 'Pune' }).subscribe();
    const request = http.expectOne(apiUrl);
    expect(request.request.headers.get('Content-Type')).toBe('text/plain;charset=utf-8');
    request.flush({ success: false });
  });
});
