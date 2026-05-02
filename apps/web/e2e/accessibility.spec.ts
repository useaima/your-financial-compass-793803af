import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const publicRoutes = ["/", "/auth?mode=signin", "/auth?mode=signup", "/terms", "/privacy"];

async function expectNoSeriousAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();

  const serious = results.violations.filter((violation) =>
    violation.impact === "critical" || violation.impact === "serious",
  );

  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
}

test.describe("launch accessibility baseline", () => {
  for (const route of publicRoutes) {
    test(`${route} has no critical or serious axe violations`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator("body")).toContainText(/\S/);
      await expectNoSeriousAccessibilityViolations(page);
    });
  }

  test("protected shell redirect remains accessible", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth\?mode=signin/);
    await expectNoSeriousAccessibilityViolations(page);
  });
});
