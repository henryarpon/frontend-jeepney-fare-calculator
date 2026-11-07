import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadChildren: () => import('./features/fare/fare.routes').then((m) => m.fareRoutes),
  },
  {
    // Not linked from the commuter UI. The Administrator types the URL.
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.adminRoutes),
  },
];
