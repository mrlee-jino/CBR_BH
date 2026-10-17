// Only known local destinations are allowed; private routes still authorize each request.
export function safeNext(value: unknown) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[%\\#\s]/.test(value) ||
    value.split("/").includes("..")
  )
    return "/dashboard";
  const url = new URL(value, "https://puyohub.invalid");
  const basic =
    /^\/(dashboard(?:\/(?:settings|security|requests))?|owner(?:\/requests)?|admin|become-an-owner|reset-password)$/;
  if (basic.test(url.pathname) && !url.search) return url.pathname;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const keys = [...url.searchParams.keys()];
  if (new Set(keys).size !== keys.length) return "/dashboard";
  const kind = url.searchParams.get("kind");
  const validKind = kind === "viewing" || kind === "booking";
  if (
    /^\/dashboard\/requests\/[0-9a-f-]{36}$/i.test(url.pathname) &&
    uuid.test(url.pathname.split("/").at(-1)!) &&
    keys.length === 1 &&
    validKind
  )
    return `${url.pathname}${url.search}`;
  if (
    /^\/properties\/[a-z0-9]+(?:-[a-z0-9]+)*\/request$/.test(url.pathname) &&
    validKind &&
    keys.every((k) => k === "kind" || k === "unit") &&
    (kind === "viewing" ? keys.length === 1 : uuid.test(url.searchParams.get("unit") ?? ""))
  )
    return `${url.pathname}${url.search}`;
  return "/dashboard";
}
