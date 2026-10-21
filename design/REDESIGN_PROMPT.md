# Prompt for Claude Design: Complete redesign of the Fleetbase Developers module (`@fleetbase/dev-engine`)

> Paste everything below this line into Claude Design.

---

## 1. Your role and the deliverable

You are the lead product designer for the **Fleetbase Developers console** (the `@fleetbase/dev-engine` Ember engine, mounted at `console.developers`). Produce a **complete, section-by-section redesign mockup** of the entire module, including every list view, every detail view, every modal/form, every flow, and every state (empty, loading, error, permission denied, dark mode, mobile). The output is a single design artifact that an engineer can build from and that I can review screen-by-screen.

Do not jump to mockups. Earn them by running the six research phases below first, and show your evidence. Each design decision in the final artifact must trace back to a finding from the audit, the codebase, the API, a competitor pattern, or a Fleetbase design standard.

Work autonomously. Do not stop to ask me questions unless you are genuinely blocked (for example the console shows a login screen or is unreachable). The console and browser are already set up for you; see Phase 1. Make routine judgment calls yourself and state the assumption in the artifact.

---

## 2. Context you must know

**Product.** Fleetbase is an open-source modular logistics and fleet operations platform. The console is an Ember app made of "engines" (extensions). The Developers extension is where integrators manage API access and observe what their integrations are doing. Its users are backend developers, integration engineers, and technical ops staff, not drivers or dispatchers.

**What the module contains today (5 sections plus a dashboard):**

| Section | Route | What it does today |
|---|---|---|
| Dashboard | `/developers` | Widget dashboard (`@extension="developers"`) with 8 KPI tiles (API requests, error rate, avg latency, webhook success rate, active API keys, active webhooks, webhook failures, events emitted), 4 analytics/ops widgets (API traffic, webhook delivery health, endpoint health, event stream), developer activity, quick resources, and a legacy "API Metrics" widget. |
| API Keys | `/developers/api-keys` | Table of API credentials (name, public key, secret key via click-to-reveal, environment live/test, expiry, last used, created). Header has a "Test mode" toggle and, when on, a native `<select>` of test keys. Row actions: edit, roll, view logs, delete. Bulk delete. Export. Modals: create/edit (name, expiration select, live/test badge), rename, roll key (shows key, last used, expiration select, requires email + password re-auth), delete confirm. |
| Webhooks | `/developers/webhooks` and `/developers/webhooks/:id` | Table (url, status, mode, version, created). Row click opens detail. Modal form: endpoint URL, description, API credential (native select), API version (native select), events picker (custom BasicDropdown with grouped events + search, "receive all events" link, selected list box). Detail page: metrics strip (status, mode, version, created), details panel (url, description, event types, API credential), attempts table with all/succeeded/failed filter + date filter + pagination, expandable rows showing HTTP code, response time, request body JSON, response JSON. Header actions: enable/disable, refresh, delete. A "send test" button exists in the template but is commented out. |
| Sockets | `/developers/sockets` and `/developers/sockets/:name` | Hand-built, unpaginated list of known channels: one `api.<credential id>` channel per API credential plus `company.<company id>`. "Listen on custom channel" modal (single text input). Channel viewer is a black terminal-style ContentPanel that logs connect / subscribe / subscribeFail (authorization denied) / kickOut / data events with a timestamp and color. No pause, clear, filter, pretty-print, copy, or export. |
| Events | `/developers/events` and `/developers/events/:public_id` | Table (event description, code, public id click-to-copy, date). Detail: ContentPanel with date/source/description plus a JSON CodeBlock of the payload. Back button only. |
| Logs | `/developers/logs` and `/developers/logs/:public_id` | Table (description = method + path, status badge, public id, API credential, HTTP method, version, date). Detail: five stacked ContentPanels (details with time/duration/ip/version/source, query params, request headers, request body, response body). Back button only. |

**Navigation.** The engine registers a header menu item "Developers" with five shortcuts (API Keys, Webhooks, Sockets, Events, Logs) and a sidebar navigator with a "Search Dev..." search box backed by `developers/search`.

**Extensibility you must preserve.** Other extensions inject columns, actions, bulk actions, and detail-page buttons through registries named `developers:<resource>:table:columns`, `developers:<resource>:table:actions`, `developers:<resource>:table:bulk-actions`, and `developers:<resource>:details:actions` for resources `api-key`, `event`, `log`, `socket`, `webhook`. The API-key create/edit dialogs live in a shared `api-key-actions` service because other engines (Fleetbase AI) open them. Your redesign must keep room for injected columns and actions.

**Permissions.** Every action is gated by abilities such as `developers list api-keys`, `developers create api-key`, `developers update webhook`, `developers view socket`, `developers list event`, `developers list log`. Design the disabled/unauthorized state for each control, not just the happy path.

**Theming.** Tailwind utility classes, gray palette, FontAwesome solid icons, dark mode via `body[data-theme='dark']`. Every screen must be shown in light and dark.

---

## 3. Phase 1: Visual audit of the existing module in the browser

The console is **already running** locally at **http://localhost:4200** (API at http://localhost:8000), and the browser is **already open and signed in** to the console. Use that existing browser session and tab for the whole audit.

Do not start, restart, rebuild, or stop the console, the API, Docker containers, or any dev server, and do not run `ember serve`, `pnpm start`, or `docker compose`. Do not sign out, sign in, switch organizations, or create an account. If a page ever shows a login screen or the console appears to be down, stop and tell me; do not try to fix it yourself.

Visit and screenshot every one of these, in light and dark mode, at desktop width and at a 390px mobile width:

1. `http://localhost:4200/developers` (dashboard). Also open the dashboard "add widget" flow and the widget picker.
2. `http://localhost:4200/developers/api-keys`. Toggle Test mode on. Open: New API key modal, Edit (click a name), row-actions menu, Roll key modal, Rename modal, Delete confirm, bulk-select a few rows and open bulk actions, Export.
3. `http://localhost:4200/developers/webhooks`. Open: New webhook modal (expand the events picker, search it, select several, clear, "all events"), row actions, then click a row to open the detail page. On detail: open Edit, the attempts filters (all/succeeded/failed, date), expand an attempt row, Disable/Enable, Delete confirm.
4. `http://localhost:4200/developers/sockets`. Open "Listen on custom channel". Open a `company.*` channel viewer and an `api.*` channel viewer. Trigger activity if you can (for example create or edit a webhook or API key in another tab) and capture what the viewer shows. Also enter a channel name you are not allowed to subscribe to (for example `private.something`) and capture the authorization-failure state.
5. `http://localhost:4200/developers/events`, then a detail page.
6. `http://localhost:4200/developers/logs`, then a detail page with a request body and one with a non-2xx status.
7. The sidebar navigator and the "Search Dev..." box with a query that matches and one that does not.
8. Any empty state you can reach (a search with no results on each list).

For each screen, record in an audit table: hierarchy problems, inconsistent components (for example native `<select>` vs Fleetbase `Select`), spacing and alignment issues, unlabeled or ambiguous controls, missing states (empty, loading, error), dark-mode defects, contrast failures, truncation and overflow, mobile breakage, dead or commented-out UI, and anything that violates the Fleetbase standards in Phase 5. Rate each issue by severity (blocker, major, minor, polish).

---

## 4. Phase 2: Codebase research (frontend)

Read the module source at `packages/dev-engine/addon` (GitHub: https://github.com/fleetbase/dev-engine). Specifically:

- `routes.js`, `extension.js` (menu, widgets, registries), `engine.js`
- `templates/**` and `controllers/**` for all five sections (columns, action buttons, bulk actions, query params, search)
- `components/modals/*.hbs` (api-key-form, rename-api-key-form, roll-api-key-form, webhook-form, listen-custom-channel)
- `components/webhook/{metrics,details,attempts}.hbs|js`, `components/api-event/*`, `components/api-request-log/*`
- `components/widget/*` (dashboard widgets and the data they fetch)
- `services/api-key-actions.js`, `services/webhook-actions.js`
- `models/{api-credential,api-event,api-request-log,webhook-endpoint,webhook-request-log}.js`
- `styles/dev-engine.css`, `translations/en-us.yaml`

Produce a **capability inventory**: for each model, every attribute that exists, and whether the UI currently surfaces it. I already know of several attributes that exist on the model but are never shown or editable; verify and extend this list:

- `api-credential`: `browser_origins` (CORS allow-list), `api` (API scope), `expires_at` is only settable at create/roll, `last_used_at`, `test_mode`.
- `webhook-endpoint`: `version`, `mode`, `is_listening_on_all_events`, `api_credential_name`, created/updated by.
- `webhook-request-log`: `attempt` number, `headers`, `meta`, `sent_at`, `duration`, `reason_phrase`, relation to `api_event`.
- `api-request-log`: `full_url`, `content_type`, `ip_address`, `response_headers`, `request_raw_body`, `response_raw_body`, `related_resources`, `related`, `source`, `version`.
- `api-event`: `source`, `method`, `api_credential_uuid`.

Also produce a **behavior inventory** of what the UI can do today (every action, filter, sort, search, bulk action, export) and a **gap list** of obvious missing behaviors. Candidate gaps to verify, not assume:

- No one-time secret reveal flow after creating or rolling a key; the secret sits in the table behind click-to-reveal.
- Test-mode toggle plus native select in the API keys header is confusing and does not explain what it changes.
- No way to edit expiration, CORS origins, or scope after creation.
- Webhook form uses native selects and a bespoke events dropdown instead of standard Fleetbase select components; no inline validation of the URL; no "send test event" or "ping endpoint".
- Webhook attempts have no redeliver/retry, no response headers, no attempt-number grouping, no latency trend, no link to the originating event.
- Sockets list is not a real resource list: no last-activity, no subscriber count, no filtering; the viewer has no pause, clear, filter, pretty JSON, copy, download, or event-type chips.
- Events and Logs lists have no filters (date range, event type, source, API credential, HTTP method, status class, version) and no saved views; detail pages have no "related" navigation (event to its webhook deliveries, log to its API key, log to the events it produced) and no copy-as-cURL or copy-as-JSON.
- Detail pages use stacked `ContentPanel` tables instead of the standard `Layout::Resource::Panel` pattern used by FleetOps.
- No designed empty states, loading skeletons, or error states anywhere.

---

## 5. Phase 3: Backend research (`fleetbase/core-api`)

Read `packages/core-api` (GitHub: https://github.com/fleetbase/core-api), especially `src/routes.php` and these controllers under `src/Http/Controllers/Internal/v1`: `ApiCredentialController`, `WebhookEndpointController`, `WebhookRequestLogController`, `ApiEventController`, `ApiRequestLogController`, `DeveloperMetricsController`, `DeveloperSearchController`. Also read the corresponding models, resources (serializers), and filters under `src/Models`, `src/Http/Resources`, `src/Http/Filter`.

Known internal endpoints to account for:

- `api-credentials` CRUD plus `PATCH api-credentials/roll/{id}` and `GET api-credentials/export`
- `webhook-endpoints` CRUD plus `PATCH enable/{id}`, `PATCH disable/{id}`, `GET webhook-endpoints/events` (the catalog of subscribable events), `GET webhook-endpoints/versions`
- `webhook-request-logs`, `api-events`, `api-request-logs` (list, view, with filters; check what filter params each supports)
- `GET metrics/dev/kpis`, `dev/api-traffic`, `dev/webhook-delivery`, `dev/credentials`, `dev/events`, `dev/endpoint-health`, `dev/activity`
- `GET developers/search`
- The socket server (`socket/` directory in the monorepo, SocketCluster based) and how channel authorization works, since the viewer shows authorization failures.

Deliver an **API capability matrix**: for each UI improvement you propose, mark it as (a) possible with existing endpoints and fields, (b) possible with a small backend change (name the controller and the change), or (c) requires a new endpoint. Do not design features that depend on data the platform cannot produce without labeling them clearly as (b) or (c).

---

## 6. Phase 4: Competitor and pattern analysis

Research and screenshot or sketch the relevant patterns from these products, then extract concrete, reusable patterns (not generic praise):

- **Stripe Dashboard, Developers section and Workbench**: API keys (restricted keys, reveal-once, last used, roll with grace period), Webhooks (endpoint list with error-rate, event selection UX, test/live toggle, attempt detail with request/response tabs, resend), Events (filterable stream, event to related requests), Logs (filterable request log, request detail with headers/body tabs, copy as cURL), Workbench's bottom-drawer inspector.
- **GitHub webhooks**: Recent deliveries list, per-delivery request/response tabs, redeliver button, delivery status iconography.
- **Svix and Hookdeck**: endpoint health, attempt timelines, retry schedules, replay, event-type catalog with schemas.
- **Twilio Console and Shopify Partners**: API key / credential management, debugger and error logs.
- **Pusher Debug Console and Ably dev console**: live socket/channel inspector (pause, clear, filter, publish test message, pretty JSON, event tags, connection state).
- **Supabase, Vercel, and Datadog log explorers**: log filtering, time-range pickers, saved views, dense row design, side-panel detail.
- **Clerk and Resend** (optional): clean API-key and webhook UIs with good empty states and onboarding.

For each competitor, note: information architecture, list density and columns, filter model, detail layout (page vs side panel vs drawer), how secrets are revealed, how test vs live is communicated, how failures are surfaced, and empty/onboarding states. End with a **pattern shortlist** of the 10 to 15 patterns you will adopt and why they fit Fleetbase's users.

---

## 7. Phase 5: Fleetbase UI/UX standards you must follow

Fleetbase has an established component library, `@fleetbase/ember-ui` (source in `packages/ember-ui/addon/components`, docs at https://fleetbase.io/docs/ui, playground at https://fleetbase.github.io/ember-ui/). FleetOps (`packages/fleetops`) is the reference implementation of the modern patterns and should be your visual and structural benchmark. Read the component sources and the playground, then **design with these components, by name, rather than inventing new primitives**:

**Lists and tables**
- `Layout::Resource::Tabular` with `@registry`, `@actionButtons`, `@bulkActions`, `@onRowClick`, search, pagination. Keep this as the list shell.
- `Table::Cell::Identity` (and the typed variants `user-identity`, `resource-identity`, `company-identity`, `role-identity`, `group-identity`, `file-identity`) for the primary identity column: icon or image, title, subtitle, inline badges, optional status dot, click handler, and hover popover. Use this for API keys, webhook endpoints, socket channels, events, and logs instead of plain text cells.
- `Table::Cell::Status`, `Table::Cell::Dropdown` (row actions), `Table::Cell::LinkTo`, `click-to-copy`, `click-to-reveal`, `Table::Cell::ExpandArrow` (expandable rows).
- `FiltersPicker` and `Filter::Select` / `Filter::MultiInput` for list filtering; `VisibleColumnPicker` for column visibility; `Pagination`.

**Detail views and panels**
- `Layout::Resource::Panel` with `Layout::Resource::Panel::Header` and `Layout::Resource::Panel::HeaderActions` (FleetOps uses this in 78 places, for example `fleetops/addon/components/driver/panel-header.hbs`). Detail pages for webhooks, events, logs, and socket channels should follow this pattern, with a header identity block (icon, title, subtitle, status badge) and header actions.
- `Layout::Resource::Card`, `Card::Header`, `Card::Body`, `Card::Footer`, `Layout::Resource::CardsGrid` for card layouts (candidate for the sockets list and dashboard quick resources).
- `ContentPanel` (collapsible titled panel with title slot and status badge) for sub-sections inside a detail view.
- `Overlay` with `Overlay::Header`, `Overlay::Body`, `Overlay::Footer`, and `Drawer` for side panels. Consider an overlay or drawer for log/event/attempt inspection from a list so users do not lose their place.
- `Tabs` / `TabNavigation` for request/response/headers/body switching. `Timeline` for attempt histories. `Skeleton`, `Skeleton::Card`, `Skeleton::Form`, `Skeleton::CardsGrid` for loading. `StatWidget` and `Dashboard::WidgetCard` for KPI tiles.

**Forms and inputs**
- `InputGroup`, `InputLabel` (with `@helpText`, `@required`), `InputInfo`, `InfoBlock`.
- `Select`, `ModelSelect`, `ModelSelectMultiple`, `MultiSelect`, `FetchSelect`, `ComboBox` rendered with the `Resource::SelectOption` / `select-option/*` option component (photo or icon, title, details line). Replace every native `<select>` and the bespoke events dropdown with these.
- `Toggle`, `Checkbox`, `RadioButton`, `KeyInput`, `ArrayInput` (candidate for CORS browser origins), `ModelTagInput`, `DatePicker`, `DateTimeInput`.
- `Button` (types: primary, default, magic, danger, link; sizes xs through lg; `@icon`, `@helpText`, `@permission`, `@isLoading`), `DropdownButton`, `UploadButton`.

**Dialogs**
- `Modal::Default` with `Modal::Header`, `Modal::Body`, `Modal::Footer`, `Modal::TitleWithButtons`, and the `modalsManager` layouts `confirm`, `prompt`, `option-prompt`, `alert`, `progress`, `process`, `bulk-action`. Destructive actions use the confirm layout with an explicit accept label.

**Display**
- `Badge` (status coloring, `@hideStatusDot`), `Pill`, `Resource::Pill`, `Resource::HoverCard`, `Resource::Summary`, `CodeBlock` (Prism JSON with line numbers), `MetadataViewer`, `ViewRawMetadata`, `ClickToCopy`, `Spinner`, `ProgressBar`, `Countdown`.

**Layout**
- `Layout::Section::Header` (title, badge, actions), `Layout::Section::Body`, `Layout::Sidebar::Navigator`, `Layout::Resource::ActionButtons`, `Spacer`.

Also respect: i18n (every string is a translation key), permission-gated controls (use the `@permission` argument on buttons and show disabled with help text, never hide silently), keyboard accessibility and WCAG AA contrast in both themes, and the registry extension points from section 2.

Produce a **component mapping table**: for every element in the redesign, the exact Fleetbase component (and key arguments) that renders it. Flag the very few cases where no existing component fits and propose the smallest new component, with a FleetOps precedent if one exists.

---

## 8. Phase 6: Synthesis before design

Before drawing, write:

1. **Audit summary**: top 15 problems ranked by severity with screenshots from Phase 1.
2. **Opportunity backlog**: every improvement, tagged with source (audit / codebase / API / competitor), user value, and the API capability class from Phase 3 (a, b, or c).
3. **Information architecture proposal**: section order, naming (for example whether "Logs" should become "Requests" and "Sockets" should become "Channels"), navigation, and the global search behavior.
4. **Design principles for this module** (5 to 7), for example "secrets are shown once", "every failure links to its cause", "lists are dense and filterable, details live in a panel".
5. **Scope decision**: what the redesign ships in v1 (existing API only), v1.1 (small backend changes), and v2 (new endpoints). Design all three but label them.

---

## 9. Phase 7: The redesign artifact (required output)

Produce one artifact organized by module section. For every screen include: the full mockup in light and dark, a mobile variant, annotations keyed to findings, the component mapping, interaction notes (hover, focus, loading, success, error), and the states listed. Required screens and flows:

**A. Global**
1. Sidebar navigator and header menu for Developers, including the Search Dev results dropdown (matching, no match, loading).
2. Empty state, loading skeleton, generic error state, and permission-denied state templates used across sections.

**B. Dashboard**
3. Default dashboard layout with all KPI tiles and analytics widgets, period selector, and the add-widget picker. Show a "no data yet / first integration" onboarding state that points to creating a key and a webhook.

**C. API Keys**
4. List (identity cell with key name, masked public key, environment badge, scope/CORS indicators, last used, expiry warning states: never, expiring soon, expired, revoked).
5. Test/live environment switch redesigned (explain what it changes; consider a segmented control in the section header consistent with Fleetbase's sandbox concept).
6. Create key flow: form (name, environment, expiration, scope, browser origins) → **one-time secret reveal** with copy and "I have saved it" confirmation → return to list with the new row highlighted.
7. Edit key (name, expiration, origins, scope), Rename, Roll key (two-step: choose expiry of old key, re-authenticate, reveal new secret), Delete confirm, Bulk delete, Export.
8. Key detail (side panel or page): usage sparkline, last used, recent requests, linked webhooks, linked socket channel, audit trail.

**D. Webhooks**
9. List (identity cell with URL, description, status, mode, success rate over 24h, last delivery, event count).
10. Create/edit endpoint form with a proper event-type picker (grouped multi-select with search, "all events" toggle, selected chips), API credential `ModelSelect`, version select, URL validation, optional description, and a "send test event" / "ping" affordance.
11. Endpoint detail: header (URL, status, mode, version, credential, enable/disable, edit, delete, test), health strip (success rate, p95 latency, failures, retries), attempts list with filters (status, date range, event type), attempt timeline per event, expandable or drawer attempt inspector with Request / Response / Headers tabs, redeliver action, link to the originating event.
12. Disable/enable and delete confirms. Failure state for an endpoint that is auto-disabled or failing repeatedly.

**E. Sockets / Channels**
13. Channel list as a real resource list or card grid (channel name, type: api / company / custom, linked credential via identity cell, connection state, last activity, subscriber count if available).
14. Listen-on-custom-channel flow with validation and examples of channel name formats.
15. Live channel viewer: connection state indicator, pause/resume, clear, filter by event type or text, pretty-printed JSON with copy, event-type chips, timestamp density options, download log, and a clear authorization-denied / kicked-out / reconnecting state. Keep a terminal-like density but inside the Fleetbase visual system.

**F. Events**
16. List with filters (date range, event type, source, API credential, method) and saved views; identity cell for event (icon by resource type, event code, description, public id copy).
17. Event detail (page or drawer): metadata panel, payload JSON with copy and raw/pretty toggle, "deliveries" section listing the webhook attempts this event produced, links to the API request that caused it.

**G. Logs / Requests**
18. List with filters (date range, status class 2xx/4xx/5xx, HTTP method, API credential, version, path search); dense rows with method badge, path, status, duration, credential identity, time.
19. Request detail (page or drawer): header (method, path, status, duration, time, IP, credential, version, source), tabs for Query Params / Request Headers / Request Body / Response Headers / Response Body, related resources panel, copy as cURL, copy request id, link to events emitted.

**H. Flows (as flow diagrams plus the key screens)**
20. First-time integrator onboarding: empty dashboard → create key → reveal secret → create webhook → test event → see event and delivery.
21. Debugging a failed webhook: alert on dashboard → endpoint detail → failed attempt → response body → redeliver → success.
22. Rolling a compromised key with zero downtime.
23. Watching a live socket channel to verify an integration.

**I. Engineering handoff**
24. Change log of recommended code changes, split into frontend (`dev-engine`) and backend (`core-api`), each with priority and the API capability class, including the native-select replacements, model fields to surface, new filters, and new endpoints.
25. Component mapping table (from Phase 5) and a token/spacing sheet consistent with ember-ui.

---

## 10. Quality bar

- Every screen: light and dark, desktop and 390px mobile, all required states.
- Real-looking Fleetbase data (keys like `flb_live_…`, channels like `company.<uuid>`, events like `order.created`, paths like `/v1/orders`), never lorem ipsum.
- No new visual language. If it does not look like it belongs next to FleetOps, it is wrong.
- Every control gated by a permission shows its disabled state.
- Evidence first: cite the finding, the code path, or the competitor pattern beside each notable decision.
- Finish with a one-page executive summary: what changed, why, and what I need to decide.
