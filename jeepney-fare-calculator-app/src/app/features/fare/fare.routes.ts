import { Routes } from '@angular/router';

import { FareCalculatorComponent } from './pages/fare-calculator/fare-calculator.component';

export const fareRoutes: Routes = [
  // "Jeepney Fare Calculator" is a working name only (PRODUCT.md).
  { path: '', component: FareCalculatorComponent, title: 'Jeepney Fare Calculator' },
];
