import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FareMatrixVersionSummary } from '../../models/fare-matrix.models';

/** A vehicle type's Fare Matrix Versions, newest first, with the active one marked. Each links to the version's page. */
@Component({
  selector: 'app-fare-matrix-version-list',
  imports: [DatePipe, RouterLink],
  templateUrl: './fare-matrix-version-list.component.html',
  styleUrl: './fare-matrix-version-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FareMatrixVersionListComponent {
  readonly versions = input.required<FareMatrixVersionSummary[]>();
}
