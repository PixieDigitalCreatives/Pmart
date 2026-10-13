# PMart Acceptance Tests

_Re-run 2026-10-13 against the rebuilt backend and an empty database. Method: see the [Test Strategy](PMart_TEST_STRATEGY.md)
(browser run without a visible window — page behaviour and data were checked, visuals were not)._

| Test ID | Area | Scenario | Result |
|---|---|---|---|
| SETUP-001 | Setup | `db:init` on an empty database, `create-admin`, admin signs in | PASS |
| AUTH-001 | Auth | Store owner and rider sign in with a temporary password and are forced to change it | PASS |
| AUTH-002 | Auth | Staff member activates through the one-time link and signs in | PASS |
| AUTH-003 | Auth | Limited staff sees only permitted sections; People shows "No access"; API returns 403 | PASS |
| AUTH-004 | Auth | Google sign-in | NOT RUN (not configured); button correctly hidden |
| ADDRESS-001 | Address | Search an area and pick a result (mouse or keyboard) | PASS |
| ADDRESS-002 | Address | Drag the pin / use current GPS | NOT RUN (map not drawn, geolocation blocked) |
| ADDRESS-003 | Address | Save, set default, edit; address line uses the typed details | PASS |
| CHECKOUT-001 | Checkout | COD order with correct fees (₹56 + ₹15 delivery + ₹5 handling = ₹76) | PASS |
| CHECKOUT-002 | Checkout | Cart cleared, stock reserved (50 → 48) | PASS |
| STORE-001 | Store | New order appears on the dashboard; accept → pack → ready | PASS |
| STORE-002 | Store | Assign an online rider (list refreshes every 15 s or on demand) | PASS |
| STORE-003 | Store | Reject with a reason; cancel; send out again after a failed delivery | PASS |
| RIDER-001 | Rider | Go online; assignment appears without reload | PASS |
| RIDER-002 | Rider | Pickup → start → arrived → cash collected → wrong code (attempts shown) → right code → delivered | PASS |
| RIDER-003 | Rider | Could not deliver with a reason; rider freed | PASS |
| RIDER-004 | Rider | Vehicle details edit; go offline and sign out | PASS |
| TRACK-001 | Tracking | Customer page follows status changes live and shows the delivery code only while out for delivery | PASS |
| TRACK-002 | Tracking | Rider position updates move the customer page to an ETA | PASS (position sent through the rider API) |
| ADMIN-001 | Admin | Dashboard, reports, payments and CSV export match the orders placed | PASS |
| ADMIN-002 | Admin | Deactivate a customer (session ends immediately), reactivate | PASS |
| ADMIN-003 | Admin | Settings change reaches the storefront (support contact on Help) | PASS |
| VISUAL-001 | All | Layout at phone and desktop widths; maps | NOT RUN — Remaining Work R2 |
