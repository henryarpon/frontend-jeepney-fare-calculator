import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from '../../../../app.routes';

// Sample data for tests only, not official LTFRB fares.
const sampleCsv = 'DistanceKm,RegularFare,DiscountedFare\n1,13.00,10.40\n2,14.75,11.80\n';
const sampleRows = [
  { distanceKm: 1, regularFare: 13.0, discountedFare: 10.4 },
  { distanceKm: 2, regularFare: 14.75, discountedFare: 11.8 },
];

describe('FareMatrixUploadComponent', () => {
  let httpMock: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();

    const navigation = harness.navigateByUrl('/admin/fare-matrices/upload');
    const meRequest = await vi.waitFor(() => httpMock.expectOne('/api/admin/me'));
    meRequest.flush({ username: 'admin' });
    await navigation;
  });

  afterEach(() => httpMock.verify());

  function page(): HTMLElement {
    return harness.routeNativeElement as HTMLElement;
  }

  function button(label: string): HTMLButtonElement {
    const buttons = Array.from(page().querySelectorAll('button'));
    return buttons.find((b) => b.textContent?.trim() === label)!;
  }

  async function fillForm(vehicleType: string, file: File, note: string): Promise<void> {
    const select = page().querySelector<HTMLSelectElement>('select#vehicle-type')!;
    select.value = vehicleType;
    select.dispatchEvent(new Event('change'));

    const fileInput = page().querySelector<HTMLInputElement>('input#fare-matrix-file')!;
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    fileInput.dispatchEvent(new Event('change'));

    const noteInput = page().querySelector<HTMLInputElement>('input#note')!;
    noteInput.value = note;
    noteInput.dispatchEvent(new Event('input'));

    await harness.fixture.whenStable();
  }

  it('keeps confirm disabled until the file has been previewed', async () => {
    await fillForm('ModernJeepney', new File([sampleCsv], 'matrix.csv'), '');

    expect(button('Confirm upload').disabled).toBe(true);
  });

  it('previews the rows, then uploads on confirm and shows the version list', async () => {
    const file = new File([sampleCsv], 'matrix.csv', { type: 'text/csv' });
    await fillForm('ModernJeepney', file, 'LTFRB MC 2026-001 (sample)');

    button('Preview').click();
    const previewRequest = httpMock.expectOne('/api/admin/fare-matrices/preview');
    expect(previewRequest.request.method).toBe('POST');
    const previewForm = previewRequest.request.body as FormData;
    expect(previewForm.get('vehicleType')).toBe('ModernJeepney');
    expect(previewForm.get('file')).toBeInstanceOf(File);
    previewRequest.flush({ vehicleType: 'ModernJeepney', rows: sampleRows });
    await harness.fixture.whenStable();

    const previewCells = Array.from(page().querySelectorAll('table tbody tr')).map((row) =>
      Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim()),
    );
    expect(previewCells).toEqual([
      ['1', '₱13.00', '₱10.40'],
      ['2', '₱14.75', '₱11.80'],
    ]);
    expect(button('Confirm upload').disabled).toBe(false);

    button('Confirm upload').click();
    const uploadRequest = httpMock.expectOne('/api/admin/fare-matrices');
    expect(uploadRequest.request.method).toBe('POST');
    const uploadForm = uploadRequest.request.body as FormData;
    expect(uploadForm.get('vehicleType')).toBe('ModernJeepney');
    expect(uploadForm.get('note')).toBe('LTFRB MC 2026-001 (sample)');
    expect(uploadForm.get('file')).toBeInstanceOf(File);
    const uploaded = {
      id: 7,
      vehicleType: 'ModernJeepney',
      uploadedAt: '2026-11-06T08:30:00+00:00',
      note: 'LTFRB MC 2026-001 (sample)',
      isActive: true,
      rowCount: 2,
    };
    uploadRequest.flush(uploaded, { status: 201, statusText: 'Created' });

    const listRequest = await vi.waitFor(() =>
      httpMock.expectOne('/api/admin/fare-matrices?vehicleType=ModernJeepney'),
    );
    listRequest.flush([
      uploaded,
      { ...uploaded, id: 6, note: null, isActive: false, uploadedAt: '2026-01-15T02:00:00+00:00' },
    ]);
    await harness.fixture.whenStable();

    expect(page().querySelector('[role="status"]')?.textContent).toContain(
      'It is now the Active Fare Matrix for Modern Jeepney.',
    );
    const versionItems = Array.from(page().querySelectorAll('.version-list li')).map(
      (item) => item.textContent ?? '',
    );
    expect(versionItems).toHaveLength(2);
    expect(versionItems[0]).toContain('LTFRB MC 2026-001 (sample)');
    expect(versionItems[0]).toContain('Active');
    expect(versionItems[0]).toContain('2 rows');
    expect(versionItems[1]).not.toContain('Active');
  });
});
