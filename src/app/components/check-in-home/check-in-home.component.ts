import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, timer } from 'rxjs';
import { debounceTime, distinctUntilChanged, exhaustMap } from 'rxjs/operators';

import { Attendee, AttendanceSummary, CheckInRecord, ConnectionState, WalkInRegistration } from '../../models/attendance';
import { AttendeeService } from '../../services/attendee.service';
import { WalkInDrawerComponent } from '../walk-in-drawer/walk-in-drawer.component';

@Component({
  selector: 'app-check-in-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, WalkInDrawerComponent],
  templateUrl: './check-in-home.component.html',
  styleUrl: './check-in-home.component.scss',
})
export class CheckInHomeComponent implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  readonly searchControl = new FormControl('');
  readonly destroy$ = new Subject<void>();

  stats: AttendanceSummary = { checkedIn: 0, walkIns: 0, totalCheckedIn: 0 };
  attendees: Attendee[] = [];
  results: Attendee[] = [];
  recentArrivals: CheckInRecord[] = [];
  isSearching = false;
  isLoadingAttendees = true;
  loadError: string | null = null;
  isSubmittingWalkIn = false;
  isWalkInOpen = false;
  walkInError: string | null = null;
  isCheckingInId: number | null = null;
  connectionState: ConnectionState = 'connected';
  latestSearchRequest = 0;
  toast: { type: 'success' | 'error'; message: string } | null = null;

  @ViewChild(WalkInDrawerComponent) walkInDrawer?: WalkInDrawerComponent;

  constructor(private readonly attendeeService: AttendeeService) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) this.loadAttendees();
    this.searchControl.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((value) => {
        this.runSearch(value ?? '');
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  clearSearch(): void {
    this.searchControl.setValue('');
    this.results = [];
    this.toast = null;
    this.latestSearchRequest += 1;
  }

  showRecentArrivals(): void {
    this.showAllArrivals = true;
    this.clearSearch();
    requestAnimationFrame(() => {
      document.getElementById('recent-arrivals')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  showAllArrivals = false;

  runSearch(query: string): void {
    const trimmed = query.trim();
    this.latestSearchRequest += 1;

    if (!trimmed) {
      this.results = [];
      this.isSearching = false;
      this.toast = null;
      return;
    }

    this.isSearching = false;
    this.results = this.attendeeService.search(trimmed);
  }

  checkIn(attendee: Attendee): void {
    if (attendee.checkedIn || this.isCheckingInId === attendee.sourceRow) {
      return;
    }

    this.isCheckingInId = attendee.sourceRow;
    this.toast = null;

    this.attendeeService.checkIn(attendee).subscribe((response) => {
      this.isCheckingInId = null;

      if (response.success) {
        attendee.checkedIn = true;
        attendee.checkedInAt = new Date().toISOString();
        this.results = [...this.results];
        this.toast = {
          type: 'success',
          message: `${attendee.name} has been checked in.`,
        };
        this.refreshDashboard();
        this.searchControl.setValue('', { emitEvent: false });
        this.results = [];
        this.latestSearchRequest += 1;
        return;
      }

      this.toast = {
        type: 'error',
        message: response.message ?? response.error?.message ?? 'Check-in could not be completed.',
      };
    });
  }

  openWalkInDrawer(): void {
    this.walkInError = null;
    this.toast = null;
    this.isWalkInOpen = true;
  }

  handleWalkIn(submission: WalkInRegistration): void {
    if (this.isSubmittingWalkIn) return;
    this.walkInError = null;
    this.isSubmittingWalkIn = true;

    this.attendeeService.registerWalkIn(submission).subscribe((response) => {
      this.isSubmittingWalkIn = false;

      if (response.success) {
        this.isWalkInOpen = false;
        this.walkInDrawer?.clearForm();
        this.toast = {
          type: 'success',
          message: `${submission.name} registered and checked in successfully.`,
        };
        this.searchControl.setValue('', { emitEvent: false });
        this.results = [];
        this.refreshDashboard();
        return;
      }

      this.walkInError = response.message ?? response.error?.message ?? 'Walk-in registration failed.';
    });
  }

  retryLoad(): void {
    this.loadAttendees(true);
  }

  private loadAttendees(reload = false): void {
    this.isLoadingAttendees = true;
    this.loadError = null;
    this.connectionState = 'connecting';
    this.attendeeService.loadAttendees(reload).subscribe((response) => {
      this.isLoadingAttendees = false;
      if (!response.success) {
        this.connectionState = 'error';
        this.loadError = response.message ?? response.error?.message ?? 'Attendees could not be loaded.';
        return;
      }
      this.attendees = response.data ?? [];
      this.connectionState = 'connected';
      this.runSearch(this.searchControl.value ?? '');
      this.refreshDashboard();
      this.startCheckInRefresh();
    });
  }

  private startCheckInRefresh(): void {
    timer(4000, 4000).pipe(
      exhaustMap(() => this.attendeeService.refreshCheckIns()),
      takeUntil(this.destroy$),
    ).subscribe((response) => {
      this.connectionState = response.success ? 'connected' : 'offline';
      if (response.success) this.refreshDashboard();
    });
  }

  private refreshDashboard(): void {
    this.stats = this.attendeeService.getStats();
    this.recentArrivals = this.attendeeService.recentArrivals();
  }
}
