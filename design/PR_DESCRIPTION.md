# Developers module redesign (v1, existing API)

Implements the redesign on the design canvas https://claude.ai/artifact/9tHmccX6pQbP4m2U721GBp, section by section, using existing core-api endpoints only. Every list gets an identity column, a persistent filter bar and designed empty, loading, error and permission states; details open in the shared context panel; secrets are shown once; the dashboard gets a period selector; channels get a real list and a usable live viewer.

## Assumptions applied (the six open decisions on the summary board)

1. **Secrets.** The secret column and its click-to-reveal are gone from the list. Create and Roll end on a reveal step that shows what the API returns today. `TODO(v1.1)` in `services/api-key-actions.js`: the backend must generate an independent one-time secret and hide it from list responses.
2. **Redeliver, test event, recover.** UI slots render disabled with "Available in a later release" help text (`TODO(v2)` in `controllers/webhooks/index.js` and `view.js`). No backend endpoints were added.
3. **Naming.** Sidebar and header labels are Dashboard, API Keys, Webhooks, Events, Requests, Channels in that order. Route names and paths (`logs`, `sockets`) are unchanged.
4. **Retention.** Every "15 days" string is gone; `utils/retention.js` exports `RETENTION_DAYS = 2` and lists, panels and empty states print it. `TODO(v1.1)`: read it from runtime config.
5. **Socket auth.** ember-core is untouched. The channel viewer renders the `no_token` denial honestly with the operator hint.
6. **Drawer versus page.** Events, requests, delivery attempts and API keys open in the resource context panel from their lists with "Open full page"; webhook endpoints and channels keep full pages.

## Screens

| Board | Where |
|---|---|
| A1 Shell, states | `controllers/application.js`, `extension.js`, `components/states/*` |
| B1, B2 Dashboard, onboarding | `services/developer-metrics.js`, `components/dashboard/*`, `components/widget/*`, `templates/home/index.hbs` |
| C1 API keys list | `controllers/api-keys/index.js`, `templates/api-keys/index.hbs`, `components/api-key/*-cell.hbs` |
| C2, C3 Create and Roll (two steps, reveal once) | `services/api-key-actions.js`, `components/modals/api-key-form.hbs`, `roll-api-key-form.hbs`, `components/api-key/reveal.hbs`, `components/modal/steps.hbs` |
| C4 Key detail drawer | `components/api-key/panel.*`, `services/developer-panels.js` |
| C5 Edit, rename, delete, bulk, export | `services/api-key-actions.js`, `components/modals/rename-api-key-form.hbs` |
| D1 Webhooks list | `controllers/webhooks/index.js`, `templates/webhooks/index.hbs`, `components/webhook/*-cell.hbs` |
| D2 Endpoint form | `services/webhook-actions.js`, `components/modals/webhook-form.hbs`, `components/webhook/event-picker.*` |
| D3 Endpoint detail, deliveries, inspector | `controllers/webhooks/view.js`, `templates/webhooks/view.hbs`, `components/webhook/deliveries.*`, `attempt-panel.*`, `details.hbs` |
| D4 Confirms | `services/webhook-actions.js` (delete offers Disable instead) |
| E1 Channels list | `services/socket-channels.js`, `controllers/sockets/index.js`, `components/channel/*` |
| E2, E3 Viewer and states | `controllers/sockets/view.js`, `templates/sockets/view.hbs`, `components/modals/listen-custom-channel.hbs` |
| F1, F2 Events | `controllers/events/index.js`, `components/api-event/*`, `templates/events/*` |
| G1, G2 Requests | `controllers/logs/index.js`, `components/api-request-log/*`, `templates/logs/*` |
| Shared | `components/environment-switch.*`, `filter-bar.*`, `code-viewer.*`, `resource-header.hbs`, `section-card.hbs`, `utils/format.js`, `utils/resource-descriptors.js`, `instance-initializers/register-developers-resource-descriptors.js` |

## New components inside the engine (ember-ui has no equivalent)

`environment-switch`, `filter-bar` (chips over the same `filters` service as FiltersPicker), `modal/steps`, `code-viewer` (CodeBlock plus toolbar), `resource-header`, `section-card`, `states/empty|error|denied`, `webhook/event-picker`, `webhook/deliveries` (grouped per event with an attempt timeline), `channel/connection-badge`, and the per-column cell components. Everything else is ember-ui: Layout::Resource::Tabular, Table, Table::Cell::Identity (with registered resource descriptors), Badge, Button, DropdownButton, Select, ModelSelect, Resource::SelectOption, Checkbox, Toggle, ArrayInput, DatePicker, TabNavigation, Skeleton, Pagination, ClickToCopy, Modal::Default, the resource context panel.

## Bugs fixed in passing

- Test-mode toggle left the list empty until the route was re-entered (`toggleTestMode` / `toggleTestKey`); replaced by the environment switch bound to the `sandbox` option.
- `restoreParams` wrote the `date` URL param into `status` (old `attempts.js`, replaced by `deliveries.js`).
- "Send test webhook..." button with no handler; "Resend" commented out: now explicit disabled slots.
- Copy: "Explicilty", "assosciated", "Response timer", "No request HEADERS", "past 15 days".
- Compact-table rules targeted a `.next-table` class that does not exist, so list tables grew past their wrapper; tables now use a fixed layout with truncating cells and hide low-priority columns by viewport width (`dev-viewport` service).
- Credential names from the API carry the key in parentheses; the `credential-name` helper shows the name alone.
- KPI tiles started the metrics fetch inside the render computation; `developer-metrics.ensureKpis()` starts it on the next run loop.

## TODO inventory

- `TODO(v1.1)` `utils/retention.js`: retention from runtime config.
- `TODO(v1.1)` `services/api-key-actions.js`: independent one-time secret.
- `TODO(v1.1)` `controllers/webhooks/index.js`: endpoint health appended to the endpoint payload instead of a client-side join of `metrics/dev/endpoint-health`.
- `TODO(v2)` `controllers/webhooks/index.js`, `controllers/webhooks/view.js`, `components/webhook/deliveries.hbs`, `attempt-panel.hbs`: send test event, redeliver, recover failed.
- `TODO(v2)` `services/socket-channels.js`: last activity and subscriber counts from the socket server; publish test message.

## Registries and shared services

`developers:<resource>:table:columns|row-actions|bulk-actions|actions` and `developers:<resource>:details:actions|menu` are still merged (Tabular merges the table slots; `detailsActionButtons` and the context panel's `registry` merge the detail slots). `api-key-actions` and `webhook-actions` keep `createApiKey`, `editApiKey`, `createWebhook`, `editWebhook`, `deleteWebhook`, plus the new `rollApiKey`, `renameApiKey`, `deleteApiKey`, `viewApiKey`, `enableWebhook`, `disableWebhook`.

## Tests and lint

`ember test` passes (76 tests) and `lint:js`, `lint:hbs`, `lint:css` and the intl lint are clean. The dummy test app needed harness work that is part of this branch:

- `tests/dummy/config/environment.js` gains `API`, `socket` and `osrm` blocks because `@fleetbase/ember-core` reads them at import time.
- `tests/dummy/config/ember-intl.js` limits the dummy app to `en-us`; the other locales are built by the console.
- `tests/helpers/index.js` sets the locale for rendering tests and registers host-router and abilities stubs; test stubs carry a static `create()` for Ember 5's container.
- The generated placeholder tests that asserted empty output were removed; the new tests cover the format utils, the three services, the viewer controller, the code viewer, the event picker, the steps indicator and the empty state.
- Tasks use the `@task` decorator from `ember-concurrency`. The class-field `task()` form does not produce a performable task without the Babel transform, which only applies to packages that depend on ember-concurrency directly.

## Visual checks

See `design/visual-check.md` and `design/screenshots/`. Checked so far: dashboard (B1), API keys list (C1), create dialog (C2 form step), webhooks list empty and populated (D1), webhook form (D2), webhook detail with both tabs (D3), disable/delete confirms and the disabled page (D4). Remaining: C2 reveal step, C3 roll, C4 drawer, C5 edit/rename/delete, channels (E1 to E3), events (F1, F2), requests (G1, G2), Cmd-K search, the 390px pass and the light pass.
