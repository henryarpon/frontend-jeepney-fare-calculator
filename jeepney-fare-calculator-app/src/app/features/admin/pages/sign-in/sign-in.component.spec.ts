import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from '../../../../app.routes';

describe('SignInComponent', () => {
  let httpMock: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/sign-in');
  });

  afterEach(() => httpMock.verify());

  function page(): HTMLElement {
    return harness.routeNativeElement as HTMLElement;
  }

  function submitCredentials(username: string, password: string): void {
    const usernameInput = page().querySelector<HTMLInputElement>('input#username')!;
    const passwordInput = page().querySelector<HTMLInputElement>('input#password')!;
    usernameInput.value = username;
    usernameInput.dispatchEvent(new Event('input'));
    passwordInput.value = password;
    passwordInput.dispatchEvent(new Event('input'));
    page().querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
  }

  it('shows an error when the username or password is wrong', async () => {
    submitCredentials('admin', 'wrong-password');

    const loginRequest = httpMock.expectOne('/api/admin/login');
    expect(loginRequest.request.method).toBe('POST');
    expect(loginRequest.request.body).toEqual({ username: 'admin', password: 'wrong-password' });
    loginRequest.flush(
      { title: 'Wrong username or password.', status: 401 },
      { status: 401, statusText: 'Unauthorized' },
    );
    await harness.fixture.whenStable();

    expect(page().querySelector('[role="alert"]')?.textContent).toContain(
      'Wrong username or password.',
    );
  });

  it('takes the Administrator into /admin after a correct sign-in', async () => {
    submitCredentials('admin', 'correct-password');

    httpMock.expectOne('/api/admin/login').flush(null, { status: 204, statusText: 'No Content' });
    const meRequest = await vi.waitFor(() => httpMock.expectOne('/api/admin/me'));
    meRequest.flush({ username: 'admin' });
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/admin');
  });

  it('asks to try again when sign-in fails for another reason', async () => {
    submitCredentials('admin', 'correct-password');

    httpMock
      .expectOne('/api/admin/login')
      .flush(null, { status: 500, statusText: 'Internal Server Error' });
    await harness.fixture.whenStable();

    expect(page().querySelector('[role="alert"]')?.textContent).toContain(
      "Couldn't sign in right now. Please try again.",
    );
  });
});
