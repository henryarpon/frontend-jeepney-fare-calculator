import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { minQueryLength, Place, PlaceSearchStatus } from '../../models/fare.models';

/**
 * One end of the Trip (Origin or Destination): a search box with suggestions
 * while no place is chosen, and the chosen place's full name once one is.
 * Long names wrap and are never cut off.
 */
@Component({
  selector: 'app-place-field',
  imports: [ReactiveFormsModule],
  templateUrl: './place-field.component.html',
  styleUrl: './place-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceFieldComponent {
  private readonly injector = inject(Injector);

  /** "Origin" or "Destination". */
  readonly label = input.required<string>();
  /** Used to make element ids unique on the page. */
  readonly fieldId = input.required<string>();
  readonly selected = input<Place | null>(null);
  readonly suggestions = input<Place[]>([]);
  readonly status = input<PlaceSearchStatus>('idle');

  /** Every change to the typed text. */
  readonly queryChange = output<string>();
  readonly placeSelect = output<Place>();
  /** The commuter wants to pick a different place. */
  readonly placeClear = output<void>();

  /** The text typed in the search box. */
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  private readonly text = toSignal(this.searchControl.valueChanges, { initialValue: '' });
  protected readonly activeIndex = signal(-1);
  /** Suggestions stay closed after a choice or Escape, until the commuter types again. */
  protected readonly dismissed = signal(false);

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private readonly changeButton = viewChild<ElementRef<HTMLButtonElement>>('changeButton');

  protected readonly listboxId = computed(() => `${this.fieldId()}-suggestions`);
  protected readonly messageId = computed(() => `${this.fieldId()}-message`);

  protected readonly listOpen = computed(
    () => !this.dismissed() && this.status() === 'done' && this.suggestions().length > 0,
  );

  protected readonly activeOptionId = computed(() =>
    this.listOpen() && this.activeIndex() >= 0 ? `${this.fieldId()}-option-${this.activeIndex()}` : null,
  );

  /** What to tell the commuter under the box, or `null` for nothing. */
  protected readonly message = computed<string | null>(() => {
    const typed = this.text().trim().length;
    switch (this.status()) {
      case 'searching':
        return 'Searching…';
      case 'failed':
        return "Couldn't search for places right now. Check your connection and try again.";
      case 'done':
        return this.suggestions().length === 0 && typed >= minQueryLength && !this.dismissed()
          ? 'No places match. Try another name or a nearby landmark.'
          : null;
      default:
        return typed > 0 && typed < minQueryLength ? `Type at least ${minQueryLength} characters.` : null;
    }
  });

  constructor() {
    // Every change to the text, typed or cleared by "Change", starts a new search.
    this.searchControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((text) => {
      this.activeIndex.set(-1);
      this.dismissed.set(false);
      this.queryChange.emit(text);
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.suggestions().length;
    if (!this.listOpen()) {
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.activeIndex.update((index) => (index + 1) % count);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.activeIndex.update((index) => (index <= 0 ? count - 1 : index - 1));
        break;
      case 'Enter':
        if (this.activeIndex() >= 0) {
          event.preventDefault();
          this.choose(this.suggestions()[this.activeIndex()]);
        }
        break;
      case 'Escape':
        // In a search box the browser would also clear the text; only close the list.
        event.preventDefault();
        this.dismissed.set(true);
        break;
    }
  }

  protected choose(place: Place): void {
    this.dismissed.set(true);
    this.activeIndex.set(-1);
    this.placeSelect.emit(place);
    // The search box is replaced by the chosen place, so keep focus nearby.
    afterNextRender(() => this.changeButton()?.nativeElement.focus(), { injector: this.injector });
  }

  protected change(): void {
    this.searchControl.setValue('');
    this.placeClear.emit();
    afterNextRender(() => this.searchInput()?.nativeElement.focus(), { injector: this.injector });
  }
}
