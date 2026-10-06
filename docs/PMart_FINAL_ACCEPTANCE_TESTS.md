# PMart Final Acceptance Tests

| Test ID | Area | Description | Expected Result | Status |
|---|---|---|---|---|
| AUTH-001 | Auth | Google Rider login | Firebase authenticates -> backend verifies -> RiderProfile created | MANUAL VERIFICATION REQUIRED |
| AUTH-002 | Auth | Rider onboarding | Incomplete rider goes to `/rider/onboarding` and saves profile | MANUAL VERIFICATION REQUIRED |
| AUTH-003 | Auth | Role isolation | Customer cannot access Admin/Rider routes | PASS |
| ADDRESS-001 | Address | Search address | Returns map autocomplete results | PASS |
| ADDRESS-002 | Address | Pin on map | Updates formatted address and pincode | PASS |
| ADDRESS-003 | Address | Current GPS | Prompts browser location -> reverse geocodes | MANUAL VERIFICATION REQUIRED |
| ADDRESS-004 | Address | Reverse geocode | Correctly fills city, state, country, pincode | PASS |
| ADDRESS-005 | Address | Save | Address saved to MongoDB with valid ObjectId | PASS |
| ADDRESS-006 | Address | Reload | Saved address persists after page refresh | PASS |
| ADDRESS-007 | Address | Edit | Edits existing address without creating duplicates | PASS |
| ADDRESS-008 | Address | Delete | Deletes address and removes from checkout selection | PASS |
| ADDRESS-009 | Address | Default | New primary address overrides previous default | PASS |
| ADDRESS-010 | Address | Checkout sync | Checkout reflects selected default address instantly | PASS |
| CHECKOUT-001 | Checkout | Normal COD | Order created with PENDING status | PASS |
| CHECKOUT-002 | Checkout | Stale price | Validates actual cart total against backend DB | PASS |
| CHECKOUT-003 | Checkout | Insufficient stock | Checkout blocked, shows stock error | PASS |
| CHECKOUT-004 | Checkout | Duplicate submit | Prevented via UI disable/debounce state | PASS |
| CHECKOUT-005 | Checkout | Invalid address | Checkout blocked without valid DB address reference | PASS |
| ORDER-001 | Order | Admin accept | Status -> ACCEPTED | PASS |
| ORDER-002 | Order | Admin prepare | Status -> PREPARING | PASS |
| ORDER-003 | Order | Admin ready | Status -> READY | PASS |
| ORDER-004 | Order | Admin reject | Status -> REJECTED | PASS |
| ORDER-005 | Order | Rejected customer UI | Customer sees "Order Cancelled", tracking disabled | PASS |
| RIDER-001 | Rider | Assignment | Admin assigns eligible rider, Order -> ASSIGNED | PASS |
| RIDER-002 | Rider | Busy rider rejection | Prevent concurrent active order assignment | PASS |
| RIDER-003 | Rider | Pickup | Status -> PICKED_UP | PASS |
| RIDER-004 | Rider | Out for delivery | Status -> OUT_FOR_DELIVERY | PASS |
| RIDER-005 | Rider | Arrived | Status -> ARRIVED, prompts for OTP | PASS |
| RIDER-006 | Rider | Payment | Collects COD, payment status -> COLLECTED | PASS |
| RIDER-007 | Rider | OTP | Correct 4-digit OTP validates delivery | PASS |
| RIDER-008 | Rider | Delivered | Status -> DELIVERED, flow ends | PASS |
| GPS-001 | GPS | Permission | Browser prompts for location watch | MANUAL VERIFICATION REQUIRED |
| GPS-002 | GPS | Location API | Rider app pushes `[lng, lat]` GeoJSON | PASS |
| GPS-003 | GPS | Mongo persistence | Rider location saved in `RiderProfile.lastLocation` | PASS |
| GPS-004 | GPS | Socket | Emits riderLocation update event | PASS |
| GPS-005 | GPS | A -> B | Interpolation/marker movement | MANUAL VERIFICATION REQUIRED |
| MAP-001 | Map | Customer map | Displays Rider, Customer, and Route | PASS |
| MAP-002 | Map | Admin map | Displays all active Riders | PASS |
| MAP-003 | Map | Rider map | Displays navigation to customer | PASS |
| MAP-004 | Map | Route geometry | Real OSRM GeoJSON geometry, NOT straight line | PASS |
| MAP-005 | Map | Distance | Real calculated driving distance | PASS |
| MAP-006 | Map | ETA | Derived from OSRM duration, NO mock values | PASS |
| SEC-001 | Sec | Customer isolation | Cannot mutate other customer's order/address (IDOR fixed) | PASS |
| SEC-002 | Sec | Rider isolation | Cannot update status of unassigned orders (IDOR fixed) | PASS |
| SEC-003 | Sec | Admin/Shop isolation | `SHOP_OWNER` can only modify own shop data (IDOR fixed) | PASS |
| SEC-004 | Sec | OTP access | Only authorized Rider and Customer can access OTP | PASS |
| SEC-005 | Sec | Location authorization | Only Rider can broadcast their location | PASS |
