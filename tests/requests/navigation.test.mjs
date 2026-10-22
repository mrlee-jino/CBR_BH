import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNext } from "../../src/features/auth/redirect.ts";
test("auth return paths preserve listing requests without accepting outside or unexpected routes", () => {
  const unit = "12345678-1234-1234-1234-123456789abc";
  for (const path of [
    "/dashboard/requests",
    "/owner/requests",
    "/admin",
    "/admin/users",
    "/admin/reports",
    "/become-an-owner",
    `/properties/sunrise-rooms/request?kind=booking&unit=${unit}`,
    "/properties/sunrise-rooms/request?kind=viewing",
    `/dashboard/requests/${unit}?kind=viewing`,
  ])
    assert.equal(safeNext(path), path);
  for (const path of [
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/%2fevil",
    "/admin?next=https://evil.test",
    "/properties/rooms/request?kind=admin",
    "/properties/rooms/request?kind=booking&unit=no",
    "/properties/rooms/request?kind=viewing&kind=booking",
    "/dashboard#private",
    "/dashboard/../admin",
    null,
  ])
    assert.equal(safeNext(path), "/dashboard");
});
