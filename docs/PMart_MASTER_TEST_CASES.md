# PMart Master Test Cases

This matrix documents the critical test scenarios for PMart. 

| Test ID | Area | Scenario | Preconditions | Steps | Expected Result | Status |
|---------|------|----------|---------------|-------|-----------------|--------|
| AUTH-001 | Auth | Customer Google Login | Firebase config valid | 1. Click "Sign in with Google" <br> 2. Complete OAuth | JWT received, User record created, redirect to home | MANUAL VERIFICATION REQUIRED |
| AUTH-002 | Auth | Rider Google Login | Firebase config valid | 1. Click "Rider Login" <br> 2. Complete OAuth | Rider profile initialized, dashboard loads | MANUAL VERIFICATION REQUIRED |
| ADDRESS-001 | Customer | Pin Map Location | Logged in as Customer | 1. Open Address Modal <br> 2. Move map pin | Reverse geocoding populates street, city, pincode | PARTIALLY VERIFIED |
| CHECKOUT-001 | Customer | Order Placement (COD) | Cart has items, Address saved | 1. Go to Checkout <br> 2. Select COD <br> 3. Click Place Order | Order created (PENDING), redirected to Tracking | CODE VERIFIED |
| ADMIN-001 | Admin | Accept Order | Order is PENDING | 1. Login as Admin <br> 2. Go to Orders <br> 3. Click Accept | Order status is ACCEPTED, Admin UI updates | CODE VERIFIED |
| ADMIN-002 | Admin | Reject Order | Order is PENDING | 1. Login as Admin <br> 2. Click Reject | Order status is REJECTED (Customer sees Cancelled) | CODE VERIFIED |
| RIDER-001 | Rider | Pickup Order | Order is ASSIGNED | 1. Login as Rider <br> 2. Click Pickup | Status -> PICKED_UP, OTP generated | CODE VERIFIED |
| TRACKING-001 | Tracking | Live Map Routing | Order OUT_FOR_DELIVERY | 1. Rider browser pushes GPS <br> 2. Customer opens Tracking | Map draws real road route from Rider to Customer, ETA updates | CODE VERIFIED |
| TRACKING-002 | Tracking | Admin Live Dashboard | Order OUT_FOR_DELIVERY | 1. Admin opens Deliveries <br> 2. Select order | Map draws road route in Admin panel | CODE VERIFIED |
| OTP-001 | Security | Verify Delivery OTP | Order ARRIVED | 1. Rider enters Customer's OTP <br> 2. Submit | Order -> DELIVERED, payment logged | CODE VERIFIED |
| SECURITY-001 | Security | IDOR on Order | Customer logged in | 1. Fetch `/api/order/{other_customer_order}` | 403 Forbidden or 404 Not Found | NOT VERIFIED |

*Note: E2E VERIFIED requires actual Playwright/Browser execution. Currently marked based on code state and targeted test scripts.*
