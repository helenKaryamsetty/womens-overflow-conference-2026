import { Routes } from '@angular/router';

import { CheckInHomeComponent } from './components/check-in-home/check-in-home.component';
import { WelcomeScreenComponent } from './components/welcome-screen/welcome-screen.component';

export const routes: Routes = [
  { path: '', component: WelcomeScreenComponent },
  { path: 'check-in', component: CheckInHomeComponent },
  { path: '**', redirectTo: '' },
];
