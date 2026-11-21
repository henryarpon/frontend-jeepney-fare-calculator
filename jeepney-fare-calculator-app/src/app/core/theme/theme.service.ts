import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

/** The localStorage key. The inline script in index.html reads the same key before first paint. */
export const themeStorageKey = 'jfc-theme';

/**
 * Light or dark theme. Follows the device's setting until the person picks one with
 * the header toggle; that choice is remembered on this device.
 *
 * The effective theme is written to `data-theme` on <html>, which switches every
 * light-dark() token in styles.scss.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storage = safeLocalStorage(this.document);
  private readonly systemQuery = this.document.defaultView?.matchMedia?.(
    '(prefers-color-scheme: dark)',
  );

  private readonly chosen = signal<Theme | null>(readTheme(this.storage));
  private readonly system = signal<Theme>(this.systemQuery?.matches ? 'dark' : 'light');

  /** The theme on screen: the person's choice, or else the device's. */
  readonly theme = computed<Theme>(() => this.chosen() ?? this.system());

  constructor() {
    this.systemQuery?.addEventListener('change', (event) =>
      this.system.set(event.matches ? 'dark' : 'light'),
    );
    effect(() => {
      this.document.documentElement.dataset['theme'] = this.theme();
    });
  }

  /** Switches to the other theme and remembers it on this device. */
  toggle(): void {
    const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.chosen.set(next);
    try {
      this.storage?.setItem(themeStorageKey, next);
    } catch {
      // Storage full or blocked: the choice still applies until the page is closed.
    }
  }
}

/** localStorage can be missing or throw (private windows, blocked site data). */
function safeLocalStorage(document: Document): Storage | null {
  try {
    return document.defaultView?.localStorage ?? null;
  } catch {
    return null;
  }
}

function readTheme(storage: Storage | null): Theme | null {
  try {
    const stored = storage?.getItem(themeStorageKey);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch {
    return null;
  }
}
