import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AttendeeService } from './services/attendee.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  readonly title = 'Women’s Overflow';

  constructor(private readonly attendeeService: AttendeeService) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) this.attendeeService.loadAttendees().subscribe();
  }
}
