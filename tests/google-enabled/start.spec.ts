import { expect, test } from "@playwright/test";

if (process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321")
  throw new Error(
    "OAuth initiation tests require isolated local Auth with Google enabled using dummy credentials.",
  );

for (const mode of ["login", "signup"]) {
  test(`${mode} starts Google with PKCE and a safe callback`, async ({ page, context }) => {
    // Stop at local authorization: never contact Google or use real credentials.
    await page.route("**/auth/v1/authorize?**", (route) =>
      route.fulfill({ contentType: "text/html", body: "Authorization captured locally" }),
    );
    await page.goto(mode === "login" ? "/login?next=https://evil.test" : "/signup");
    if (mode === "signup") {
      await page.getByRole("radio", { name: /^Property owner/ }).check();
      await page.getByRole("checkbox").check();
    }
    const request = page.waitForRequest(
      (request) => new URL(request.url()).pathname === "/auth/v1/authorize",
    );
    await page.getByRole("button", { name: "Continue with Google" }).click();
    const target = new URL((await request).url());
    expect(target.origin).toBe("http://127.0.0.1:54321");
    expect(target.searchParams.get("provider")).toBe("google");
    expect(target.searchParams.get("code_challenge_method")).toBe("s256");
    expect(target.searchParams.get("code_challenge")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const callback = new URL(target.searchParams.get("redirect_to")!);
    expect(callback.origin).toBe("http://127.0.0.1:3000");
    expect(callback.pathname).toBe("/auth/confirm");
    expect(callback.searchParams.get("next")).toBe(
      mode === "signup" ? "/become-an-owner" : "/dashboard",
    );
    expect((await context.cookies()).some((cookie) => cookie.name.includes("code-verifier"))).toBe(
      true,
    );
  });
}
