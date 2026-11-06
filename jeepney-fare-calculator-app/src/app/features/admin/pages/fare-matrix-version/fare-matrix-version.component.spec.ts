import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from '../../../../app.routes';

// Sample data for tests only, not official LTFRB fares.
const olderVersion = {
  id: 9,
  vehicleType: 'TraditionalJeepney',
  uploadedAt: '2026-01-15T02:00:00+00:00',
  note: 'LTFRB MC 2026-001 (sample)',
  isActive: false,
  rows: [
    { distanceKm: 1, regularFare: 13.0, discountedFare: 10.4 },
    { distanceKm: 2, regularFare: 14.75, discountedFare: 11.8 },
  ],
};

describe('FareMatrixVersionComponent', () => {
  let httpMock: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => httpMock.verify());

  async function open(id: number, version: object | null): Promise<void> {
    const navigation = harness.navigateByUrl(`/admin/fare-matrices/${id}`);
    const meRequest = await vi.waitFor(() => httpMock.expectOne('/api/admin/me'));
    meRequest.flush({ username: 'admin' });
    await navigation;

    const versionRequest = httpMock.expectOne(`/api/admin/fare-matrices/${id}`);
    expect(versionRequest.request.method).toBe('GET');
    if (version) {
      versionRequest.flush(version);
    } else {
      versionRequest.flush(
        { status: 404, title: 'Not Found' },
        { status: 404, statusText: 'Not Found' },
      );
    }
    await harness.fixture.whenStable();
  }

  function page(): HTMLElement {
    return harness.routeNativeElement as HTMLElement;
  }

  function button(label: string): HTMLButtonElement | undefined {
    return Array.from(page().querySelectorAll('button')).find((b) => b.textContent?.trim() === label);
  }

  it("shows the version's details and rows", async () => {
    await open(9, olderVersion);

    expect(page().querySelector('h1')?.textContent).toContain('Traditional Jeepney');
    expect(page().textContent).toContain('LTFRB MC 2026-001 (sample)');
    const cells = Array.from(page().querySelectorAll('table tbody tr')).map((row) =>
      Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim()),
    );
    expect(cells).toEqual([
      ['1', '₱13.00', '₱10.40'],
      ['2', '₱14.75', '₱11.80'],
    ]);
  });

  it('asks for confirmation before reactivating, then marks the version active', async () => {
    await open(9, olderVersion);

    button('Reactivate')!.click();
    await harness.fixture.whenStable();
    httpMock.expectNone('/api/admin/fare-matrices/9/activate');
    expect(page().textContent).toContain(
      'Make this the Active Fare Matrix for Traditional Jeepney? It will price every Traditional Jeepney trip from now on.',
    );

    button('Yes, reactivate')!.click();
    const activateRequest = httpMock.expectOne('/api/admin/fare-matrices/9/activate');
    expect(activateRequest.request.method).toBe('POST');
    const { rows, ...summary } = olderVersion;
    activateRequest.flush({ ...summary, isActive: true, rowCount: rows.length });
    await harness.fixture.whenStable();

    expect(page().querySelector('[role="status"]')?.textContent).toContain(
      'This is now the Active Fare Matrix for Traditional Jeepney.',
    );
    expect(page().querySelector('.active-badge')).not.toBeNull();
    expect(button('Reactivate')).toBeUndefined();
  });

  it('sends nothing when reactivation is cancelled', async () => {
    await open(9, olderVersion);

    button('Reactivate')!.click();
    await harness.fixture.whenStable();
    button('Cancel')!.click();
    await harness.fixture.whenStable();

    httpMock.expectNone('/api/admin/fare-matrices/9/activate');
    expect(button('Yes, reactivate')).toBeUndefined();
    expect(button('Reactivate')).toBeDefined();
  });

  it('offers no reactivation for the version that is already active', async () => {
    await open(9, { ...olderVersion, isActive: true });

    expect(page().querySelector('.active-badge')).not.toBeNull();
    expect(button('Reactivate')).toBeUndefined();
  });

  it('loads the new version when only the id changes, even after a failed load', async () => {
    await open(404, null);

    await harness.navigateByUrl('/admin/fare-matrices/9');
    httpMock.expectOne('/api/admin/fare-matrices/9').flush(olderVersion);
    await harness.fixture.whenStable();

    expect(page().querySelector('[role="alert"]')).toBeNull();
    expect(page().querySelectorAll('table tbody tr')).toHaveLength(2);
  });

  it('says the version does not exist when the back end answers 404', async () => {
    await open(404, null);

    expect(page().querySelector('[role="alert"]')?.textContent).toContain("This fare matrix version doesn't exist.");
    expect(page().querySelector('table')).toBeNull();
  });
});
