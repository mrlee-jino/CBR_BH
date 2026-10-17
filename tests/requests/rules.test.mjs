import { test } from "node:test";
import assert from "node:assert/strict";
import {
  allowedDecisions,
  calendarDate,
  manilaToday,
  requestFailure,
  requestStatus,
  viewingInstant,
} from "../../src/features/requests/rules.ts";

test("viewing inputs always mean Philippine time, including across the UTC date boundary", () => {
  assert.equal(viewingInstant("2026-10-18T00:30"), "2026-10-17T16:30:00.000Z");
  for (const value of [
    "2026-02-30T12:00",
    "2026-10-18T24:00",
    "2026-10-18T12:60",
    "2026-10-18T12:30Z",
    "bad",
  ])
    assert.equal(viewingInstant(value), null);
  assert.equal(calendarDate.safeParse("2026-02-30").success, false);
});
test("booking cancellation closes at Manila midnight on move-in day", () => {
  const before = new Date("2026-10-17T15:59:59Z");
  const after = new Date("2026-10-17T16:00:00Z");
  assert.equal(manilaToday(after), "2026-10-18");
  assert.deepEqual(allowedDecisions("booking", "approved", false, "2026-10-18", before), [
    "cancelled",
  ]);
  assert.deepEqual(allowedDecisions("booking", "approved", true, "2026-10-18", after), []);
});
test("pending requests display expired when their deadline or move-in date passes", () => {
  const now = new Date("2026-10-17T16:00:00Z");
  assert.equal(
    requestStatus(
      { status: "pending", expires_at: "2026-10-20T00:00:00Z", start_date: "2026-10-17" },
      now,
    ),
    "expired",
  );
  assert.equal(requestStatus({ status: "pending", expires_at: now.toISOString() }, now), "expired");
  assert.equal(
    requestStatus({ status: "approved", expires_at: now.toISOString() }, now),
    "approved",
  );
  assert.deepEqual(allowedDecisions("booking", "expired", false, "2026-10-17", now), ["withdrawn"]);
  assert.deepEqual(allowedDecisions("viewing", "expired", true, "2026-10-17", now), []);
});
test("viewing completion is owner-only and available only once the appointment begins", () => {
  const now = new Date("2026-10-18T02:00:00Z");
  assert.deepEqual(allowedDecisions("viewing", "accepted", true, "2026-10-18T03:00:00Z", now), [
    "cancelled",
  ]);
  assert.deepEqual(allowedDecisions("viewing", "accepted", true, now.toISOString(), now), [
    "completed",
  ]);
  assert.deepEqual(allowedDecisions("viewing", "accepted", false, now.toISOString(), now), []);
  assert.deepEqual(allowedDecisions("booking", "pending", true, "2026-10-20", now), [
    "approved",
    "rejected",
  ]);
});
test("conflicts explain recovery without disclosing raw database errors", () => {
  assert.match(requestFailure({ message: "OFFER_CHANGED" }), /latest offer/);
  assert.match(requestFailure({ message: "UNIT_UNAVAILABLE" }), /another unit or dates/);
  assert.match(
    requestFailure({ message: "private data", code: "23505" }),
    /already have a pending request/,
  );
  assert.doesNotMatch(requestFailure({ message: "private data" }), /private data/);
});
