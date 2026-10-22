import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import pg from "pg";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { localTestEnv } from "../../scripts/test-env.mjs";

const env = localTestEnv();
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const root = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.TEST_SUPABASE_SERVICE_KEY, options);
const anon = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  options,
);
const db = new pg.Client({ connectionString: env.TEST_DATABASE_URL });
const users = {};
let property, unit, bed;
const password = `Puyo-local-${randomUUID()}!`;
const nextMonth = new Date(Date.now() + 35 * 86400000).toISOString().slice(0, 10);
const later = new Date(Date.now() + 65 * 86400000).toISOString().slice(0, 10);
const afterLater = new Date(Date.now() + 95 * 86400000).toISOString().slice(0, 10);
function ok(response) {
  assert.equal(response.error, null, response.error?.message);
  return response.data;
}
function denied(response) {
  assert.ok(response.error, "Operation should be forbidden");
}
function totp(secret) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of secret.toUpperCase().replace(/=+$/, ""))
    bits += alphabet.indexOf(char).toString(2).padStart(5, "0");
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const hash = createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
  const offset = hash[19] & 15;
  return ((hash.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, "0");
}
async function request(
  client,
  target = unit,
  start = nextMonth,
  end = later,
  key = randomUUID(),
  version = 1,
) {
  return client.rpc("submit_booking", {
    p_unit_id: target,
    p_start_date: start,
    p_end_date: end,
    p_offer_version: version,
    p_message: "Local test request",
    p_consent: true,
    p_idempotency_key: key,
  });
}
async function published(owner, label) {
  const id = ok(
    await owner.rpc("save_property_draft", {
      p_property_id: null,
      p_title: label,
      p_slug: `test-${randomUUID()}`,
      p_property_type: "boarding_house",
      p_barangay: "Caasinan",
      p_description: "Local test only",
      p_street_address: "Private test address",
      p_contact_name: "Local Owner",
      p_contact_phone: "09123456789",
    }),
  );
  const target = ok(
    await owner.rpc("save_unit", {
      p_property_id: id,
      p_unit_id: null,
      p_label: "Room A · Bed 1",
      p_unit_type: "bedspace",
      p_monthly_rent: 2000,
      p_deposit_amount: 2000,
      p_terms: "Local terms",
    }),
  );
  ok(await owner.rpc("submit_property", { p_property_id: id }));
  ok(
    await users.admin.client.rpc("moderate_property", {
      p_property_id: id,
      p_decision: "published",
      p_reason: "Local reviewed fixture",
    }),
  );
  return { id, unit: target };
}

before(async () => {
  await db.connect();
  for (const name of ["renterA", "renterB", "ownerA", "ownerB", "admin", "unverified"]) {
    const email = `puyo-db-${name}-${randomUUID()}@example.test`;
    const user = ok(
      await root.auth.admin.createUser({
        email,
        password,
        email_confirm: name !== "unverified",
        user_metadata: { display_name: name, role: "admin" },
      }),
    ).user;
    const client = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      options,
    );
    if (name !== "unverified") ok(await client.auth.signInWithPassword({ email, password }));
    users[name] = { id: user.id, client, email };
  }
  await db.query("insert into public.account_roles(user_id,role) values($1,'admin')", [
    users.admin.id,
  ]);
  const factor = ok(
    await users.admin.client.auth.mfa.enroll({ factorType: "totp", friendlyName: "Database test" }),
  );
  ok(
    await users.admin.client.auth.mfa.challengeAndVerify({
      factorId: factor.id,
      code: totp(factor.totp.secret),
    }),
  );
  ok(await users.ownerA.client.rpc("activate_owner"));
  ok(await users.ownerB.client.rpc("activate_owner"));
  ({ id: property, unit } = await published(users.ownerA.client, "Local public fixture"));
  ({ unit: bed } = await published(users.ownerA.client, "Separate bed fixture"));
});
after(async () => {
  await db.end();
});

test("signup never trusts user metadata for roles; own profiles are private", async () => {
  assert.deepEqual(
    ok(await users.renterA.client.from("account_roles").select("role")).map((row) => row.role),
    ["renter"],
  );
  assert.equal(ok(await users.renterA.client.from("profiles").select("id")).length, 1);
  assert.equal(
    ok(await users.renterB.client.from("profiles").select("id").eq("id", users.renterA.id)).length,
    0,
  );
  denied(await anon.from("profiles").select("*"));
  denied(
    await users.renterA.client
      .from("account_roles")
      .insert({ user_id: users.renterA.id, role: "admin" }),
  );
  denied(
    await users.renterA.client
      .from("profiles")
      .update({ account_status: "active" })
      .eq("id", users.renterA.id),
  );
});
test("profile updates and idempotent owner activation have explicit field boundaries", async () => {
  ok(
    await users.renterA.client.rpc("update_my_profile", {
      p_display_name: "Renter A",
      p_phone: "09123456789",
    }),
  );
  assert.equal(
    ok(await users.renterA.client.from("profile_contacts").select("phone").single()).phone,
    "09123456789",
  );
  denied(
    await users.renterB.client
      .from("profile_contacts")
      .update({ phone: "09123456789" })
      .eq("user_id", users.renterA.id),
  );
  ok(await users.ownerA.client.rpc("activate_owner"));
  assert.equal(
    ok(await users.ownerA.client.from("account_roles").select("role").eq("role", "owner")).length,
    1,
  );
  denied(await anon.rpc("activate_owner"));
});
test("public browsing exposes only published projections, not base or private rows", async () => {
  const rows = ok(await anon.rpc("browse_properties"));
  assert.ok(rows.some((row) => row.id === property));
  for (const row of rows) {
    assert.equal(row.owner_id, undefined);
    assert.equal(row.street_address, undefined);
    assert.equal(row.verified_by, undefined);
  }
  denied(await anon.from("properties").select("*"));
  denied(await anon.from("property_private_details").select("*"));
  assert.equal(
    ok(await users.ownerB.client.from("properties").select("id").eq("id", property)).length,
    0,
  );
  denied(
    await users.ownerB.client.rpc("save_unit", {
      p_property_id: property,
      p_unit_id: unit,
      p_label: "Hijack",
      p_unit_type: "bedspace",
      p_monthly_rent: 1,
      p_deposit_amount: 0,
      p_terms: "",
    }),
  );
});
test("admin requires database role plus MFA; ordinary JWT metadata cannot moderate", async () => {
  denied(
    await users.renterA.client.rpc("moderate_property", {
      p_property_id: property,
      p_decision: "suspended",
      p_reason: "Forged",
    }),
  );
  const weakAdmin = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    options,
  );
  ok(await weakAdmin.auth.signInWithPassword({ email: users.admin.email, password }));
  assert.equal(ok(await weakAdmin.from("audit_events").select("id")).length, 0);
  denied(
    await weakAdmin.rpc("suspend_account", {
      p_user_id: users.renterA.id,
      p_suspended: true,
      p_reason: "Must require MFA",
    }),
  );
  denied(
    await users.ownerA.client
      .from("properties")
      .update({ status: "published", verified_by: users.ownerA.id })
      .eq("id", property),
  );
});
test("favorites are scoped to the caller and published properties", async () => {
  ok(
    await users.renterA.client
      .from("favorites")
      .insert({ user_id: users.renterA.id, property_id: property }),
  );
  assert.equal(ok(await users.renterB.client.from("favorites").select("*")).length, 0);
  denied(
    await users.renterB.client
      .from("favorites")
      .insert({ user_id: users.renterA.id, property_id: property }),
  );
  ok(await users.renterA.client.from("favorites").delete().eq("property_id", property));
});
test("concurrent overlapping approvals confirm exactly one request and retain the loser pending", async () => {
  const a = ok(await request(users.renterA.client));
  const b = ok(await request(users.renterB.client));
  const approvals = await Promise.all([
    users.ownerA.client.rpc("approve_booking", { p_request_id: a }),
    users.ownerA.client.rpc("approve_booking", { p_request_id: b }),
  ]);
  assert.equal(approvals.filter((result) => !result.error).length, 1);
  assert.ok(approvals.find((result) => result.error).error.message.includes("UNIT_UNAVAILABLE"));
  const records = ok(
    await users.ownerA.client.from("booking_requests").select("id,status").in("id", [a, b]),
  );
  assert.equal(records.filter((row) => row.status === "approved").length, 1);
  assert.equal(records.filter((row) => row.status === "pending").length, 1);
  const winner = records.find((row) => row.status === "approved").id;
  const firstAllocation = ok(approvals.find((result) => !result.error));
  assert.equal(
    ok(await users.ownerA.client.rpc("approve_booking", { p_request_id: winner })),
    firstAllocation,
  );
  const loser = records.find((row) => row.status === "pending").id;
  denied(await users.ownerB.client.rpc("approve_booking", { p_request_id: loser }));
  ok(
    await users.ownerA.client.rpc("decide_booking", {
      p_request_id: winner,
      p_decision: "cancelled",
      p_reason: "Test cancellation",
    }),
  );
  ok(await users.ownerA.client.rpc("approve_booking", { p_request_id: loser }));
  ok(
    await users.ownerA.client.rpc("decide_booking", {
      p_request_id: loser,
      p_decision: "cancelled",
      p_reason: "Test cleanup",
    }),
  );
});
test("request replay is idempotent; consent, dates, owner self-booking, and raw writes are guarded", async () => {
  const key = randomUUID();
  const first = ok(await request(users.renterA.client, bed, nextMonth, later, key));
  assert.equal(ok(await request(users.renterA.client, bed, nextMonth, later, key)), first);
  denied(
    await users.renterA.client
      .from("booking_requests")
      .update({ status: "approved" })
      .eq("id", first),
  );
  assert.equal(ok(await users.renterB.client.from("unit_allocations").select("*")).length, 0);
  denied(await request(users.ownerA.client, bed));
  denied(await request(users.renterB.client, bed, later, nextMonth));
  denied(
    await users.renterB.client.rpc("submit_booking", {
      p_unit_id: bed,
      p_start_date: nextMonth,
      p_end_date: later,
      p_offer_version: 1,
      p_message: "",
      p_consent: false,
      p_idempotency_key: randomUUID(),
    }),
  );
  ok(
    await users.renterA.client.rpc("decide_booking", {
      p_request_id: first,
      p_decision: "withdrawn",
      p_reason: "",
    }),
  );
});
test("adjacent allocations and separate bedspaces succeed; indefinite occupancy and blocks prevent overlap", async () => {
  const first = ok(
    await users.ownerA.client.rpc("create_manual_allocation", {
      p_unit_id: bed,
      p_start_date: nextMonth,
      p_end_date: later,
      p_kind: "manual_occupancy",
      p_note: "",
    }),
  );
  ok(
    await users.ownerA.client.rpc("create_manual_allocation", {
      p_unit_id: bed,
      p_start_date: later,
      p_end_date: afterLater,
      p_kind: "blocked",
      p_note: "",
    }),
  );
  denied(await request(users.renterA.client, bed, nextMonth, later));
  assert.equal(
    ok(
      await anon.rpc("unit_is_available", {
        p_unit_id: bed,
        p_start_date: nextMonth,
        p_end_date: later,
      }),
    ),
    false,
  );
  const other = await published(users.ownerA.client, "Indefinite fixture");
  ok(
    await users.ownerA.client.rpc("create_manual_allocation", {
      p_unit_id: other.unit,
      p_start_date: nextMonth,
      p_end_date: null,
      p_kind: "manual_occupancy",
      p_note: "",
    }),
  );
  denied(await request(users.renterB.client, other.unit, afterLater, null));
  ok(
    await users.ownerA.client.rpc("end_allocation", { p_allocation_id: first, p_end_date: later }),
  );
  assert.equal(
    ok(
      await users.ownerA.client
        .from("unit_allocations")
        .select("released_at")
        .eq("id", first)
        .single(),
    ).released_at,
    null,
  );
});
test("editing an offer pauses the listing, and stale offers cannot be approved after re-review", async () => {
  const target = await published(users.ownerA.client, "Offer change fixture");
  const booking = ok(await request(users.renterA.client, target.unit));
  ok(
    await users.ownerA.client.rpc("save_unit", {
      p_property_id: target.id,
      p_unit_id: target.unit,
      p_label: "Room A · Bed 1",
      p_unit_type: "bedspace",
      p_monthly_rent: 2400,
      p_deposit_amount: 2400,
      p_terms: "New terms",
    }),
  );
  assert.ok(!ok(await anon.rpc("browse_properties")).some((row) => row.id === target.id));
  denied(await users.ownerA.client.rpc("approve_booking", { p_request_id: booking }));
  ok(await users.ownerA.client.rpc("submit_property", { p_property_id: target.id }));
  ok(
    await users.admin.client.rpc("moderate_property", {
      p_property_id: target.id,
      p_decision: "published",
      p_reason: "Re-reviewed",
    }),
  );
  const result = await users.ownerA.client.rpc("approve_booking", { p_request_id: booking });
  denied(result);
  assert.match(result.error.message, /OFFER_CHANGED/);
});
test("contact disclosure is consented, participant-only, and withdrawn after cancellation", async () => {
  const target = await published(users.ownerA.client, "Contact fixture");
  denied(await users.renterA.client.rpc("get_property_contact", { p_property_id: target.id }));
  const booking = ok(await request(users.renterA.client, target.unit));
  assert.equal(
    ok(
      await users.ownerA.client.rpc("get_requester_contact", {
        p_request_id: booking,
        p_kind: "booking",
      }),
    )[0].phone,
    "09123456789",
  );
  denied(
    await users.ownerB.client.rpc("get_requester_contact", {
      p_request_id: booking,
      p_kind: "booking",
    }),
  );
  ok(await users.ownerA.client.rpc("approve_booking", { p_request_id: booking }));
  assert.equal(
    ok(await users.renterA.client.rpc("get_property_contact", { p_property_id: target.id }))[0]
      .street_address,
    "Private test address",
  );
  denied(await users.renterB.client.rpc("get_property_contact", { p_property_id: target.id }));
  ok(
    await users.renterA.client.rpc("decide_booking", {
      p_request_id: booking,
      p_decision: "cancelled",
      p_reason: "Changed plans",
    }),
  );
  denied(await users.renterA.client.rpc("get_property_contact", { p_property_id: target.id }));
});
test("suspension immediately blocks mutations and removes public owner listings with existing sessions", async () => {
  const target = await published(users.ownerB.client, "Suspension fixture");
  ok(
    await users.admin.client.rpc("suspend_account", {
      p_user_id: users.ownerB.id,
      p_suspended: true,
      p_reason: "Local test suspension",
    }),
  );
  const suspensionAudit = await db.query(
    "select metadata->>'reason' as reason from public.audit_events where entity_id=$1 and action='account.suspended' order by occurred_at desc limit 1",
    [users.ownerB.id],
  );
  assert.equal(suspensionAudit.rows[0].reason, "Local test suspension");
  denied(
    await users.admin.client.rpc("admin_set_account_status", {
      p_user_id: users.ownerB.id,
      p_suspended: true,
      p_reason: "Duplicate suspension",
    }),
  );
  denied(
    await users.admin.client.rpc("admin_set_account_status", {
      p_user_id: users.admin.id,
      p_suspended: true,
      p_reason: "Cannot suspend self",
    }),
  );
  denied(
    await users.admin.client.rpc("admin_set_account_status", {
      p_user_id: randomUUID(),
      p_suspended: true,
      p_reason: "Missing account",
    }),
  );
  denied(
    await users.admin.client.rpc("admin_set_account_status", {
      p_user_id: users.ownerB.id,
      p_suspended: null,
      p_reason: "Missing status",
    }),
  );
  denied(
    await users.renterA.client.rpc("admin_set_account_status", {
      p_user_id: users.ownerB.id,
      p_suspended: false,
      p_reason: "Unauthorized restore",
    }),
  );
  denied(await users.ownerB.client.rpc("activate_owner"));
  assert.ok(!ok(await anon.rpc("browse_properties")).some((row) => row.id === target.id));
  denied(await request(users.renterB.client, target.unit));
  ok(
    await users.admin.client.rpc("suspend_account", {
      p_user_id: users.ownerB.id,
      p_suspended: false,
      p_reason: "Local test restore",
    }),
  );
  const restoreAudit = await db.query(
    "select metadata->>'reason' as reason,actor_id from public.audit_events where entity_id=$1 and action='account.restored' order by occurred_at desc limit 1",
    [users.ownerB.id],
  );
  assert.equal(restoreAudit.rows[0].reason, "Local test restore");
  assert.equal(restoreAudit.rows[0].actor_id, users.admin.id);
});
test("all application tables have RLS; private helpers and uploads are inaccessible", async () => {
  const tables = await db.query(
    "select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity",
  );
  assert.deepEqual(tables.rows, []);
  const bypass = await db.query(
    "select has_function_privilege('authenticated','private.require_account()','execute') as allowed",
  );
  assert.equal(bypass.rows[0].allowed, false);
  denied(
    await users.renterA.client.storage
      .from("property-photos")
      .upload(`${users.renterA.id}/${property}/invalid.jpg`, new Uint8Array([1, 2, 3]), {
        contentType: "image/jpeg",
      }),
  );
});

test("viewing decisions disclose the address only to participants and never reserve inventory", async () => {
  const target = await published(users.ownerA.client, "Viewing fixture");
  const viewing = ok(
    await users.renterA.client.rpc("submit_viewing", {
      p_property_id: target.id,
      p_requested_at: new Date(Date.now() + 86400000).toISOString(),
      p_message: "Local viewing",
      p_consent: true,
    }),
  );
  denied(
    await users.ownerB.client.rpc("decide_viewing", {
      p_request_id: viewing,
      p_decision: "accepted",
      p_reason: "",
    }),
  );
  denied(await users.renterA.client.rpc("get_property_contact", { p_property_id: target.id }));
  ok(
    await users.ownerA.client.rpc("decide_viewing", {
      p_request_id: viewing,
      p_decision: "accepted",
      p_reason: "Confirmed time",
    }),
  );
  assert.equal(
    ok(await users.renterA.client.rpc("get_property_contact", { p_property_id: target.id })).length,
    1,
  );
  assert.equal(
    ok(await users.ownerA.client.from("unit_allocations").select("id").eq("unit_id", target.unit))
      .length,
    0,
  );
  ok(
    await users.renterA.client.rpc("decide_viewing", {
      p_request_id: viewing,
      p_decision: "cancelled",
      p_reason: "New plan",
    }),
  );
  denied(await users.renterA.client.rpc("get_property_contact", { p_property_id: target.id }));
});

test("expired pending requests cannot be approved or expose contacts and can be replaced", async () => {
  const target = await published(users.ownerA.client, "Expiry fixture");
  const booking = ok(await request(users.renterA.client, target.unit));
  await db.query(
    "update public.booking_requests set expires_at=now()-interval '1 minute' where id=$1",
    [booking],
  );
  denied(
    await users.ownerA.client.rpc("get_requester_contact", {
      p_request_id: booking,
      p_kind: "booking",
    }),
  );
  const decision = await users.ownerA.client.rpc("approve_booking", { p_request_id: booking });
  denied(decision);
  assert.match(decision.error.message, /REQUEST_EXPIRED/);
  const replacement = ok(await request(users.renterA.client, target.unit));
  assert.notEqual(replacement, booking);
  await assert.rejects(
    db.query("update public.booking_requests set status='approved' where id=$1", [replacement]),
    /INVALID_BOOKING_ALLOCATION/,
  );
});

test("reports are private to the reporter/admin, and future blocks can only be released by their owner", async () => {
  const target = await published(users.ownerA.client, "Report fixture");
  const report = ok(
    await users.renterA.client.rpc("submit_report", {
      p_property_id: target.id,
      p_reason: "Sample concern",
      p_detail: "Local test",
    }),
  );
  assert.equal(
    ok(await users.ownerA.client.from("reports").select("id").eq("id", report)).length,
    0,
  );
  denied(
    await users.ownerA.client.rpc("resolve_report", { p_report_id: report, p_status: "dismissed" }),
  );
  ok(await users.admin.client.rpc("resolve_report", { p_report_id: report, p_status: "resolved" }));
  const block = ok(
    await users.ownerA.client.rpc("create_manual_allocation", {
      p_unit_id: target.unit,
      p_start_date: nextMonth,
      p_end_date: later,
      p_kind: "blocked",
      p_note: "",
    }),
  );
  denied(await users.ownerB.client.rpc("release_future_block", { p_allocation_id: block }));
  ok(await users.ownerA.client.rpc("release_future_block", { p_allocation_id: block }));
  assert.equal(
    ok(
      await anon.rpc("unit_is_available", {
        p_unit_id: target.unit,
        p_start_date: nextMonth,
        p_end_date: later,
      }),
    ),
    true,
  );
});

test("public listing search filters individual unit offers and never exposes private fields", async () => {
  const target = await published(users.ownerA.client, `Search ${randomUUID()}`);
  const slug = ok(
    await users.ownerA.client.from("properties").select("slug").eq("id", target.id).single(),
  ).slug;
  ok(
    await users.ownerA.client.rpc("save_unit", {
      p_property_id: target.id,
      p_unit_id: null,
      p_label: "Private room",
      p_unit_type: "private_room",
      p_monthly_rent: 9000,
      p_deposit_amount: 9000,
      p_terms: "",
    }),
  );
  assert.equal(
    ok(await anon.rpc("get_public_listing", { p_slug: slug })).length,
    0,
    "Editing must remove publication immediately",
  );
  ok(await users.ownerA.client.rpc("submit_property", { p_property_id: target.id }));
  const version = ok(
    await users.ownerA.client.from("properties").select("version").eq("id", target.id).single(),
  ).version;
  ok(
    await users.admin.client.rpc("review_listing", {
      p_property_id: target.id,
      p_expected_version: version,
      p_decision: "published",
      p_reason: "Property and contact independently checked",
    }),
  );
  const filters = { p_query: slug, p_unit_type: "private_room", p_max: 3000 };
  // Search by the exact title, not the slug (which is intentionally not indexed here).
  const title = ok(
    await users.ownerA.client.from("properties").select("title").eq("id", target.id).single(),
  ).title;
  assert.equal(
    ok(await anon.rpc("search_listings", { ...filters, p_query: title })).length,
    0,
    "A cheap bed must not make an expensive room pass the budget",
  );
  const rows = ok(
    await anon.rpc("search_listings", { p_query: title, p_unit_type: "private_room", p_min: 8000 }),
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].monthly_rent, 9000);
  assert.deepEqual(
    Object.keys(rows[0]).sort(),
    [
      "id",
      "slug",
      "title",
      "description",
      "property_type",
      "barangay",
      "city",
      "monthly_rent",
    ].sort(),
  );
  assert.equal(ok(await anon.rpc("get_public_listing", { p_slug: slug }))[0].id, target.id);
  assert.equal(
    ok(await users.ownerA.client.rpc("get_my_listing_reviews", { p_property_id: target.id }))[0]
      .reason,
    "Property and contact independently checked",
  );
  denied(await anon.rpc("get_my_listing_reviews", { p_property_id: target.id }));
  denied(await users.ownerB.client.rpc("get_my_listing_reviews", { p_property_id: target.id }));
  denied(
    await users.renterA.client.rpc("review_listing", {
      p_property_id: target.id,
      p_expected_version: version,
      p_decision: "suspended",
      p_reason: "Unauthorized review",
    }),
  );
  const stale = await users.admin.client.rpc("review_listing", {
    p_property_id: target.id,
    p_expected_version: version - 1,
    p_decision: "suspended",
    p_reason: "Old browser tab",
  });
  assert.match(stale.error.message, /STALE_REVIEW/);
  assert.equal(ok(await anon.rpc("get_public_listing", { p_slug: slug })).length, 1);
  ok(
    await users.admin.client.rpc("review_listing", {
      p_property_id: target.id,
      p_expected_version: version,
      p_decision: "suspended",
      p_reason: "Suspended for follow-up review",
    }),
  );
  assert.equal(ok(await anon.rpc("get_public_listing", { p_slug: slug })).length, 0);
});

test("photos require server processing, owner authorization, separate moderation, and private delivery", async () => {
  const target = await published(users.ownerA.client, "Photo privacy fixture");
  denied(
    await users.ownerB.client.rpc("reserve_property_photo", {
      p_property_id: target.id,
      p_alt_text: "Unauthorized",
    }),
  );
  const photo = ok(
    await users.ownerA.client.rpc("reserve_property_photo", {
      p_property_id: target.id,
      p_alt_text: "Private room photo",
    }),
  )[0];
  const bytes = await sharp({
    create: { width: 32, height: 16, channels: 3, background: "#b39ddb" },
  })
    .webp()
    .toBuffer();
  denied(
    await users.ownerA.client.storage
      .from("property-photos")
      .upload(photo.storage_path, bytes, { contentType: "image/webp" }),
  );
  const complete = {
    p_photo_id: photo.id,
    p_actor_id: users.ownerA.id,
    p_width: 32,
    p_height: 16,
    p_byte_size: bytes.length,
  };
  denied(await users.ownerA.client.rpc("complete_property_photo", complete));
  denied(await root.rpc("complete_property_photo", complete)); // No object has been stored.
  ok(
    await root.storage
      .from("property-photos")
      .upload(photo.storage_path, bytes, { contentType: "image/webp" }),
  );
  denied(await root.rpc("complete_property_photo", { ...complete, p_actor_id: users.ownerB.id }));
  ok(await root.rpc("complete_property_photo", complete));
  assert.equal(
    ok(await users.ownerA.client.from("properties").select("status").eq("id", target.id).single())
      .status,
    "paused",
  );
  assert.equal(
    ok(await users.ownerA.client.rpc("get_photo_access", { p_photo_id: photo.id })),
    photo.storage_path,
  );
  assert.equal(ok(await anon.rpc("get_photo_access", { p_photo_id: photo.id })), null);
  assert.equal(
    ok(await users.ownerB.client.rpc("get_photo_access", { p_photo_id: photo.id })),
    null,
  );
  assert.equal(ok(await anon.rpc("get_property_photos", { p_property_id: target.id })).length, 0);
  ok(await users.ownerA.client.rpc("submit_property", { p_property_id: target.id }));
  let version = ok(
    await users.ownerA.client.from("properties").select("version").eq("id", target.id).single(),
  ).version;
  const premature = await users.admin.client.rpc("review_listing", {
    p_property_id: target.id,
    p_expected_version: version,
    p_decision: "published",
    p_reason: "Ready to publish",
  });
  assert.match(premature.error.message, /PHOTOS_NEED_REVIEW/);
  denied(
    await users.ownerA.client.rpc("review_property_photo", {
      p_photo_id: photo.id,
      p_decision: "approved",
      p_note: "Self approval is forbidden",
    }),
  );
  ok(
    await users.admin.client.rpc("review_property_photo", {
      p_photo_id: photo.id,
      p_decision: "approved",
      p_note: "Clear property photo checked",
    }),
  );
  version = ok(
    await users.ownerA.client.from("properties").select("version").eq("id", target.id).single(),
  ).version;
  ok(
    await users.admin.client.rpc("review_listing", {
      p_property_id: target.id,
      p_expected_version: version,
      p_decision: "published",
      p_reason: "Property and photos reviewed",
    }),
  );
  assert.equal(
    ok(await anon.rpc("get_property_photos", { p_property_id: target.id }))[0].id,
    photo.id,
  );
  assert.equal(
    ok(await anon.rpc("get_listing_covers", { p_property_ids: [target.id] }))[0].id,
    photo.id,
  );
  assert.equal(
    ok(await anon.rpc("get_photo_access", { p_photo_id: photo.id })),
    photo.storage_path,
  );
  denied(await anon.storage.from("property-photos").download(photo.storage_path));
  ok(
    await users.ownerA.client.rpc("edit_property_photo", {
      p_photo_id: photo.id,
      p_action: "cover",
    }),
  );
  assert.equal(
    ok(await anon.rpc("get_photo_access", { p_photo_id: photo.id })),
    null,
    "Pausing must revoke public delivery immediately",
  );
  ok(
    await users.ownerA.client.rpc("edit_property_photo", {
      p_photo_id: photo.id,
      p_action: "remove",
    }),
  );
  assert.equal(
    ok(await users.ownerA.client.rpc("get_photo_access", { p_photo_id: photo.id })),
    null,
  );
  denied(await users.ownerA.client.rpc("get_photo_cleanup_batch"));
  assert.ok(
    ok(await users.admin.client.rpc("get_photo_cleanup_batch")).some((p) => p.id === photo.id),
  );
});

test("photo reservations enforce per-property capacity and per-owner hourly quotas", async () => {
  const target = await published(users.ownerB.client, "Photo quota fixture");
  for (let i = 0; i < 12; i++)
    ok(
      await users.ownerB.client.rpc("reserve_property_photo", {
        p_property_id: target.id,
        p_alt_text: `Room photo ${i}`,
      }),
    );
  assert.match(
    (
      await users.ownerB.client.rpc("reserve_property_photo", {
        p_property_id: target.id,
        p_alt_text: "Thirteenth photo",
      })
    ).error.message,
    /PHOTO_LIMIT/,
  );
  await db.query(
    "insert into public.audit_events(actor_id,action,entity_type,entity_id) select $1,'photo.reserved','property',$2 from generate_series(1,8)",
    [users.ownerB.id, target.id],
  );
  const second = await published(users.ownerB.client, "Hourly quota fixture");
  assert.match(
    (
      await users.ownerB.client.rpc("reserve_property_photo", {
        p_property_id: second.id,
        p_alt_text: "Too many attempts",
      })
    ).error.message,
    /PHOTO_RATE_LIMIT/,
  );
});

test("incremental SQL Editor upgrade preserves existing listings and records only migration 004", async () => {
  const source = readFileSync("supabase/upgrade-listings.sql", "utf8");
  const sql = source.slice(source.indexOf("begin;\n") + 7, source.lastIndexOf("commit;"));
  await db.query("begin");
  try {
    const before = await db.query("select count(*)::int as count from public.properties");
    await db.query(
      "drop function public.search_listings(text,text,text,numeric,numeric,text,integer,integer), public.get_public_listing(text), public.review_listing(uuid,integer,text,text), public.get_my_listing_reviews(uuid); delete from supabase_migrations.schema_migrations where version='20261017000400'",
    );
    await db.query(sql);
    const after = await db.query("select count(*)::int as count from public.properties");
    assert.equal(after.rows[0].count, before.rows[0].count);
    const versions = await db.query(
      "select count(*)::int as count from supabase_migrations.schema_migrations where version='20261017000400'",
    );
    assert.equal(versions.rows[0].count, 1);
    const grants = await db.query(
      "select has_function_privilege('anon','public.get_public_listing(text)','execute') as public_read, has_function_privilege('anon','public.review_listing(uuid,integer,text,text)','execute') as public_review",
    );
    assert.equal(grants.rows[0].public_read, true);
    assert.equal(grants.rows[0].public_review, false);
  } finally {
    await db.query("rollback");
  }
});

test("incremental request upgrade preserves requests and restricts anonymous execution", async () => {
  const source = readFileSync("supabase/upgrade-requests.sql", "utf8");
  const sql = source.slice(source.indexOf("begin;\n") + 7, source.lastIndexOf("commit;"));
  await db.query("begin");
  try {
    const before = await db.query("select count(*)::int as count from public.booking_requests");
    await db.query(
      "drop function public.get_request_context(uuid[],uuid[]); delete from supabase_migrations.schema_migrations where version='20261017145319'",
    );
    await db.query(sql);
    const after = await db.query("select count(*)::int as count from public.booking_requests");
    assert.equal(after.rows[0].count, before.rows[0].count);
    const grants = await db.query(
      "select has_function_privilege('anon','public.get_request_context(uuid[],uuid[])','execute') as anon_access, has_function_privilege('authenticated','public.get_request_context(uuid[],uuid[])','execute') as authenticated_access",
    );
    assert.equal(grants.rows[0].anon_access, false);
    assert.equal(grants.rows[0].authenticated_access, true);
    assert.equal(
      (
        await db.query(
          "select version from supabase_migrations.schema_migrations where version='20261017145319'",
        )
      ).rowCount,
      1,
    );
  } finally {
    await db.query("rollback");
  }
});

test("request context only reveals labels to participants and retains history after a listing is paused", async () => {
  const target = await published(users.ownerA.client, "Request context fixture");
  const booking = ok(await request(users.renterA.client, target.unit));
  const viewing = ok(
    await users.renterA.client.rpc("submit_viewing", {
      p_property_id: target.id,
      p_requested_at: new Date(Date.now() + 86400000).toISOString(),
      p_message: "Private note",
      p_consent: true,
    }),
  );
  const args = { p_booking_ids: [booking], p_viewing_ids: [viewing] };
  denied(await anon.rpc("get_request_context", args));
  assert.deepEqual(ok(await users.renterB.client.rpc("get_request_context", args)), []);
  assert.deepEqual(ok(await users.ownerB.client.rpc("get_request_context", args)), []);
  for (const actor of [users.renterA.client, users.ownerA.client]) {
    const rows = ok(await actor.rpc("get_request_context", args));
    assert.equal(rows.length, 2);
    assert.ok(
      rows.every((r) => r.title === "Request context fixture" && r.property_id === target.id),
    );
    assert.deepEqual(Object.keys(rows[0]).sort(), [
      "kind",
      "owner_id",
      "property_id",
      "request_id",
      "slug",
      "title",
      "unit_label",
    ]);
  }
  assert.deepEqual(
    ok(await users.renterA.client.from("units").select("id").eq("id", target.unit)),
    [],
  );
  await db.query("update public.properties set status='paused' where id=$1", [target.id]);
  assert.equal(ok(await users.renterA.client.rpc("get_request_context", args)).length, 2);
  denied(await users.renterA.client.rpc("get_property_contact", { p_property_id: target.id }));
  const grants = await db.query(
    "select has_function_privilege('anon','public.get_request_context(uuid[],uuid[])','execute') as anon_access",
  );
  assert.equal(grants.rows[0].anon_access, false);
});

test("SQL Editor bundle bootstraps a fresh app schema and records migration versions atomically", async () => {
  const source = readFileSync("supabase/bootstrap.sql", "utf8");
  const sql = source.slice(source.indexOf("begin;\n") + 7, source.lastIndexOf("commit;"));
  await db.query("begin");
  try {
    await db.query(
      "drop policy if exists puyohub_photos_closed on storage.objects; drop schema public cascade; drop schema private cascade; create schema public; grant usage on schema public to anon,authenticated,service_role; delete from supabase_migrations.schema_migrations where version in ('20261017000100','20261017000200','20261017000300','20261017000400','20261017000500','20261017145319','20261017154740','20261022163000','20261023000100','20261023000200')",
    );
    await db.query(sql);
    const result = await db.query(
      "select count(*)::int as count from supabase_migrations.schema_migrations where version in ('20261017000100','20261017000200','20261017000300','20261017000400','20261017000500','20261017145319','20261017154740','20261022163000','20261023000100','20261023000200')",
    );
    assert.equal(result.rows[0].count, 10);
    const profiles = await db.query("select count(*)::int as count from public.profiles");
    assert.ok(profiles.rows[0].count >= 6, "Existing Auth accounts should be backfilled safely");
  } finally {
    await db.query("rollback");
  }
});

test("featured placement requires admin MFA and keeps anonymous public search and user sorting intact", async () => {
  const marker = `Promotion-${randomUUID()}`;
  const first = await published(users.ownerA.client, `${marker} A`);
  const second = await published(users.ownerA.client, `${marker} B`);
  await db.query("update public.units set monthly_rent=1000 where id=$1", [second.unit]);
  const args = {
    p_property_id: first.id,
    p_priority: 80,
    p_expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    p_reason: "Synthetic placement agreement",
  };
  denied(await anon.rpc("set_listing_promotion", args));
  denied(await users.renterA.client.rpc("set_listing_promotion", args));
  denied(await users.ownerA.client.rpc("set_listing_promotion", args));
  const weak = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    options,
  );
  ok(await weak.auth.signInWithPassword({ email: users.admin.email, password }));
  denied(await weak.rpc("set_listing_promotion", args));
  denied(
    await users.admin.client.from("listing_promotions").insert({
      property_id: first.id,
      priority: 80,
      expires_at: args.p_expires_at,
      reason: "Cannot bypass RPC",
      updated_by: users.admin.id,
    }),
  );
  ok(await users.admin.client.rpc("set_listing_promotion", args));
  assert.deepEqual(ok(await users.ownerA.client.from("listing_promotions").select("*")), []);
  denied(await anon.from("listing_promotions").select("*"));
  const featured = ok(await anon.rpc("search_listings", { p_query: marker, p_sort: "featured" }));
  assert.deepEqual(
    featured.map((r) => r.id),
    [first.id, second.id],
  );
  assert.deepEqual(
    ok(await anon.rpc("search_listings", { p_query: marker, p_sort: "price-asc" })).map(
      (r) => r.id,
    ),
    [second.id, first.id],
  );
  assert.deepEqual(
    ok(await anon.rpc("get_featured_listings", { p_property_ids: [first.id, second.id] })),
    [{ property_id: first.id }],
  );
  assert.equal(ok(await anon.rpc("get_public_listing", { p_slug: featured[0].slug })).length, 1);
  denied(await users.admin.client.rpc("set_listing_promotion", { ...args, p_priority: 101 }));
  denied(
    await users.admin.client.rpc("set_listing_promotion", {
      ...args,
      p_expires_at: new Date(Date.now() - 1000).toISOString(),
    }),
  );
  await db.query(
    "update public.listing_promotions set expires_at=now()-interval '1 second' where property_id=$1",
    [first.id],
  );
  assert.deepEqual(ok(await anon.rpc("get_featured_listings", { p_property_ids: [first.id] })), []);
  assert.deepEqual(
    ok(await anon.rpc("search_listings", { p_query: marker, p_sort: "featured" })).map((r) => r.id),
    [second.id, first.id],
  );
  ok(await users.admin.client.rpc("set_listing_promotion", args));
  await db.query("update public.properties set status='paused' where id=$1", [first.id]);
  denied(await users.admin.client.rpc("set_listing_promotion", args));
  assert.deepEqual(ok(await anon.rpc("get_featured_listings", { p_property_ids: [first.id] })), []);
  assert.deepEqual(
    ok(await anon.rpc("search_listings", { p_query: marker })).map((r) => r.id),
    [second.id],
  );
  ok(
    await users.admin.client.rpc("set_listing_promotion", {
      ...args,
      p_priority: 0,
      p_expires_at: null,
    }),
  );
  assert.deepEqual(
    ok(
      await users.admin.client
        .from("listing_promotions")
        .select("property_id")
        .eq("property_id", first.id),
    ),
    [],
  );
});

test("experience SQL upgrade preserves existing listings and promotion administration remains private", async () => {
  const source = readFileSync("supabase/upgrade-experience.sql", "utf8");
  const sql = source.slice(source.indexOf("begin;\n") + 7, source.lastIndexOf("commit;"));
  await db.query("begin");
  try {
    const before = await db.query("select count(*)::int as count from public.properties");
    await db.query(
      "drop function public.set_listing_promotion(uuid,integer,timestamptz,text),public.get_featured_listings(uuid[]),public.search_listings(text,text,text,numeric,numeric,text,integer,integer); drop table public.listing_promotions; delete from supabase_migrations.schema_migrations where version='20261017154740'",
    );
    await db.query(sql);
    assert.equal(
      (await db.query("select count(*)::int as count from public.properties")).rows[0].count,
      before.rows[0].count,
    );
    const grants = await db.query(
      "select has_function_privilege('anon','public.set_listing_promotion(uuid,integer,timestamptz,text)','execute') as public_write, has_function_privilege('anon','public.search_listings(text,text,text,numeric,numeric,text,integer,integer)','execute') as public_search",
    );
    assert.equal(grants.rows[0].public_write, false);
    assert.equal(grants.rows[0].public_search, true);
  } finally {
    await db.query("rollback");
  }
});

test("revoking an owner role immediately removes ownership access for an existing session", async () => {
  await db.query("delete from public.account_roles where user_id=$1 and role='owner'", [
    users.ownerB.id,
  ]);
  try {
    assert.equal(ok(await users.ownerB.client.from("properties").select("id")).length, 0);
    denied(
      await users.ownerB.client.rpc("save_property_draft", {
        p_property_id: null,
        p_title: "Forbidden owner",
        p_slug: `forbidden-${randomUUID()}`,
        p_property_type: "house",
        p_barangay: "Caasinan",
        p_description: "",
        p_street_address: "Test address",
        p_contact_name: "Test",
        p_contact_phone: "09123456789",
      }),
    );
  } finally {
    await db.query("insert into public.account_roles(user_id,role) values($1,'owner')", [
      users.ownerB.id,
    ]);
  }
});

test("Google profile names use provider text without granting roles", async () => {
  const user = ok(
    await root.auth.admin.createUser({
      email: `cabahay-google-${randomUUID()}@example.test`,
      password,
      email_confirm: true,
      user_metadata: { full_name: "  Google Neighbor  ", role: "admin", signup_intent: "owner" },
    }),
  ).user;
  const profile = ok(await root.from("profiles").select("display_name").eq("id", user.id).single());
  assert.equal(profile.display_name, "Google Neighbor");
  const roles = ok(await root.from("account_roles").select("role").eq("user_id", user.id));
  assert.deepEqual(
    roles.map((row) => row.role),
    ["renter"],
  );
});

test("renter reports enforce publication, privacy, atomic duplicate prevention and rolling limits", async () => {
  const email = `cabahay-report-${randomUUID()}@example.test`;
  const actor = ok(await root.auth.admin.createUser({ email, password, email_confirm: true })).user;
  const client = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    options,
  );
  ok(await client.auth.signInWithPassword({ email, password }));
  const targets = [];
  for (let i = 0; i < 6; i++)
    targets.push(await published(users.ownerA.client, `Reporting safeguard ${i}`));
  const input = (id) => ({
    p_property_id: id,
    p_reason: "Suspected scam",
    p_detail: "Local report test details",
  });
  denied(await anon.rpc("submit_listing_report", input(targets[0].id)));
  denied(await client.rpc("submit_listing_report", { ...input(targets[0].id), p_reason: "  " }));
  denied(
    await client.rpc("submit_listing_report", {
      ...input(targets[0].id),
      p_detail: "x".repeat(2001),
    }),
  );
  const parallel = await Promise.all([
    client.rpc("submit_listing_report", input(targets[0].id)),
    client.rpc("submit_report", input(targets[0].id)),
  ]);
  assert.equal(parallel.filter((result) => !result.error).length, 1);
  assert.match(parallel.find((result) => result.error).error.message, /REPORT_ALREADY_OPEN/);
  const report = parallel.find((result) => !result.error).data;
  assert.equal(
    ok(await users.ownerA.client.from("reports").select("id").eq("id", report)).length,
    0,
  );
  assert.equal(
    ok(await users.renterB.client.from("reports").select("id").eq("id", report)).length,
    0,
  );
  assert.equal(ok(await client.from("reports").select("id").eq("id", report)).length, 1);
  await db.query("update public.profiles set account_status='suspended' where id=$1", [actor.id]);
  try {
    denied(await client.rpc("submit_listing_report", input(targets[1].id)));
  } finally {
    await db.query("update public.profiles set account_status='active' where id=$1", [actor.id]);
  }
  await db.query("update public.properties set status='paused' where id=$1", [targets[5].id]);
  denied(await client.rpc("submit_listing_report", input(targets[5].id)));
  await db.query("update public.properties set status='published' where id=$1", [targets[5].id]);
  for (let i = 1; i < 4; i++) ok(await client.rpc("submit_listing_report", input(targets[i].id)));
  const capped = await Promise.all([
    client.rpc("submit_listing_report", input(targets[4].id)),
    client.rpc("submit_listing_report", input(targets[5].id)),
  ]);
  assert.equal(capped.filter((result) => !result.error).length, 1);
  assert.match(capped.find((result) => result.error).error.message, /REPORT_RATE_LIMIT/);
  const retry = capped[0].error ? targets[4].id : targets[5].id;
  ok(await users.admin.client.rpc("resolve_report", { p_report_id: report, p_status: "resolved" }));
  assert.match(
    (await client.rpc("submit_listing_report", input(retry))).error.message,
    /REPORT_RATE_LIMIT/,
  );
  assert.equal(
    (
      await db.query("select count(*)::int as count from public.reports where reporter_id=$1", [
        actor.id,
      ])
    ).rows[0].count,
    5,
  );
  await db.query(
    "update public.reports set created_at=now()-interval '25 hours' where reporter_id=$1",
    [actor.id],
  );
  ok(await client.rpc("submit_listing_report", input(retry)));
  assert.match(
    (await client.rpc("submit_listing_report", input(targets[1].id))).error.message,
    /REPORT_ALREADY_OPEN/,
  );
});
