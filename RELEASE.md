> v0.2.17 ~ "Extensions can add columns, actions and buttons to developer pages"

---
## Highlights

- **Resource view registries.** Extensions can add the following for `api-key`, `webhook`, `event`, `log` and `socket`:
  - columns, row actions, bulk actions and toolbar buttons, through `developers:table:<resource>:<slot>`;
  - header buttons and menu items on the detail pages, through `developers:details:<resource>:<slot>`.
- **API keys, webhooks, events, logs and sockets use the standard table layout.**
- **Fix: search on the events and logs pages was always disabled.**

---
## Upgrading
Needs fleetbase/ember-core v0.3.25 and fleetbase/ember-ui v0.4.5.

---
## Need help?
- [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions)
- [Discord](https://discord.gg/HnTqQ6zAVn)
---
