import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-home',
  imports: [RouterLink],
  templateUrl: './admin-home.component.html',
  styleUrl: './admin-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminHomeComponent {}
