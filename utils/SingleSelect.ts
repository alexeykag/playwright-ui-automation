import type { Locator, Page } from '@playwright/test';

export class SingleSelect {
  private readonly options: Locator;

  constructor(
    page: Page,
    readonly trigger: Locator,
  ) {
    this.options = page.getByRole('listbox').getByRole('option');
  }

  /** Opens the dropdown and picks the option with exactly this name. */
  async select(option: string): Promise<void> {
    await this.trigger.click();
    await this.options.filter({ hasText: new RegExp(`^${option}$`) }).click();
  }

  /** Opens the dropdown, returns all option names and closes it. */
  async optionNames(): Promise<string[]> {
    await this.trigger.click();
    await this.options.first().waitFor();
    const names = (await this.options.allInnerTexts()).map((name) => name.trim());
    await this.trigger.click();
    return names;
  }
}
