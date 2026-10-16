# Development notes

## Scaffold and tools

The app was scaffolded in a temporary directory to preserve existing design documents:

```sh
XDG_CONFIG_HOME=/tmp/puyohub-config npm_config_cache=/tmp/puyohub-npm-cache \
  npx --yes create-next-app@latest /tmp/puyohub-scaffold \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias '@/*' --use-npm --disable-git --yes
```

The resolved scaffold and Next.js version was 16.4.2. Only intended scaffold/config files were copied into the existing checkout; the README and design documents were preserved. Do not rerun this scaffold command to refresh an existing application. Use `npm ci` from the repository root instead.

Runtime: Node 24.19.0; package manager: npm 11.9.0. Direct dependencies are exact-pinned in `package.json`; transitive dependencies are locked in `package-lock.json`. The initial app uses Next.js 16.4.2, React 19.3.0, and Tailwind 4.3.3. Supabase/Leaflet packages are deferred until their actual integration milestones.

## Structure

- `src/app`: routes, metadata, global theme, and route states.
- `src/components/layout`: shared navigation and footer.
- `src/features/properties`: typed fixtures, query normalization/filtering, forms, cards, amenity icons, and request explanation.
- `src/lib/money.ts`: consistent whole-peso monthly price display.
- `public/images`: original SVG illustrations. These contain no third-party photography, remote requests, scripts, or precise property coordinates.
- `tests/e2e`: behavior/accessibility checks against the production server.
- `.github/workflows/ci.yml`: repeatable installation, validation, and browser checks.

Feature components stay close to their data/query logic; shared UI primitives can be extracted when several real features need them. Search uses native GET forms and server rendering. Unknown areas/types are ignored safely, query length is bounded, and invalid numeric budgets display validation errors rather than apparently valid search results. Sorting operates on a new filtered array, leaving fixture ordering intact.

The preview's server-rendered pages require no credentials. Never introduce fake admin sessions, hardcoded tokens, or client-only permission checks to make later dashboards appear functional. Real data access must use the authorization design in `database.md`.

## Design and scope

The founder selected a light purple theme: lavender backgrounds, violet primary actions, plum text, and cream accents. All artwork is original vector illustration, displayed with explicit disclosure. There are no real photographs or claims of verified/live inventory.

The location panel is an illustrative diagram, not Leaflet or a navigable map. Add a supported tile provider, attribution, approximate coordinates, and failure fallback when implementing real discovery maps. Do not fabricate precise coordinates for sample properties.

The native modal dialog provides focus containment, Escape dismissal, an accessible title, and return focus to its trigger. It explains the future workflow without submitting data. Its automated accessibility checks supplement the browser journey; they do not replace manual assistive-technology testing.

See the README for setup/validation commands. Use the existing checkout; additional worktrees are unnecessary for ordinary cloud tasks.
