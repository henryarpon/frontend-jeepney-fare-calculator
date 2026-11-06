import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from '../../app.routes';

describe('adminAuthGuard', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('sends a signed-out visitor from /admin to the sign-in page', async () => {
    const harness = await RouterTestingHarness.create();

    const navigation = harness.navigateByUrl('/admin');
    const meRequest = await vi.waitFor(() => httpMock.expectOne('/api/admin/me'));
    meRequest.flush(
      { title: 'Unauthorized', status: 401 },
      { status: 401, statusText: 'Unauthorized' },
    );
    await navigation;

    expect(TestBed.inject(Router).url).toBe('/admin/sign-in');
  });

  it('lets a signed-in Administrator into /admin', async () => {
    const harness = await RouterTestingHarness.create();

    const navigation = harness.navigateByUrl('/admin');
    const meRequest = await vi.waitFor(() => httpMock.expectOne('/api/admin/me'));
    meRequest.flush({ username: 'admin' });
    await navigation;

    expect(TestBed.inject(Router).url).toBe('/admin');
  });
});
