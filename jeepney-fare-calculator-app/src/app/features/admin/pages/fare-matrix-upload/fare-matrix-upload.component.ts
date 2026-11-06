import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { FareMatrixFileErrorsComponent } from '../../components/fare-matrix-file-errors/fare-matrix-file-errors.component';
import { FareMatrixRowsTableComponent } from '../../components/fare-matrix-rows-table/fare-matrix-rows-table.component';
import { FareMatrixVersionListComponent } from '../../components/fare-matrix-version-list/fare-matrix-version-list.component';
import {
  FareMatrixFileError,
  FareMatrixPreview,
  FareMatrixVersionSummary,
  VehicleType,
  vehicleTypeLabel,
  vehicleTypeOptions,
} from '../../models/fare-matrix.models';
import { FareMatrixService, fareMatrixFileErrors } from '../../services/fare-matrix.service';

/** Matches the back end's `UploadFareMatrix.NoteMaxLength`. */
const noteMaxLength = 200;

/**
 * Upload a fare matrix CSV: pick a vehicle type, attach the file, preview its rows,
 * then confirm. The confirmed file becomes a new Fare Matrix Version and the Active
 * Fare Matrix, and the page then lists the vehicle type's versions.
 */
@Component({
  selector: 'app-fare-matrix-upload',
  imports: [
    ReactiveFormsModule,
    FareMatrixFileErrorsComponent,
    FareMatrixRowsTableComponent,
    FareMatrixVersionListComponent,
  ],
  templateUrl: './fare-matrix-upload.component.html',
  styleUrl: './fare-matrix-upload.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FareMatrixUploadComponent {
  private readonly fareMatrices = inject(FareMatrixService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly vehicleTypeOptions = vehicleTypeOptions;
  protected readonly noteMaxLength = noteMaxLength;

  protected readonly form = new FormGroup({
    vehicleType: new FormControl<VehicleType>('TraditionalJeepney', { nonNullable: true }),
    note: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(noteMaxLength)] }),
  });

  protected readonly file = signal<File | null>(null);
  protected readonly preview = signal<FareMatrixPreview | null>(null);
  /** Why the back end rejected the file, shown instead of the preview. */
  protected readonly fileErrors = signal<FareMatrixFileError[] | null>(null);
  protected readonly busy = signal<'previewing' | 'uploading' | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly uploadedMessage = signal<string | null>(null);
  protected readonly versions = signal<FareMatrixVersionSummary[] | null>(null);

  protected readonly canPreview = computed(() => this.file() !== null && this.busy() === null);
  protected readonly canConfirm = computed(() => this.preview() !== null && this.busy() === null);
  protected readonly previewLabel = computed(() => (this.busy() === 'previewing' ? 'Previewing…' : 'Preview'));
  protected readonly confirmLabel = computed(() => (this.busy() === 'uploading' ? 'Uploading…' : 'Confirm upload'));
  protected readonly previewCaption = computed(() => {
    const preview = this.preview();
    return preview ? `Preview: ${vehicleTypeLabel(preview.vehicleType)}, ${preview.rows.length} rows` : '';
  });

  /**
   * A preview, or the errors found instead, only belongs to the vehicle type and file
   * it was made from, so changing either drops it.
   */
  protected clearPreview(): void {
    this.preview.set(null);
    this.fileErrors.set(null);
  }

  protected onFileChosen(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file.set(input.files?.[0] ?? null);
    this.clearPreview();
  }

  protected previewFile(): void {
    const file = this.file();
    if (!file || this.busy()) {
      return;
    }
    this.busy.set('previewing');
    this.clearPreview();
    this.errorMessage.set(null);
    this.uploadedMessage.set(null);

    this.fareMatrices
      .preview(this.form.controls.vehicleType.value, file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (preview) => {
          this.busy.set(null);
          this.preview.set(preview);
        },
        error: (error: unknown) =>
          this.showFailure(error, "Couldn't preview this file. Check that it is a fare matrix CSV and try again."),
      });
  }

  protected confirmUpload(): void {
    const preview = this.preview();
    const file = this.file();
    if (!preview || !file || this.busy()) {
      return;
    }
    if (this.form.controls.note.invalid) {
      this.errorMessage.set(`The note can be at most ${noteMaxLength} characters.`);
      return;
    }
    this.busy.set('uploading');
    this.errorMessage.set(null);

    this.fareMatrices
      .upload(preview.vehicleType, file, this.form.controls.note.value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (version) => {
          this.busy.set(null);
          this.uploadedMessage.set(
            `Uploaded. It is now the Active Fare Matrix for ${vehicleTypeLabel(version.vehicleType)}.`,
          );
          this.clearAfterUpload();
          this.loadVersions(version.vehicleType);
        },
        error: (error: unknown) =>
          this.showFailure(error, "Couldn't upload this file. Nothing was saved. Please try again."),
      });
  }

  /**
   * Shows why a preview or upload failed: the file's errors instead of the preview when the
   * back end rejected the file (on upload too, e.g. if it changed after the preview), or
   * `fallbackMessage` for any other failure.
   */
  private showFailure(error: unknown, fallbackMessage: string): void {
    this.busy.set(null);
    const fileErrors = fareMatrixFileErrors(error);
    if (fileErrors) {
      this.preview.set(null);
      this.fileErrors.set(fileErrors);
    } else {
      this.errorMessage.set(fallbackMessage);
    }
  }

  /** Clears the file, its preview and the note, ready for the next upload. */
  private clearAfterUpload(): void {
    this.fileInput().nativeElement.value = '';
    this.file.set(null);
    this.clearPreview();
    this.form.controls.note.reset();
  }

  private loadVersions(vehicleType: VehicleType): void {
    this.fareMatrices
      .listVersions(vehicleType)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (versions) => this.versions.set(versions),
        error: () => this.errorMessage.set("Couldn't load the version list. Reload the page to see it."),
      });
  }
}
