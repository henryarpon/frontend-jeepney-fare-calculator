import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The app's one illustration: an original side-view jeepney. Decorative only, so it is
 * hidden from screen readers. Used small in the header and large in the empty result state,
 * never on the result itself.
 */
@Component({
  selector: 'app-jeepney-illustration',
  templateUrl: './jeepney-illustration.component.html',
  styleUrl: './jeepney-illustration.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', '[style.width.px]': 'width()' },
})
export class JeepneyIllustrationComponent {
  /** Width in CSS pixels. The height follows from the drawing's proportions. */
  readonly width = input(44);
}
