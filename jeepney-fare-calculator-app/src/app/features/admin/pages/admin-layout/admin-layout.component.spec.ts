import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from '../../../../app.routes';

describe('AdminLayoutComponent', () => {
  let httpMock: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();

    const navigation = harness.navigateByUrl('/admin');
    const meRequest = await vi.waitFor(() => httpMock.expectOne('/api/admin/me'));
    meRequest.flush({ username: 'admin' });
    await navigation;
  });

  afterEach(() => httpMock.verify());

  function clickSignOut(): void {
    const buttons = Array.from(
      (harness.routeNativeElement as HTMLElement).querySelectorAll('button'),
    );
    buttons.find((button) => button.textContent?.trim() === 'Sign out')!.click();
  }

  it('signs out and returns to the sign-in page', async () => {
    clickSignOut();

    const logoutRequest = httpMock.expectOne('/api/admin/logout');
    expect(logoutRequest.request.method).toBe('POST');
    logoutRequest.flush(null, { status: 204, statusText: 'No Content' });
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/admin/sign-in');
  });

  it('still leaves the admin area when the sign-out request fails', async () => {
    clickSignOut();

    httpMock
      .expectOne('/api/admin/logout')
      .flush(null, { status: 500, statusText: 'Internal Server Error' });
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/admin/sign-in');
  });
});
