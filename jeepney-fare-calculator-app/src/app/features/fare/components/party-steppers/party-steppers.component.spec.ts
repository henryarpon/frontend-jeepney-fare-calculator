import { ComponentFixture, TestBed } from '@angular/core/testing';

import { initialParty, PartyCounts } from '../../models/fare.models';
import { PartySteppersComponent } from './party-steppers.component';

describe('PartySteppersComponent', () => {
  let fixture: ComponentFixture<PartySteppersComponent>;
  let emitted: PartyCounts[];

  async function render(party: PartyCounts): Promise<void> {
    fixture.componentRef.setInput('party', party);
    await fixture.whenStable();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(PartySteppersComponent);
    emitted = [];
    fixture.componentInstance.partyChange.subscribe((party) => emitted.push(party));
  });

  function stepper(label: string): HTMLElement {
    const steppers = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.stepper'));
    const found = steppers.find((element) => element.querySelector('.label')?.textContent?.trim() === label);
    if (!found) {
      throw new Error(`No stepper for ${label}`);
    }
    return found;
  }

  function minus(label: string): HTMLButtonElement {
    return stepper(label).querySelector<HTMLButtonElement>(`button[aria-label="Remove one ${label}"]`)!;
  }

  function plus(label: string): HTMLButtonElement {
    return stepper(label).querySelector<HTMLButtonElement>(`button[aria-label="Add one ${label}"]`)!;
  }

  function count(label: string): string | undefined {
    return stepper(label).querySelector('.count')?.textContent?.trim();
  }

  it('shows a stepper for each passenger type, starting at Regular 1 and the others 0', async () => {
    await render(initialParty);

    expect(['Regular', 'Student', 'Senior Citizen', 'PWD'].map(count)).toEqual(['1', '0', '0', '0']);
  });

  it('adds and removes one passenger of a type', async () => {
    await render({ Regular: 2, Student: 1, SeniorCitizen: 0, Pwd: 0 });

    plus('Senior Citizen').click();
    minus('Regular').click();

    expect(emitted).toEqual([
      { Regular: 2, Student: 1, SeniorCitizen: 1, Pwd: 0 },
      { Regular: 1, Student: 1, SeniorCitizen: 0, Pwd: 0 },
    ]);
  });

  it('disables minus for a type with no passengers', async () => {
    await render({ Regular: 1, Student: 0, SeniorCitizen: 2, Pwd: 0 });

    expect(minus('Student').disabled).toBe(true);
    expect(minus('PWD').disabled).toBe(true);
    expect(minus('Senior Citizen').disabled).toBe(false);
  });

  it('disables minus for the last passenger, so the Party never drops below 1', async () => {
    await render({ Regular: 0, Student: 1, SeniorCitizen: 0, Pwd: 0 });

    expect(minus('Student').disabled).toBe(true);
    expect(plus('Student').disabled).toBe(false);
  });

  it('disables every plus once the Party has 30 passengers', async () => {
    await render({ Regular: 20, Student: 10, SeniorCitizen: 0, Pwd: 0 });

    expect(['Regular', 'Student', 'Senior Citizen', 'PWD'].map((label) => plus(label).disabled)).toEqual([
      true,
      true,
      true,
      true,
    ]);
    expect(minus('Regular').disabled).toBe(false);
  });

  it('disables plus for a type at 30', async () => {
    await render({ Regular: 0, Student: 0, SeniorCitizen: 0, Pwd: 30 });

    expect(plus('PWD').disabled).toBe(true);
  });
});
