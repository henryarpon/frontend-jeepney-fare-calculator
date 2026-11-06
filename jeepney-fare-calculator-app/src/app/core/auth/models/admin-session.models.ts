/** Body of `POST /api/admin/login` (mirrors `AdministratorLoginRequest`). */
export interface AdministratorLoginRequest {
  username: string;
  password: string;
}

/** Body of `GET /api/admin/me` (mirrors `SignedInAdministrator`). */
export interface SignedInAdministrator {
  username: string;
}

/** What a sign-in attempt ended with. Other failures (API down, 500) are thrown as errors. */
export type SignInResult = 'signed-in' | 'wrong-credentials';
