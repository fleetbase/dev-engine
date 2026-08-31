> v0.2.15 ~ "API key expiry actually persists"

---
## Highlights

- **API key expiration works again.** Selecting an expiry in the developers console (`immediately`, `in 1 hour`, `in 24 hours`, …) silently saved `NULL` — Ember Data's `date` transform discarded the relative expiration strings before they reached the API. A new `expiration` transform passes them through for the server to resolve, so `expires_at` is persisted for every option. Pair with fleetbase/core-api#246 for `immediately` to revoke a key reliably at the boundary instant. ([#43](https://github.com/fleetbase/dev-engine/pull/43))
- **The engine's test suite is runnable.** `ember test` previously crashed before executing a single test; the engine now eager-loads for its own test runs (hosts still get the lazy engine), and regression tests cover the expiration serialization path.

---
## Need help?
- [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions)
- [Discord](https://discord.gg/HnTqQ6zAVn)
