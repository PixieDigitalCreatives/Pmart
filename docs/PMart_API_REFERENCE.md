# PMart API Reference

This document lists the core APIs discovered in the application. All paths are prefixed with `/api` (or `/api/v1` depending on index.ts mounting).

## Auth (`/auth`)
| Method | Path | Auth Required | Role | Purpose | Database Effect |
|--------|------|---------------|------|---------|-----------------|
| POST | `/auth/register` | No | CUSTOMER | Customer signup | Creates `User` and `CustomerProfile`, returns JWT |
| POST | `/auth/login` | No | Any | Mobile/password login | Validates `passwordHash`, returns JWT |
| POST | `/auth/setup-password` | Yes | Any | Set initial password | Updates `User.passwordHash` |
| POST | `/auth/complete-profile` | Yes | CUSTOMER | Complete Google Auth profile | Updates `name`, `phone`, `passwordHash`, `profileComplete` |
| POST | `/auth/refresh` | No | Any | Refresh access token | Rotates token, returns new JWT |
| GET | `/auth/me` | Yes | Any | Get current session | None |
| POST | `/auth/logout` | Yes | Any | Clears token | Updates `User.refreshToken` to null |

## Users (`/users`)
| Method | Path | Auth Required | Role | Purpose | Database Effect |
|--------|------|---------------|------|---------|-----------------|
| GET | `/users/profile` | Yes | CUSTOMER | Get user profile | None |
| PUT | `/users/profile` | Yes | CUSTOMER | Update profile details | Updates `User` & `CustomerProfile` |

## Address (`/api/addresses`)
| Method | Path | Auth Required | Role | Purpose | Database Effect |
|--------|------|---------------|------|---------|-----------------|
| GET | `/addresses` | Yes | CUSTOMER | List user addresses | None |
| POST | `/addresses` | Yes | CUSTOMER | Add new address | Creates `Address` document |
| PUT | `/addresses/:id` | Yes | CUSTOMER | Edit address | Updates `Address` document |
| DELETE| `/addresses/:id` | Yes | CUSTOMER | Delete address | Deletes `Address` document |

## Catalog / Products (`/catalog` or `/products` and `/categories`)
| Method | Path | Auth Required | Role | Purpose | Database Effect |
|--------|------|---------------|------|---------|-----------------|
| GET | `/categories` | No | Any | List categories | None |
| GET | `/products` | No | Any | List/Search products | None |
| GET | `/products/:id` | No | Any | Get product details | None |
| POST | `/products` | Yes | ADMIN/EMPLOYEE | Create new product | Creates `Product`, Audit Log |
| PUT | `/products/:id` | Yes | ADMIN/EMPLOYEE | Update product | Updates `Product`, Audit Log |
| PATCH| `/products/:id/status`| Yes | ADMIN/EMPLOYEE | Change product active status| Updates `Product`, Audit Log |
| DELETE| `/products/:id` | Yes | ADMIN/EMPLOYEE | Archive product | Sets `isActive = false`, Audit Log |
| POST | `/categories` | Yes | ADMIN/EMPLOYEE | Create new category | Creates `Category`, Audit Log |
| PUT | `/categories/:id` | Yes | ADMIN/EMPLOYEE | Update category | Updates `Category`, Audit Log |
| PATCH| `/categories/:id/status`| Yes | ADMIN/EMPLOYEE | Change category active status| Updates `Category`, Audit Log |
| DELETE| `/categories/:id` | Yes | ADMIN/EMPLOYEE | Delete category | Deletes `Category`, Audit Log |

## Cart (`/cart`)
| Method | Path | Auth Required | Role | Purpose | Database Effect |
|--------|------|---------------|------|---------|-----------------|
| GET | `/cart` | Yes | CUSTOMER | Get active cart | None |
| POST | `/cart/items` | Yes | CUSTOMER | Add item to cart | Updates/Creates `Cart` |
| PUT | `/cart/items/:id` | Yes | CUSTOMER | Update quantity | Updates `Cart` |
| DELETE| `/cart/items/:id` | Yes | CUSTOMER | Remove item | Updates `Cart` |

## Orders (`/api/orders`)
| Method | Path | Auth Required | Role | Purpose | Database Effect |
|--------|------|---------------|------|---------|-----------------|
| POST | `/orders/checkout` | Yes | CUSTOMER | Place new order | Creates `Order`, `OrderEvent` |
| GET | `/orders` | Yes | CUSTOMER | List customer orders | None |
| GET | `/orders/:id` | Yes | Any | Get order details | None |
| PATCH| `/orders/:id/status`| Yes | ADMIN/RIDER| Update order status | Updates `Order`, appends to `statusHistory` |
| POST | `/orders/:id/reject`| Yes | ADMIN | Reject PENDING order | Updates `Order` status to REJECTED |
| POST | `/orders/:id/assign`| Yes | ADMIN | Assign rider to order | Updates `Order.rider` |

## Rider (`/rider`)
| Method | Path | Auth Required | Role | Purpose | Database Effect |
|--------|------|---------------|------|---------|-----------------|
| GET | `/rider/profile` | Yes | RIDER | Get rider profile | None |
| PUT | `/rider/status` | Yes | RIDER | Toggle ONLINE/OFFLINE | Updates `RiderProfile.status` |
| GET | `/rider/active-order`| Yes | RIDER | Get assigned order | None |
| POST | `/rider/location` | Yes | RIDER | Push GPS telemetry | Updates `RiderLocation`, emits Socket event |
| POST | `/rider/verify-otp` | Yes | RIDER | Verify delivery OTP | Matches `encryptedOtp`, updates `Order` |

## Routing (`/routing`)
| Method | Path | Auth Required | Role | Purpose | Database Effect |
|--------|------|---------------|------|---------|-----------------|
| GET | `/routing` | Yes | Any | Get driving route between two points | None (Uses in-memory LRU cache) |

## Admin (`/admin`)
| Method | Path | Auth Required | Role | Purpose | Database Effect |
|--------|------|---------------|------|---------|-----------------|
| GET | `/admin/orders` | Yes | ADMIN/EMPLOYEE | List all orders | None |
| GET | `/admin/riders` | Yes | ADMIN/EMPLOYEE | List fleet riders | None |
| GET | `/admin/dashboard` | Yes | ADMIN/EMPLOYEE | Metrics & stats | None |
| POST | `/admin/riders` | Yes | ADMIN/EMPLOYEE | Provision new rider | Creates `User` and `RiderProfile` |
| GET | `/admin/users/search` | Yes | ADMIN/EMPLOYEE | Search users by name/phone | None |
| GET | `/admin/employees` | Yes | ADMIN/EMPLOYEE | List employees | None |
| POST | `/admin/employees` | Yes | ADMIN/EMPLOYEE | Create new employee | Creates `User` with `EMPLOYEE` role |
| PUT | `/admin/employees/:id` | Yes | ADMIN/EMPLOYEE | Update employee permissions | Updates `User` |
| DELETE| `/admin/employees/:id` | Yes | ADMIN/EMPLOYEE | Delete employee | Deletes `User` |
| GET | `/admin/settings` | Yes | ADMIN/EMPLOYEE | Fetch platform settings | None |
| PUT | `/admin/settings` | Yes | ADMIN/EMPLOYEE | Update platform settings | Updates `Settings` |
| GET | `/admin/reports` | Yes | ADMIN/EMPLOYEE | Fetch KPI Analytics | None |
| GET | `/admin/audit-logs` | Yes | ADMIN/EMPLOYEE | Fetch system audit logs | None |

## Known Issues / Observations
- **Order Rejection API**: The `POST /order/:id/reject` requires specific properties. Earlier, `pincode` was rigidly validated on updates, breaking the rejection API if legacy zipCode was used. (This was patched in a recent milestone).
- **Socket Events**: The `/rider/location` endpoint acts as an HTTP bridge that emits `rider:location:update` over Socket.IO.
