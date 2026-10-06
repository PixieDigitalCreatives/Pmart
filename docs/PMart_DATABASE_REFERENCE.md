# PMart Database Reference

This document covers the core MongoDB collections, their schemas, constraints, and relationships.

## 1. `users` (User Model)
**Collection**: `users`
**Purpose**: Central authentication record for all platforms (Customer, Admin, Rider).
- **Fields**:
  - `phone` (String, Required, Unique): Canonical mobile number
  - `email` (String, Unique): User email
  - `name` (String): Display name
  - `role` (String, Enum): `'CUSTOMER', 'RIDER', 'ADMIN'`
  - `passwordHash` (String, `select: false`): Bcrypt hashed password
- **Security**: Authentication relies on `phone` and `passwordHash` verification. No external OTP or Firebase auth is used.

## 2. `customerprofiles` (Customer Profile)
**Collection**: `customerprofiles`
**Purpose**: Extended data for customers.
- **Fields**:
  - `user` (ObjectId): Ref to `User`
  - `savedAddresses` (Array of ObjectIds): Ref to `Address`
  - `defaultAddress` (ObjectId): Ref to `Address`
- **Relationships**: 1:1 with `User` (`role=CUSTOMER`).

## 3. `riderprofiles` (Rider Profile)
**Collection**: `riderprofiles`
**Purpose**: Extended data for fleet drivers.
- **Fields**:
  - `userId` (ObjectId): Ref to `User`
  - `status` (String, Enum): `'OFFLINE', 'AVAILABLE', 'ON_DELIVERY'`
  - `currentOrder` (ObjectId): Ref to `Order`
  - `location`: GeoJSON Point `[lng, lat]`
  - `vehicleDetails`, `licenseNumber`
- **Relationships**: 1:1 with `User` (`role=RIDER`).

## 4. `addresses` (Address Model)
**Collection**: `addresses`
**Purpose**: Shared address book.
- **Fields**:
  - `user` (ObjectId): Ref to `User`
  - `recipientName`, `recipientPhone`
  - `street`, `city`, `state`, `zipCode`/`pincode`, `formattedAddress`
  - `location`: GeoJSON Point `[lng, lat]`
  - `coordinates`: `{ lat, lng }` (Historical UI representation)
- **Note**: The Order model takes a *snapshot* of this address at checkout to prevent historical mutations.

## 5. `orders` (Order Model)
**Collection**: `orders`
**Purpose**: Core transaction and lifecycle record.
- **Fields**:
  - `orderNumber` (String, Unique): e.g. `ORD-123456789-123`
  - `customer` (ObjectId): Ref to `User`
  - `shop` (ObjectId): Ref to `Shop`
  - `rider` (ObjectId): Ref to `User` (Rider)
  - `items`: Array of embedded `OrderItem` objects
  - `totalAmount`, `subTotal`, `deliveryFee` (Number)
  - `status` (String, Enum): `PENDING, ACCEPTED, PREPARING, READY, ASSIGNED, PICKED_UP, OUT_FOR_DELIVERY, ARRIVED, DELIVERED, REJECTED, CANCELLED, DELIVERY_FAILED`
  - `deliveryAddress`: Embedded snapshot of customer address
  - `encryptedOtp` / `deliveryOtpHash` (String, `select: false`): Encrypted OTP for rider verification.
  - `statusHistory`: Audit array of state transitions
  - `idempotencyKey` (String, Unique, Sparse): Prevents duplicate checkouts on retry
- **Important**: OTPs are hashed/encrypted and never exposed in plaintext queries.

## 6. `categories` (Category Catalog)
**Collection**: `categories`
**Purpose**: Store product groupings.
- **Fields**:
  - `name`, `slug` (String, required, unique slug)
  - `description`, `icon`, `image`, `imageUrl` (String)
  - `isActive` (Boolean)

## 7. `products` (Product Catalog)
**Collection**: `products`
**Purpose**: Store inventory items.
- **Fields**:
  - `name`, `slug`, `sku` (String, required, unique sku per shop)
  - `brand`, `unit`, `description`, `categorySlug` (String)
  - `price`, `mrp`, `discountPrice` (Number)
  - `image`, `imageUrl`, `gallery` (Array/String)
  - `category` (ObjectId): Ref to `Category`
  - `shop` (ObjectId): Ref to `Shop`
  - `inStock`, `isActive` (Boolean)
  - `stockCount`, `stockQuantity` (Number)
  - `specifications`, `nutrition` (Mixed)

## 8. `shops` (Shop/Fulfillment)
**Collection**: `shops`
**Purpose**: Darkstore / Dispatch hubs.
- **Fields**:
  - `name` (String)
  - `address` (String)
  - `location`: GeoJSON Point `[lng, lat]`

## 9. `auditlogs` (System Audit Trail)
**Collection**: `auditlogs`
**Purpose**: Immutable tracking of sensitive system actions.
- **Fields**:
  - `user` (ObjectId): Ref to `User`
  - `action` (String, Enum): Action executed (e.g. `CREATE`, `UPDATE`)
  - `resource` (String): Entity affected
  - `resourceId` (String)
  - `createdAt` (Date): Immutable timestamp

## 10. `settings` (Platform Configuration)
**Collection**: `settings`
**Purpose**: Singleton document for global platform parameters.
- **Fields**:
  - `freeDeliveryThreshold` (Number)
  - `baseDeliveryFee` (Number)
  - `platformHandlingFee` (Number)

## Indexes and Performance
- `Order`: Indexed on `customer`, `rider`, `status`, `createdAt`
- `RiderProfile`: `2dsphere` index on `location` for finding nearby riders.
- `Address`: `2dsphere` index on `location`.

## Technical Debt & Observations
- **Coordinates Duplication**: Some models (`Order`, `Address`) store both `{ lat, lng }` AND GeoJSON `location: { type: 'Point', coordinates: [lng, lat] }`. This is redundant but currently required for backward compatibility.
- **Pincode vs ZipCode**: `pincode` was recently made optional on the `OrderSchema` because older snapshots used `zipCode`.
