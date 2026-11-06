import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { FareMatrixFileError } from '../../models/fare-matrix.models';

/** Every reason a fare matrix file was rejected, each with where in the file it is. */
@Component({
  selector: 'app-fare-matrix-file-errors',
  templateUrl: './fare-matrix-file-errors.component.html',
  styleUrl: './fare-matrix-file-errors.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FareMatrixFileErrorsComponent {
  readonly errors = input.required<FareMatrixFileError[]>();

  protected readonly summary = computed(() => {
    const count = this.errors().length;
    return `This file can't be used, so nothing was saved. Fix ${count === 1 ? 'this error' : `these ${count} errors`} and try again.`;
  });

  /** Where the error is, e.g. "Row 3, RegularFare", or `null` when it is about the whole file. */
  protected location(error: FareMatrixFileError): string | null {
    if (error.row === null) {
      return null;
    }
    return error.column ? `Row ${error.row}, ${error.column}` : `Row ${error.row}`;
  }
}
