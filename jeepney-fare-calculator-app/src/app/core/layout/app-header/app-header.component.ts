import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatIconButton } from '@angular/material/button';

import { JeepneyIllustrationComponent } from '../../../shared/components/jeepney-illustration/jeepney-illustration.component';
import { ThemeService } from '../../theme/theme.service';

/** The header on every page: the jeepney mark, the app's name, and the light/dark toggle. */
@Component({
  selector: 'app-header',
  imports: [MatIconButton, JeepneyIllustrationComponent],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppHeaderComponent {
  private readonly themes = inject(ThemeService);

  protected readonly isDark = computed(() => this.themes.theme() === 'dark');
  protected readonly toggleLabel = computed(() =>
    this.isDark() ? 'Switch to light theme' : 'Switch to dark theme',
  );

  protected toggleTheme(): void {
    this.themes.toggle();
  }
}
