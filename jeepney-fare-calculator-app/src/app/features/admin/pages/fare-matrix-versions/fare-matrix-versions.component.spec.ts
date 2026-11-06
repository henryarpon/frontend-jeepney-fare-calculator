import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from '../../../../app.routes';

const traditionalVersions = [
  {
    id: 12,
    vehicleType: 'TraditionalJeepney',
    uploadedAt: '2026-11-06T08:30:00+00:00',
    note: 'LTFRB MC 2026-002 (sample)',
    isActive: false,
    rowCount: 50,
  },
  {
    id: 9,
    vehicleType: 'TraditionalJeepney',
    uploadedAt: '2026-01-15T02:00:00+00:00',
    note: null,
    isActive: true,
    rowCount: 48,
  },
];
const modernVersions = [
  {
    id: 10,
    vehicleType: 'ModernJeepney',
    uploadedAt: '2026-02-01T02:00:00+00:00',
    note: null,
    isActive: true,
    rowCount: 40,
  },
];

describe('FareMatrixVersionsComponent', () => {
  let httpMock: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();

    const navigation = harness.navigateByUrl('/admin/fare-matrices');
    const meRequest = await vi.waitFor(() => httpMock.expectOne('/api/admin/me'));
    meRequest.flush({ username: 'admin' });
    await navigation;
  });

  afterEach(() => httpMock.verify());

  function page(): HTMLElement {
    return harness.routeNativeElement as HTMLElement;
  }

  it('lists the versions of each vehicle type, marks the active one and links to each version', async () => {
    httpMock.expectOne('/api/admin/fare-matrices?vehicleType=TraditionalJeepney').flush(traditionalVersions);
    httpMock.expectOne('/api/admin/fare-matrices?vehicleType=ModernJeepney').flush(modernVersions);
    await harness.fixture.whenStable();

    const sections = Array.from(page().querySelectorAll('section'));
    expect(sections.map((section) => section.querySelector('h2')?.textContent?.trim())).toEqual([
      'Traditional Jeepney',
      'Modern Jeepney',
    ]);

    const traditionalItems = Array.from(sections[0].querySelectorAll('.version-list li'));
    expect(traditionalItems).toHaveLength(2);
    expect(traditionalItems[0].textContent).not.toContain('Active');
    expect(traditionalItems[0].textContent).toContain('LTFRB MC 2026-002 (sample)');
    expect(traditionalItems[1].textContent).toContain('Active');
    expect(traditionalItems.map((item) => item.querySelector('a')?.getAttribute('href'))).toEqual([
      '/admin/fare-matrices/12',
      '/admin/fare-matrices/9',
    ]);

    const modernItems = Array.from(sections[1].querySelectorAll('.version-list li'));
    expect(modernItems).toHaveLength(1);
    expect(modernItems[0].textContent).toContain('Active');
  });

  it('says so when a vehicle type has no versions yet', async () => {
    httpMock.expectOne('/api/admin/fare-matrices?vehicleType=TraditionalJeepney').flush(traditionalVersions);
    httpMock.expectOne('/api/admin/fare-matrices?vehicleType=ModernJeepney').flush([]);
    await harness.fixture.whenStable();

    const modernSection = page().querySelectorAll('section')[1];
    expect(modernSection.textContent).toContain('No fare matrix has been uploaded for Modern Jeepney yet.');
  });
});
