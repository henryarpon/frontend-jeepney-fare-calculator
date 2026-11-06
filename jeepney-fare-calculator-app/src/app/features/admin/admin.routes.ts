import { Routes } from '@angular/router';

import { adminAuthGuard } from '../../core/auth/admin-auth.guard';
import { AdminHomeComponent } from './pages/admin-home/admin-home.component';
import { AdminLayoutComponent } from './pages/admin-layout/admin-layout.component';
import { FareMatrixUploadComponent } from './pages/fare-matrix-upload/fare-matrix-upload.component';
import { SignInComponent } from './pages/sign-in/sign-in.component';

export const adminRoutes: Routes = [
  { path: 'sign-in', component: SignInComponent, title: 'Administrator sign-in' },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [adminAuthGuard],
    children: [
      { path: '', component: AdminHomeComponent, title: 'Administrator' },
      { path: 'fare-matrices/upload', component: FareMatrixUploadComponent, title: 'Upload a fare matrix' },
    ],
  },
];
