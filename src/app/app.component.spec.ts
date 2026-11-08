import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { AttendeeService } from './services/attendee.service';

describe('AppComponent', () => {
  let attendeeService: jasmine.SpyObj<AttendeeService>;

  beforeEach(async () => {
    attendeeService = jasmine.createSpyObj<AttendeeService>('AttendeeService', ['loadAttendees']);
    attendeeService.loadAttendees.and.returnValue(of({ success: true, data: [] }));
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [{ provide: AttendeeService, useValue: attendeeService }],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should expose the Women’s Overflow title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toBe('Women’s Overflow');
  });

  it('loads attendees once when the app starts', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    expect(attendeeService.loadAttendees).toHaveBeenCalledOnceWith();
  });
});
