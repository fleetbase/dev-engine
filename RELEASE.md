> v0.2.18 ~ "The sockets viewer shows channel authorization failures"

---
## Highlights

- **Channel authorization failures are visible.** The sockets viewer logs `subscribeFail` and `kickOut` with the server's reason, for example when a channel is not authorized, instead of waiting indefinitely. The custom-channel dialog opens the same view, so it is covered too. ([#51](https://github.com/fleetbase/dev-engine/pull/51))
- **Fix: socket event payloads render as text.** Published payloads were rendered as raw HTML in the sockets viewer; they are now escaped.

---
## Upgrading
Pairs with fleetbase/ember-core v0.3.26, which authenticates the console socket. No configuration changes.

---
## Need help?
- [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions)
- [Discord](https://discord.gg/HnTqQ6zAVn)
---
