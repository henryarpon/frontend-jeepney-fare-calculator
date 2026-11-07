import { provideHttpClient } from '@angular/common/http';
import { HttpRequest } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from '../../../../app.routes';

const photonUrl = 'https://photon.komoot.io/api/';

function isPhotonSearch(request: HttpRequest<unknown>): boolean {
  return request.url === photonUrl;
}

/** A Photon GeoJSON feature, as Photon returns it. */
function photonFeature(name: string, city: string, lng: number, lat: number, countrycode = 'PH', osmId = 1) {
  return {
    geometry: { coordinates: [lng, lat] },
    properties: { osm_type: 'N', osm_id: osmId, countrycode, name, city },
  };
}

const cubao = photonFeature('Cubao', 'Quezon City', 121.05, 14.62, 'PH', 1);
const quiapo = photonFeature('Quiapo Church', 'Manila', 120.98, 14.6, 'PH', 2);

/** Sample figures only, not official LTFRB fares. */
const sampleBreakdown = {
  estimatedDistanceKm: 4.3,
  chargedDistanceKm: 5,
  lines: [{ passengerType: 'Regular', regularFare: 13, discount: 0, farePerPassenger: 13, count: 1, subtotal: 13 }],
  totalFare: 13,
  fareMatrixVersion: { id: 3, uploadedAt: '2026-11-06T08:30:00Z', note: 'Sample matrix' },
  matrixExcerpt: [
    { distanceKm: 4, regularFare: 13, discountedFare: 10.4 },
    { distanceKm: 5, regularFare: 13, discountedFare: 10.4 },
    { distanceKm: 6, regularFare: 14.75, discountedFare: 11.8 },
  ],
};

/** Lets real time pass, so the 300 ms search pause can run out. */
function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('FareCalculatorComponent', () => {
  let httpMock: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
  });

  afterEach(() => httpMock.verify());

  function page(): HTMLElement {
    return harness.routeNativeElement as HTMLElement;
  }

  function searchBox(field: 'origin' | 'destination'): HTMLInputElement {
    const input = page().querySelector<HTMLInputElement>(`#${field}-input`);
    if (!input) {
      throw new Error(`No search box for ${field}`);
    }
    return input;
  }

  async function type(field: 'origin' | 'destination', text: string): Promise<void> {
    const input = searchBox(field);
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();
  }

  async function expectPhotonSearch(): Promise<TestRequest> {
    return vi.waitFor(() => httpMock.expectOne(isPhotonSearch));
  }

  function suggestions(field: 'origin' | 'destination'): HTMLElement[] {
    return Array.from(page().querySelectorAll<HTMLElement>(`#${field}-suggestions [role="option"]`));
  }

  function suggestionTexts(field: 'origin' | 'destination'): string[] {
    return suggestions(field).map((option) => option.textContent?.trim() ?? '');
  }

  /** Searches for a place and picks the first suggestion. */
  async function choosePlace(field: 'origin' | 'destination', feature: ReturnType<typeof photonFeature>) {
    await type(field, feature.properties.name);
    (await expectPhotonSearch()).flush({ features: [feature] });
    await harness.fixture.whenStable();
    suggestions(field)[0].click();
    await harness.fixture.whenStable();
  }

  async function chooseBothPlaces(): Promise<void> {
    await choosePlace('origin', cubao);
    await choosePlace('destination', quiapo);
  }

  function calculateButton(): HTMLButtonElement {
    const button = page().querySelector<HTMLButtonElement>('button.calculate');
    if (!button) {
      throw new Error('No Calculate button');
    }
    return button;
  }

  /** Chooses both places, taps Calculate and answers with the sample breakdown. */
  async function calculateSampleTrip(): Promise<void> {
    await chooseBothPlaces();
    calculateButton().click();
    httpMock.expectOne('/api/fares/calculate').flush(sampleBreakdown);
    await harness.fixture.whenStable();
  }

  function outOfDateNotice(): HTMLElement | null {
    return page().querySelector('.out-of-date-notice');
  }

  it('searches for places only after 3 characters and a pause in typing, limited to the Philippines', async () => {
    await type('origin', 'Cu');
    await pause(400);
    httpMock.expectNone(isPhotonSearch);

    await type('origin', 'Cub');
    const search = await expectPhotonSearch();

    expect(search.request.params.get('q')).toBe('Cub');
    expect(search.request.params.get('bbox')).toBe('116.9,4.5,126.7,21.2');
    search.flush({ features: [] });
  });

  it('suggests only places in the Philippines', async () => {
    await type('origin', 'Cubao');
    (await expectPhotonSearch()).flush({
      features: [
        photonFeature('Cubao', 'Quezon City', 121.05, 14.62, 'PH', 1),
        photonFeature('Cubao Street', 'Kota Kinabalu', 116.07, 5.98, 'MY', 2),
      ],
    });
    await harness.fixture.whenStable();

    expect(suggestionTexts('origin')).toEqual(['Cubao, Quezon City']);
  });

  it('drops the suggestions for older text as soon as the commuter types more', async () => {
    await type('origin', 'Cubao');
    (await expectPhotonSearch()).flush({ features: [cubao] });
    await harness.fixture.whenStable();
    expect(suggestions('origin')).toHaveLength(1);

    await type('origin', 'Cubao Far');

    expect(page().querySelector('#origin-suggestions')?.hasAttribute('hidden')).toBe(true);
    expect(page().textContent).toContain('Searching…');
    (await expectPhotonSearch()).flush({ features: [] });
  });

  it('closes the suggestions on Escape and keeps the typed text', async () => {
    await type('origin', 'Cubao');
    (await expectPhotonSearch()).flush({ features: [cubao] });
    await harness.fixture.whenStable();

    const escape = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    searchBox('origin').dispatchEvent(escape);
    await harness.fixture.whenStable();

    expect(escape.defaultPrevented).toBe(true);
    expect(searchBox('origin').value).toBe('Cubao');
    expect(page().querySelector('#origin-suggestions')?.hasAttribute('hidden')).toBe(true);
  });

  it('does not show the old suggestions again when a chosen place is changed', async () => {
    await choosePlace('origin', cubao);

    page().querySelector<HTMLButtonElement>('button[aria-label="Change Origin"]')!.click();
    await harness.fixture.whenStable();

    expect(page().querySelector('#origin-suggestions')?.hasAttribute('hidden')).toBe(true);
  });

  it('can search again with the same text after a search fails', async () => {
    await type('origin', 'Cubao');
    (await expectPhotonSearch()).error(new ProgressEvent('error'));
    await harness.fixture.whenStable();
    expect(page().textContent).toContain("Couldn't search for places right now.");

    await type('origin', 'Cuba');
    await type('origin', 'Cubao');
    const retry = await expectPhotonSearch();

    expect(retry.request.params.get('q')).toBe('Cubao');
    retry.flush({ features: [cubao] });
  });

  it('prices the trip for the Party once Origin and Destination are chosen', async () => {
    await chooseBothPlaces();

    calculateButton().click();
    const calculation = httpMock.expectOne('/api/fares/calculate');

    expect(calculation.request.method).toBe('POST');
    expect(calculation.request.body).toEqual({
      vehicleType: 'TraditionalJeepney',
      origin: { lat: 14.62, lng: 121.05 },
      destination: { lat: 14.6, lng: 120.98 },
      party: [{ passengerType: 'Regular', count: 1 }],
    });

    calculation.flush(sampleBreakdown);
    await harness.fixture.whenStable();

    const result = page().querySelector('.breakdown');
    expect(result?.querySelector('.total-amount')?.textContent?.trim()).toBe('₱13.00');
    expect(result?.querySelector('.distance')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      '4.3 km · charged as 5 km',
    );
  });

  it('marks the fare out of date when the Party changes, without pricing it again', async () => {
    await calculateSampleTrip();

    page().querySelector<HTMLButtonElement>('button[aria-label="Add one Student"]')!.click();
    await harness.fixture.whenStable();

    expect(outOfDateNotice()).not.toBeNull();
    httpMock.expectNone('/api/fares/calculate');
  });

  it('marks the fare out of date when the Vehicle Type changes, without pricing it again', async () => {
    await calculateSampleTrip();

    const modern = page().querySelector<HTMLInputElement>('input[type="radio"][value="ModernJeepney"]')!;
    modern.click();
    await harness.fixture.whenStable();

    expect(outOfDateNotice()).not.toBeNull();
    expect(page().querySelector('.version')?.textContent).toContain('Traditional Jeepney fare matrix');
    httpMock.expectNone('/api/fares/calculate');
  });

  it('prices the trip again with the new Party when Calculate is tapped after a change', async () => {
    await calculateSampleTrip();
    page().querySelector<HTMLButtonElement>('button[aria-label="Add one Senior Citizen"]')!.click();
    await harness.fixture.whenStable();

    calculateButton().click();
    const calculation = httpMock.expectOne('/api/fares/calculate');
    expect(calculation.request.body.party).toEqual([
      { passengerType: 'Regular', count: 1 },
      { passengerType: 'SeniorCitizen', count: 1 },
    ]);
    calculation.flush(sampleBreakdown);
    await harness.fixture.whenStable();

    expect(outOfDateNotice()).toBeNull();
  });

  it('clears the fare and offers the search again when a place is changed', async () => {
    await calculateSampleTrip();

    page().querySelector<HTMLButtonElement>('button[aria-label="Change Destination"]')!.click();
    await harness.fixture.whenStable();

    expect(page().querySelector('.breakdown')).toBeNull();
    expect(searchBox('destination').value).toBe('');
    expect(calculateButton().disabled).toBe(true);
  });

  it('asks for both places before Calculate can be tapped', async () => {
    expect(calculateButton().disabled).toBe(true);
    expect(page().textContent).toContain('Choose an Origin and a Destination to calculate the fare.');

    await choosePlace('origin', cubao);
    expect(calculateButton().disabled).toBe(true);

    await choosePlace('destination', quiapo);
    expect(calculateButton().disabled).toBe(false);
    expect(page().textContent).not.toContain('Choose an Origin and a Destination');
  });

  it('shows that the fare is being calculated while waiting for the answer', async () => {
    await chooseBothPlaces();

    calculateButton().click();
    await harness.fixture.whenStable();

    expect(calculateButton().textContent?.trim()).toBe('Calculating…');
    expect(calculateButton().getAttribute('aria-busy')).toBe('true');

    httpMock.expectOne('/api/fares/calculate').flush(sampleBreakdown);
    await harness.fixture.whenStable();

    expect(calculateButton().textContent?.trim()).toBe('Calculate');
    expect(calculateButton().getAttribute('aria-busy')).toBeNull();
  });

  it('says so when the fare could not be calculated', async () => {
    await chooseBothPlaces();

    calculateButton().click();
    httpMock
      .expectOne('/api/fares/calculate')
      .flush(null, { status: 500, statusText: 'Internal Server Error' });
    await harness.fixture.whenStable();

    expect(page().querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      "Couldn't calculate the fare. Please try again.",
    );
    expect(page().querySelector('.breakdown')).toBeNull();
    expect(calculateButton().disabled).toBe(false);
  });
});
