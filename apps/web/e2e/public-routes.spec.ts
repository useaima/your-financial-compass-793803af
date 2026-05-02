import { expect, test } from "@playwright/test";

test.describe("public routes", () => {
  test("landing page renders primary entry points", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("landing-hero")).toBeVisible();
    await expect(page.getByTestId("landing-primary-cta")).toBeVisible();
    await expect(page.getByTestId("landing-secondary-cta")).toBeVisible();
  });

  test("auth page defaults to sign-in and lets users switch modes", async ({ page }) => {
    await page.goto("/auth?mode=signin");

    await expect(page.getByTestId("auth-shell")).toBeVisible();
    await expect(page.getByTestId("auth-signin-form")).toBeVisible();

    await page.getByTestId("auth-switch-signup").click();
    await expect(page).toHaveURL(/\/auth\?mode=signup/);
    await expect(page.getByTestId("auth-signup-form")).toBeVisible();
  });

  test("protected routes redirect unauthenticated users to sign in", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/auth\?mode=signin/);
    await expect(page.getByTestId("auth-signin-form")).toBeVisible();
  });

  test("terms and privacy pages render", async ({ page }) => {
    for (const path of ["/terms", "/privacy"]) {
      await page.goto(path);
      await expect(page.locator("main, body")).toContainText(/./);
    }
  });

  test("help route redirects to the support center", async ({ page }) => {
    await page.goto("/help");
    await page.waitForURL(/support\.useaima\.com/, { waitUntil: "commit" });
    await expect(page).toHaveURL(/support\.useaima\.com/);
  });
});
