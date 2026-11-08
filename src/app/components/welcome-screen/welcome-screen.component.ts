import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-welcome-screen',
  standalone: true,
  templateUrl: './welcome-screen.component.html',
  styleUrl: './welcome-screen.component.scss',
})
export class WelcomeScreenComponent {
  readonly eventDate = 'October 18, 2026';

  constructor(private readonly router: Router) {}

  goToCheckIn(): void {
    this.router.navigate(['/check-in']);
  }
}
