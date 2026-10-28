import type { Locator, Page, Response } from '@playwright/test';

const LOGIN_PATH = '/login';
const LOGIN_ENDPOINT = '/api/login';
const LOGIN_METHOD = 'POST';
const EMAIL_LABEL = 'Email Address';
const PASSWORD_LABEL = 'Password';
const SIGN_IN_BUTTON = 'Sign in';

/** Matches the response of the login API call. */
function isLoginResponse(response: Response): boolean {
  return (
    response.url().endsWith(LOGIN_ENDPOINT) &&
    response.request().method() === LOGIN_METHOD
  );
}

export interface Credentials {
  username: string;
  password: string;
}

export class LoginPage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;

  constructor(private readonly page: Page) {
    this.usernameInput = page.getByLabel(EMAIL_LABEL);
    this.passwordInput = page.getByLabel(PASSWORD_LABEL);
    this.signInButton = page.getByRole('button', { name: SIGN_IN_BUTTON });
  }

  /** Opens the login page. */
  async goto(): Promise<void> {
    await this.page.goto(LOGIN_PATH);
  }

  /** Signs in and returns the login API response. */
  async login({ username, password }: Credentials): Promise<Response> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    const response = this.page.waitForResponse(isLoginResponse);
    await this.signInButton.click();
    return response;
  }
}
