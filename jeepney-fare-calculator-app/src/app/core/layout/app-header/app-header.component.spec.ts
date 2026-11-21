import { TestBed } from '@angular/core/testing';

import { AppHeaderComponent } from './app-header.component';

describe('AppHeaderComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => undefined }));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('names the app', async () => {
    const fixture = TestBed.createComponent(AppHeaderComponent);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Jeepney Fare Calculator');
  });

  it('switches to dark and then offers light', async () => {
    const fixture = TestBed.createComponent(AppHeaderComponent);
    await fixture.whenStable();
    const toggle = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button.theme-toggle',
    )!;
    expect(toggle.getAttribute('aria-label')).toBe('Switch to dark theme');

    toggle.click();
    await fixture.whenStable();

    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(toggle.getAttribute('aria-label')).toBe('Switch to light theme');
  });
});
