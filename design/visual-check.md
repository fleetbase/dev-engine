# Visual check log

One line per screen: board, state checked, result, screenshot path. Screenshots live in `design/screenshots/`.

| Board | State | Result | Screenshot |
|---|---|---|---|
| C1 ApiKeysList | dark, 1346px, live keys | Sidebar order and names, Live/Test switch, filter chips, identity cells with env badge, masked key with copy, expiry and last-used columns match the board. Defect: primary button wrapped at this width; fixed with nowrap on header buttons and hiding the env hint under 1500px. | screenshots/c1-api-keys-list-dark.jpg |
| B1 Dashboard | dark, 1346px, 30d | Period selector with range and comparison text, 8 KPI tiles sharing one request, delta badges, charts, endpoint health, event stream, activity timeline, quick resources all render. Defect: the no-previous-period badge wrapped; badge now shows a dash and the footnote carries the sentence. | screenshots/b1-dashboard-dark.jpg |
| D1 WebhooksList | dark, empty, live | Env switch, filter chips (status, credential, version), retention line, designed empty state with retry facts and Add endpoint action. Note: the pager text 'Showing 1 to 1 of 0 results' comes from ember-ui Table pagination, not this engine. | screenshots/d1-webhooks-empty-dark.jpg |
