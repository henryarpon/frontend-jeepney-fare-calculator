import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FareBreakdown } from '../../models/fare.models';
import { FareBreakdownComponent } from './fare-breakdown.component';

// Sample amounts for tests only, not official LTFRB fares.
const mixedParty: FareBreakdown = {
  estimatedDistanceKm: 4.3,
  chargedDistanceKm: 5,
  lines: [
    { passengerType: 'Regular', regularFare: 14.75, discount: 0, farePerPassenger: 14.75, count: 2, subtotal: 29.5 },
    { passengerType: 'Student', regularFare: 14.75, discount: 2.95, farePerPassenger: 11.8, count: 1, subtotal: 11.8 },
    { passengerType: 'SeniorCitizen', regularFare: 14.75, discount: 2.95, farePerPassenger: 11.8, count: 1, subtotal: 11.8 },
  ],
  totalFare: 53.1,
  fareMatrixVersion: { id: 7, uploadedAt: '2026-11-03T04:00:00+00:00', note: 'LTFRB MC 2026-002 (sample)' },
  matrixExcerpt: [
    { distanceKm: 4, regularFare: 13, discountedFare: 10.4 },
    { distanceKm: 5, regularFare: 14.75, discountedFare: 11.8 },
    { distanceKm: 6, regularFare: 16.5, discountedFare: 13.2 },
  ],
};

describe('FareBreakdownComponent', () => {
  let fixture: ComponentFixture<FareBreakdownComponent>;

  async function render(breakdown: FareBreakdown, outOfDate = false): Promise<HTMLElement> {
    fixture = TestBed.createComponent(FareBreakdownComponent);
    fixture.componentRef.setInput('breakdown', breakdown);
    fixture.componentRef.setInput('vehicleType', 'TraditionalJeepney');
    fixture.componentRef.setInput('outOfDate', outOfDate);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  function text(element: Element | null | undefined): string {
    return (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
  }

  it('shows the Total Fare first, in pesos, as a guide for the whole Party', async () => {
    const element = await render(mixedParty);

    const total = element.querySelector('.total');
    expect(text(total)).toContain('₱53.10');
    expect(text(total)).toContain('4 passengers');
    expect(element.querySelector('section')?.firstElementChild).toBe(total);
    expect(text(element)).toContain('About what your party should pay');
  });

  it('shows the estimated and charged distance on one line', async () => {
    const element = await render(mixedParty);

    expect(text(element.querySelector('.distance'))).toBe('4.3 km · charged as 5 km');
  });

  it('always shows the estimated distance to 1 decimal place', async () => {
    const element = await render({ ...mixedParty, estimatedDistanceKm: 5, chargedDistanceKm: 5 });

    expect(text(element.querySelector('.distance'))).toBe('5.0 km · charged as 5 km');
  });

  it('shows a line per passenger type with its fares, count and subtotal', async () => {
    const element = await render(mixedParty);

    const lines = Array.from(element.querySelectorAll('.line')).map(text);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('Regular');
    expect(lines[0]).toContain('₱14.75 × 2');
    expect(lines[0]).toContain('₱29.50');
    expect(lines[1]).toContain('Student');
    expect(lines[1]).toContain('Regular Fare ₱14.75');
    expect(lines[1]).toContain('Discount ₱2.95');
    expect(lines[1]).toContain('₱11.80 × 1');
    expect(lines[1]).toContain('₱11.80');
    expect(lines[2]).toContain('Senior Citizen');
  });

  it('marks each line with its passenger type colour', async () => {
    const element = await render(mixedParty);

    const lines = Array.from(element.querySelectorAll('.line'));
    expect(lines.map((line) => line.classList.contains('mark-regular'))).toEqual([true, false, false]);
    expect(lines[1].classList).toContain('mark-student');
    expect(lines[2].classList).toContain('mark-senior-citizen');
  });

  it('shows the matrix excerpt with the charged row highlighted', async () => {
    const element = await render(mixedParty);

    const rows = Array.from(element.querySelectorAll('.excerpt tbody tr'));
    expect(rows.map((row) => text(row.querySelector('th')))).toEqual(['4 km', '5 km', '6 km']);
    expect(rows.map((row) => row.classList.contains('charged'))).toEqual([false, true, false]);
    expect(text(rows[1])).toContain('₱14.75');
    expect(text(rows[1])).toContain('₱11.80');
    expect(rows[1].getAttribute('aria-current')).toBe('true');
  });

  it('says which Fare Matrix Version was used', async () => {
    const element = await render(mixedParty);

    const version = text(element.querySelector('.version'));
    expect(version).toContain('Traditional Jeepney fare matrix');
    expect(version).toContain('uploaded 3 Nov 2026');
    expect(version).toContain('LTFRB MC 2026-002 (sample)');
  });

  it('dims the result and says it is out of date after the Party or Vehicle Type changes', async () => {
    const element = await render(mixedParty, true);

    expect(element.querySelector('section')?.classList).toContain('out-of-date');
    expect(text(element.querySelector('.out-of-date-notice'))).toContain('Tap Calculate');
  });

  it('shows no out-of-date notice for a fresh result', async () => {
    const element = await render(mixedParty);

    expect(element.querySelector('.out-of-date-notice')).toBeNull();
  });
});
