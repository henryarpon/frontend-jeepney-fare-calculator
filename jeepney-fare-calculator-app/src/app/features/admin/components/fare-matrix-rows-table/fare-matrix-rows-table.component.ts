import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { FareMatrixRow } from '../../models/fare-matrix.models';

/** The rows of a fare matrix as a table: distance, Regular Fare, Discounted Fare. */
@Component({
  selector: 'app-fare-matrix-rows-table',
  imports: [CurrencyPipe],
  templateUrl: './fare-matrix-rows-table.component.html',
  styleUrl: './fare-matrix-rows-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FareMatrixRowsTableComponent {
  readonly rows = input.required<FareMatrixRow[]>();
  readonly caption = input.required<string>();
}
