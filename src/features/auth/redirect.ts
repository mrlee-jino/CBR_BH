// A fixed allowlist excludes protocol-relative URLs, encoded paths, and arbitrary origins.
export function safeNext(value: unknown) {
  return typeof value === "string" &&
    /^\/(dashboard(?:\/(?:settings|security))?|owner|admin|become-an-owner|reset-password)$/.test(
      value,
    )
    ? value
    : "/dashboard";
}
