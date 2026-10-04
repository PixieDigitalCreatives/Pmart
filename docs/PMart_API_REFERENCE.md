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

## Address (`/address`)
| Method | Path | Auth Required | Role | Purpose | Database Effect |
|--------|------|---------------|------|---------|-----------------|
| GET | `/address` | Yes | CUSTOMER | List user addresses | None |
| POST | `/address` | Yes | CUSTOMER | Add new address | Creates `Address` document |
| PUT | `/address/:id` | Yes | CUSTOMER | Edit address | Updates `Address` document |
| DELETE| `/address/:id` | Yes | CUSTOMER | Delete address | Deletes `Address` document |

## Catalog / Products (`/catalog` or `/products`)
| Method | Path | Auth Required | Role | Purpose | Database Effect |
|--------|------|---------------|------|---------|-----------------|
| GET | `/catalog/categories` | No | Any | List categories | None |
| GET | `/catalog/products` | No | Any | List/Search products | None |
| GET | `/catalog/products/:id` | No | Any | Get product details | None |

## Cart (`/cart`)
| Method | Path | Auth Required | Role | Purpose | Database Effect |
|--------|------|---------------|------|---------|-----------------|
| GET | `/cart` | Yes | CUSTOMER | Get active cart | None |
| POST | `/cart/items` | Yes | CUSTOMER | Add item to cart | Updates/Creates `Cart` |
| PUT | `/cart/items/:id` | Yes | CUSTOMER | Update quantity | Updates `Cart` |
| DELETE| `/cart/items/:id` | Yes | CUSTOMER | Remove item | Updates `Cart` |

## Orders (`/order` or `/orders`)
| Method | Path | Auth Required | Role | Purpose | Database Effect |
|--------|------|---------------|------|---------|-----------------|
| POST | `/order` | Yes | CUSTOMER | Place new order | Creates `Order`, `OrderEvent` |
| GET | `/order` | Yes | CUSTOMER | List customer orders | None |
| GET | `/order/:id` | Yes | Any | Get order details | None |
| PATCH| `/order/:id/status`| Yes | ADMIN/RIDER| Update order status | Updates `Order`, appends to `statusHistory` |
| POST | `/order/:id/reject`| Yes | ADMIN | Reject PENDING order | Updates `Order` status to REJECTED |
| POST | `/order/:id/assign`| Yes | ADMIN | Assign rider to order | Updates `Order.rider` |

## Rider (`/rider`)
| Method | Path | Auth Required | Role | Purpose | Database Effect |
|--------|------|---------------|------|---------|-----------------|
| GET | `/rider/profile` | Yes | RIDER | Get rider profile | None |
| PUT | `/rider/status` | Yes | RIDER | Toggle ONLINE/OFFLINE | Updates `RiderProfile.status` |
| GET | `/rider/active-order`| Yes | RIDER | Get assigned order | None |
| POST | `/rider/location` | Yes | RIDER | Push GPS telemetry | Updates `RiderLocation`, emits Socket event |
| POST | `/rider/verify-otp` | Yes | RIDER | Verify delivery OTP | Matches `encryptedOtp`, updates `Order` |

## Admin (`/admin`)
| Method | Path | Auth Required | Role | Purpose | Database Effect |
|--------|------|---------------|------|---------|-----------------|
| GET | `/admin/orders` | Yes | ADMIN | List all orders | None |
| GET | `/admin/riders` | Yes | ADMIN | List fleet riders | None |
| GET | `/admin/dashboard` | Yes | ADMIN | Metrics & stats | None |
| POST | `/admin/riders` | Yes | ADMIN | Provision new rider | Creates `User` and `RiderProfile` |
| GET | `/admin/users/search` | Yes | ADMIN | Search users by name/phone | None |

## Known Issues / Observations
- **Order Rejection API**: The `POST /order/:id/reject` requires specific properties. Earlier, `pincode` was rigidly validated on updates, breaking the rejection API if legacy zipCode was used. (This was patched in a recent milestone).
- **Socket Events**: The `/rider/location` endpoint acts as an HTTP bridge that emits `rider:location:update` over Socket.IO.
