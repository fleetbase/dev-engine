# Prompt for Claude Code: implement the Developers module redesign (`@fleetbase/dev-engine`)

> Paste everything below this line into Claude Code, run from `packages/dev-engine` inside the fleetbase-dev monorepo.

---

## 1. Your job

Implement the redesign of the Fleetbase Developers console that is specified on the design canvas at **https://claude.ai/artifact/9tHmccX6pQbP4m2U721GBp**. Work screen by screen, verify each screen visually in the running console against its board on the canvas, and finish with every board in scope implemented, lint clean, and translated.

Read the canvas with the Artifact tool (`action: "read"` on that URL, then `path: "project/<Board>.dc.html"` for individual boards). Every board carries numbered callouts and a notes panel that explains each callout and names the ember-ui component that renders it. The board files are plain HTML, so you can read the exact layout, copy, spacing and states from them. Board names you will use:

| Section | Boards |
|---|---|
| Research (read first) | `Main`, `Audit`, `Backlog`, `Handoff`, `Components` |
| Global | `Shell` (navigation, Cmd-K search, shared empty / skeleton / error / permission-denied states) |
| Dashboard | `Dashboard`, `DashboardOnboarding` |
| API keys | `ApiKeysList`, `ApiKeyCreate` (interactive), `ApiKeyRoll`, `ApiKeyDetail`, `ApiKeyDialogs` |
| Webhooks | `WebhooksList`, `WebhookForm`, `WebhookDetail`, `WebhookStates` |
| Channels | `ChannelsList`, `ChannelViewer`, `ChannelStates` |
| Events | `EventsList`, `EventDetail` |
| Requests | `RequestsList`, `RequestDetail` |
| Flows | `FlowOnboarding`, `FlowDebugWebhook`, `FlowRollKey`, `FlowChannel` |
| Dark and mobile | `*Dark`, `*Mobile` wrappers of the main screens |

Work autonomously. Do not stop to ask unless the console is unreachable. Make routine calls yourself and record every assumption in the PR description.

---

## 2. Scope and defaults

Implement **v1: everything that works with the existing core-api**. Design the code so that v1.1 and v2 items plug in later, but do not build backend endpoints in this pass. The `Handoff` board lists every change by repository and priority; the `Backlog` board gives each item its API capability class (a, b, c). Implement every class **a** item. For class **b** and **c** items, build the UI slot and leave it behind a clearly named, disabled affordance only where the board shows one (for example the "Send test event" button renders disabled with help text "Available in a later release" and a `TODO(v2)` comment), otherwise omit it.

Defaults to apply unless the user has said otherwise (these are the six open decisions on the `Main` board):

1. **Secrets.** Remove the secret column and all click-to-reveal of the secret from the list. The reveal-once step in `ApiKeyCreate` and `ApiKeyRoll` is built, and it shows whatever the create and roll responses return today. Add a `TODO(v1.1)` where the backend must start returning an independent one-time secret.
2. **Redeliver, test event, recover.** UI slots only, disabled, as described above.
3. **Naming.** Sidebar and header labels become Dashboard, API Keys, Webhooks, Events, Requests, Channels in that order. Route names and paths stay as they are (`logs`, `sockets`); only translations and menu registration change.
4. **Retention.** Replace every "15 days" string with a value read from a single constant `RETENTION_DAYS` in the engine, defaulting to 2, with a `TODO(v1.1)` to read it from runtime config.
5. **Socket auth.** Do not change ember-core. The channel viewer must render the `no_token` denial state from `ChannelStates` honestly when the server refuses.
6. **Drawer versus page.** Events, requests, attempts and API keys open in a right-hand Overlay drawer from their list; a "full page" action transitions to the existing `view` route. Webhook endpoints and channels keep full pages.

Out of scope: core-api, ember-core, ember-ui source changes. If a component you need does not exist in ember-ui, create it inside this engine under `addon/components/` (see rule 1 below) and list it in the PR.

---

## 3. Design rules (non-negotiable)

1. **ember-ui is the base, not the ceiling.** Inputs, selects, dropdowns, buttons, badges, toggles, checkboxes, modals, overlays, tabs, pagination, skeletons, code blocks and table cells come from `@fleetbase/ember-ui` (`packages/ember-ui/addon/components`). Never write a native `<select>`, `<button class="btn">` or hand-rolled dropdown where an ember-ui component exists. Where the design needs something ember-ui lacks (the two-step modal step strip, the code-block toolbar, the environment switch, the live viewer row, the identity-cell descriptor for keys, endpoints, channels, events and requests), build it as a component inside `dev-engine` that composes ember-ui primitives, and name it after the thing it is (`modal/steps`, `code-block/toolbar`, `environment-switch`, `channel/message-row`).
2. **Do not overuse `ContentPanel`.** It is for collapsible sub-sections inside a detail body only. Detail headers use `Layout::Resource::Panel` with `::Header` and `::HeaderActions` as FleetOps does (`packages/fleetops/addon/components/driver/panel-header.hbs`). Key-value facts use a plain definition grid. Lists use `Layout::Resource::Tabular`. If you find yourself nesting a `ContentPanel` inside another, stop and restructure.
3. **No line breaks in subtext, labels, titles or button text.** Every label, column header, badge, button, tab, chip, section title and identity subtitle gets `white-space: nowrap` and truncates with an ellipsis (`overflow: hidden; text-overflow: ellipsis; min-width: 0`) where it can overflow. Long URLs and ids truncate in the middle of the cell with the full value in a `title` attribute and in click-to-copy. The only text that may wrap is body copy in dialogs, help text under inputs, empty-state sentences and JSON.
4. **Consistent spacing, margins, padding and alignment.** Use the scale on the `Components` board: 4, 8, 12, 16 for gaps and padding; section header 57px; content padding 16; panel padding 16; grid gaps 12 or 16; controls 28px tall (xs 24, lg 36); inputs 36 (sm 28); chips 28; badges 20; radius 6 on controls, 8 on panels, 10 on dialogs. Align header actions to the right on one baseline. Columns in the same list share one vertical rhythm. Do not mix `space-x-*` utilities with `gap`; use flex or grid with `gap` for sibling groups.
5. **Tight and compact, never squished or overflowing.** Tables use fixed layout with explicit column widths; the identity column is the only flexible column and it truncates. Row height 40px in lists, 36px in dense inspector tables. No column may collapse below its header's width; if the viewport cannot fit the columns, the table scrolls horizontally inside its wrapper and the identity column stays readable. Nothing overflows its container: check every panel, drawer, modal, code block and chip row at 1440, 1280, 1024 and 390 px wide. Cards and dialogs have no empty vertical space below their content.

Also: every string through `ember-intl` with keys under `developers.*` (update `translations/en-us.yaml`, run `fleetbase-intl-lint`); every action gated with `@permission` on `Button` so unauthorized users see a disabled control with help text, never a hidden one; keep every registry (`developers:<resource>:table:columns|row-actions|bulk-actions|actions`, `developers:<resource>:details:actions|menu|tabs`) and the shared `api-key-actions` and `webhook-actions` services working, since Fleetbase AI opens the key dialogs through them; dark mode via `body[data-theme='dark']` on every element you touch; FontAwesome icons by name, no inline SVG in templates.

---

## 4. Environment

The console is **already running** at http://localhost:4200 with the API at http://localhost:8000, and the browser is signed in. Do not start, stop, restart or rebuild the console, the API or Docker, and do not run `ember serve`, `pnpm start` or `docker compose`. The dev server rebuilds the engine on file save; wait for the rebuild, then reload the page. If the console shows a login screen or is unreachable, stop and tell me.

Monorepo facts you need:

- Engine source: `packages/dev-engine/addon` (routes, templates, controllers, components, services, models, styles, translations).
- ember-ui source: `packages/ember-ui/addon/components`; FleetOps as the reference implementation: `packages/fleetops/addon`.
- Node and pnpm quirk: prepend `/Users/ron/.nvm/versions/node/v22.22.2/bin` to `PATH` before running `pnpm`; use `node ~/.cache/node/corepack/v1/pnpm/11.7.0/bin/pnpm.cjs` if the corepack shim fails.
- Lint: `pnpm lint:js`, `pnpm lint:hbs`, `pnpm lint:css`, `pnpm lint:intl` from `packages/dev-engine`. Tests: `pnpm test:ember` if the test suite runs in this environment; otherwise say so.
- Work on a new branch from `release/v0.2.18`. Commit per screen with messages like `feat(api-keys): identity column, environment switch, filters (C1)`. Do not push unless asked.

Known bugs to fix in passing (from the `Audit` and `Handoff` boards): the test-mode toggle leaves the list empty until the route is re-entered (`controllers/api-keys/index.js` `toggleTestMode` / `toggleTestKey`: `testKey` stores `key.key` while the select posts `key.id`, and the "All test data" option posts the string `"null"`); `components/webhook/attempts.js` `restoreParams` writes the `date` param into `status`; the "Send test webhook..." button in `templates/webhooks/view.hbs` has no handler; copy typos "Explicilty", "assosciated", "Response timer", "No request HEADERS", and the translation key `enviroment`.

---

## 5. Order of work

Build in this order so each step is usable on its own. After each step run the visual check in section 6 before moving on.

1. **Foundation.** Shared state components (`states/empty`, `states/error`, `states/denied`, skeleton rows), the `environment-switch` component bound to the existing sandbox option and `Access-Console-Sandbox` header, the identity-cell descriptors, the `modal/steps` strip, the `code-block/toolbar` (Copy, Copy as cURL, Pretty / Raw, Wrap), the drawer host that opens a detail component from `onRowClick` and offers "Open full page". Navigation labels and order (`extension.js`, application controller). Board: `Shell`.
2. **Dashboard.** Period selector in the section header passed as `@period` to every widget (`7d 30d 90d 180d 365d`), delta badges from `delta_percent` honoring `inverse`, per-widget skeletons, remove the floating "Loading…" text, onboarding state when `api_requests` and `active_api_keys` are zero. Boards: `Dashboard`, `DashboardOnboarding`.
3. **API keys.** List with identity column, environment switch, filter bar, expiry states, requests-30d from `metrics/dev/credentials`, row actions (details, requests pre-filtered by key, watch channel, edit, rename, roll, delete), bulk bar; create flow with the reveal step and acknowledgement gate; two-step roll; detail drawer; edit, rename, delete, bulk delete, export dialogs with the copy on the boards. Boards: `ApiKeysList`, `ApiKeyCreate`, `ApiKeyRoll`, `ApiKeyDetail`, `ApiKeyDialogs`.
4. **Webhooks.** Search param on the index route; list with health from `metrics/dev/endpoint-health` joined client side; form with `ModelSelect` for credential, `Select` for version, grouped `MultiSelect` for events (group by prefix before the dot, "All events" toggle maps to an empty array), inline URL validation surfacing the 422 message; detail page with resource header, failure banner, health strip, deliveries tab with result segments, date range, event type and status code chips, rows grouped per `api_event_uuid` with an attempt timeline, inspector drawer with Request / Response / Headers / Error tabs; disable, enable and delete confirms. Boards: `WebhooksList`, `WebhookForm`, `WebhookDetail`, `WebhookStates`.
5. **Channels.** Resource list (company, api per credential, custom channels remembered in user options) with type, source, access and last activity seen in this session; listen dialog with the prefix table; viewer with connection state, pause / resume, clear, download `.ndjson`, type chips, free-text filter, Pretty / Raw, timestamp density, expandable rows with copy and a link to the persisted event; denied, kicked-out, reconnecting, no-token and quiet states. Boards: `ChannelsList`, `ChannelViewer`, `ChannelStates`.
6. **Events.** Filter bar (date range, type with wildcard, source, credential, method, delivery), identity column with resource icon and rewritten description, "Delivered to" from `webhook-request-logs?api_event_uuid=`, drawer detail with Overview / Payload / Deliveries / Raw. Boards: `EventsList`, `EventDetail`.
7. **Requests.** Filter bar (date range, status class via `status_code_gte` / `status_code_lt`, method, credential, version, source), token search, per-hour histogram, method pill rows, drawer and page detail with tabs including response headers, full URL, content type, related resources, copy as cURL with the authorization header masked. Boards: `RequestsList`, `RequestDetail`.
8. **Mobile and dark pass.** Card rows under 768px, wrapping headers, full-height dialogs, drawers as full-screen sheets; every screen in `body[data-theme='dark']`. Boards: the `*Mobile` and `*Dark` wrappers.
9. **Copy, i18n, lint, PR.** All strings in `en-us.yaml`, `fleetbase-intl-lint` clean, lints clean, PR description with the assumption list, the screens done, the `TODO(v1.1)` and `TODO(v2)` inventory, and the before / after screenshots.

---

## 6. Visual check after every screen

For each screen:

1. Open the board on the canvas and the live screen in the browser at 1440px wide, light and dark (toggle the console theme), then at 390px.
2. Screenshot the live screen and compare it to the board. Check in this order: structure (same regions, same order), identity column and badges, filter bar, header actions on one baseline, spacing scale, truncation (resize the pane narrower and confirm no label, title, button or subtext wraps), empty / loading / error / denied states (force them: empty search, throttle or block the API call in the browser, open with a user lacking the ability if one exists, otherwise simulate by passing `cannot` in the template temporarily and revert), and dark-mode contrast of muted text.
3. Record each deviation and fix it before moving on. If a board asks for something the API cannot provide, implement the nearest honest version and note it in the PR.
4. Keep a `design/visual-check.md` log in the engine with one line per screen: board, state checked, result, screenshot path. Attach the screenshots to the PR.

Acceptance for the whole pass: no native `<select>` left in the engine; no `ContentPanel` outside detail bodies; no wrapped label, title, button or subtext at 1440, 1280 or 1024 px; no horizontal page scroll at 390 px; every list has empty, loading, error and denied states; every gated control renders disabled with help text; lints and intl lint clean; registries and shared services still work (open the API-key dialog from Fleetbase AI if that engine is installed, otherwise assert the service API is unchanged with a unit test).
