import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    // Not linked from the commuter UI. The Administrator types the URL.
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.adminRoutes),
  },
];
