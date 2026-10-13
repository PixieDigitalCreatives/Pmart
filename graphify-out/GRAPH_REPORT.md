# Graph Report - Pmart  (2026-10-13)

## Corpus Check
- 338 files · ~346,354 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 80 file(s) not represented in the graph (top: .scss 60, .xml 13, (none) 4)

## Summary
- 2327 nodes · 4959 edges · 177 communities (158 shown, 19 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 69 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Admin Layout & Navigation UI
- Common UI Modals & Feedback
- System Settings & Sockets
- Permissions & Rider Admin UI
- GSD Planning & Task Breakdown
- Catalog & Inventory Management
- Admin Operations & Audit Logging
- Database Performance & Index Audit
- Product Showcase & Router UI
- Order Tracking & Rider UI
- GSD Engineering Style & Standards
- Shop & Admin Dashboard Views
- Database Connection & Schema Core
- Administrative Staff Management
- Rider Dispatch & Realtime Location
- Address Management & Geo Checks
- Shop Management & Metrics API
- GSD Execution Protocol & Gates
- Firebase Auth & Token Lifecycle
- Order Lifecycle & State Machine
- Backend Testing & Config
- Systematic Debugging Protocols
- Auth Controller & User Onboarding
- Rider Delivery Verification Flow
- Codebase Mapping Workflows
- Env Routing Logger Module
- Module Component 26
- Module Component 27
- Module Component 28
- Module Component 29
- Module Component 30
- App Firebase Admin Module
- Module Component 32
- Module Component 33
- Module Component 34
- Module Component 35
- Module Component 36
- Module Component 37
- Otp Service Encryption Module
- Controller Order Http Module
- Route Auth Middleware Module
- Cart Controller Model Module
- Helpers Shop Address Module
- Module Component 43
- Errorboundary App Scrolltotop Module
- Module Component 45
- Package React Playwright Module
- Module Component 47
- Module Component 48
- Package Express Dependencies Module
- Test Auth Admin Module
- Module Component 51
- Module Component 52
- Module Component 53
- Module Component 54
- Marg Service Client Module
- Address Model Test Module
- Module Component 57
- Module Component 58
- Catalog Model Test Module
- Socket Test Tokenfor Module
- Module Component 61
- Module Component 62
- Module Component 63
- Package React Dom Module
- Validate Script All Module
- Module Component 66
- Route Address User Module
- Env Test Terms Module
- Order Lifecycle Test Module
- Module Component 70
- Module Component 71
- Livedeliverymap Trackingservice Routingservice Module
- Module Component 73
- Module Component 74
- Module Component 75
- Module Component 76
- Module Component 77
- Module Component 78
- Socket Package Env Module
- Routing Route Rate Module
- Routing Service Test Module
- Checkout Test Helpers Module
- Module Component 83
- Module Component 84
- Module Component 85
- Scanner Cjs Missinghtmlfor Module
- Module Component 87
- Module Component 88
- Module Component 89
- Module Component 90
- Module Component 91
- Module Component 92
- Admin Route Admincontroller Module
- Module Component 94
- Module Component 95
- Module Component 96
- Module Component 97
- Module Component 98
- Module Component 99
- Module Component 100
- Auth Model Authprovider Module
- Auth Route Authcontroller Module
- Order Route Checkoutlimiter Module
- Rider Route Candispatch Module
- Module Component 105
- Module Component 106
- Package React Playwright Module
- Module Component 108
- Module Component 109
- Catalog Route Authorizepermission Module
- Module Component 111
- Module Component 112
- Extract Mammoth Cjs Module
- Module Component 114
- Module Component 115
- Etaindicator Trackingpanel Deliveryotp Module
- Module Component 117
- Module Component 118
- Module Component 119
- Module Component 120
- Module Component 121
- Module Component 122
- Module Component 123
- Module Component 124
- Module Component 125
- Module Component 126
- Module Component 127
- Module Component 128
- Module Component 129
- Module Component 130
- Oxlintrc Rules React Module
- Livetrackingmap Package Maptiler Module
- Module Component 133
- Module Component 134
- Module Component 135
- Convert Execsync Path Module
- Module Component 137
- Module Component 138
- Module Component 139
- Module Component 140
- Module Component 141
- Module Component 142
- Module Component 143
- Module Component 144
- Migrate Cjs Ensureinputimport Module
- Migrate Btn Select Module
- Read Docx Module
- Package Scripts Build Module
- Module Component 149
- Firebase Package Firebaseconfig Module
- Vite Config Package Module
- Setup Search Check Module
- Module Component 153
- Inputs Cjs Path Module
- Module Component 155
- Module Component 156
- Module Component 157
- Module Component 158
- Inventory Cjs Path Module
- Module Component 161
- Module Component 162
- Module Component 163
- Module Component 164
- Search Repo Script Module

## God Nodes (most connected - your core abstractions)
1. `Button()` - 120 edges
2. `react` - 99 edges
3. `lucide-react` - 69 edges
4. `LoadingState()` - 57 edges
5. `apiErrorMessage()` - 56 edges
6. `EmptyState()` - 53 edges
7. `Input` - 49 edges
8. `AppRoutes()` - 46 edges
9. `react-router-dom` - 42 edges
10. `PageHeader()` - 41 edges

## Surprising Connections (you probably didn't know these)
- `GoogleSignInButton()` --indirect_call--> `auth()`  [INFERRED]
  src/components/common/GoogleSignInButton.jsx → backend/tests/helpers.js
- `canDispatch()` --calls--> `hasPermission()`  [EXTRACTED]
  backend/src/modules/rider/rider.route.js → backend/src/middleware/auth.middleware.js
- `main()` --calls--> `connectDB()`  [EXTRACTED]
  backend/src/scripts/db-init.js → backend/src/config/db.js
- `start()` --calls--> `initSocket()`  [EXTRACTED]
  backend/src/server.js → backend/src/config/socket.js
- `assertCatalogManager()` --calls--> `hasPermission()`  [EXTRACTED]
  backend/src/modules/catalog/catalog.controller.js → backend/src/middleware/auth.middleware.js

## Import Cycles
- None detected.

## Communities (177 total, 19 thin omitted)

### Community 0 - "Admin Layout & Navigation UI"
Cohesion: 0.09
Nodes (31): framer-motion, lucide-react, react, NAV, AddressFormModal(), DEFAULT_VIEW, EMPTY_FORM, toTenDigits() (+23 more)

### Community 1 - "Common UI Modals & Feedback"
Cohesion: 0.15
Nodes (37): ConfirmationModal(), EmptyState(), LoadingState(), PageHeader(), StatusBadge(), ToastContext, useToast(), AdminOrdersPage() (+29 more)

### Community 2 - "System Settings & Sockets"
Cohesion: 0.05
Nodes (46): canViewAllOrders(), initSocket(), money, mongoose, Settings, SettingsSchema, { Address }, { badRequest, conflict, forbidden } (+38 more)

### Community 3 - "Permissions & Rider Admin UI"
Cohesion: 0.14
Nodes (34): ALL_PERMISSIONS, PERMISSION_GROUPS, PermissionSelector(), EMPTY, RiderFormModal(), VEHICLES, ActivationLink(), EMPTY (+26 more)

### Community 4 - "GSD Planning & Task Breakdown"
Cohesion: 0.04
Nodes (46): `<action>`, Anti-Patterns to Avoid, Building Dependencies, Checklist Before Submitting Plans, Checkpoint Reached, Context Budget Rules, Dependency Graph, `<done>` (+38 more)

### Community 5 - "Catalog & Inventory Management"
Cohesion: 0.08
Nodes (26): activeShopIds(), assertCatalogManager(), CatalogController, { Category, Product, slugify }, categorySchema, { escapeRegExp }, { hasPermission }, isShopOwner() (+18 more)

### Community 6 - "Admin Operations & Audit Logging"
Cohesion: 0.05
Nodes (41): { AuditLog, AuditAction, recordAudit }, { AuthService }, CLOSED, { createRiderAccount }, employeeCreateSchema, employeeUpdateSchema, { escapeRegExp }, { hashPassword } (+33 more)

### Community 7 - "Database Performance & Index Audit"
Cohesion: 0.05
Nodes (42): 10. Audit Sign-Off & Verification Evidence, 1. Executive Summary & Migration Verdict, 1. Missing Compound Indexes (~55% of Current Latency), 1. `products` Collection (`backend/src/modules/catalog/catalog.model.js`), 2. API Endpoint & Database Query Catalog (Slowest Endpoints Audit), 2. Application-Level Processing & N+1 Cascades (~25% of Current Latency), 2. `orders` Collection (`backend/src/modules/order/order.model.js`), 3.1 Documentation vs Code Reality Discrepancy (+34 more)

### Community 8 - "Product Showcase & Router UI"
Cohesion: 0.15
Nodes (27): react-router-dom, AdminLayout(), ProductCard(), ProductCarousel(), RiderLayout(), Select, CategoryPage(), HelpPage() (+19 more)

### Community 9 - "Order Tracking & Rider UI"
Cohesion: 0.12
Nodes (28): AssignRiderPanel(), OrderStatusTimeline(), PaymentStatusBadge(), ShopTrackRiderModal(), useLiveTracking(), TABS, HEADLINES, LIVE_STATUSES (+20 more)

### Community 10 - "GSD Engineering Style & Standards"
Cohesion: 0.06
Nodes (34): Anti-Patterns to Avoid, Banners, Brevity with Substance, Checkpoint Structure, Commit Conventions, Context Engineering, Core Philosophy, Decision Gates (+26 more)

### Community 11 - "Shop & Admin Dashboard Views"
Cohesion: 0.11
Nodes (24): NAV, ShopContext, useMyShop(), AdminDashboardPage(), inr(), Kpi(), AdminLiveDeliveriesPage(), FILTERS (+16 more)

### Community 12 - "Database Connection & Schema Core"
Cohesion: 0.08
Nodes (26): connectDB(), { env }, { logger }, mongoose, arg(), { connectDB }, main(), mongoose (+18 more)

### Community 13 - "Administrative Staff Management"
Cohesion: 0.14
Nodes (10): AdminController, assertEmailFree(), assertPhoneFree(), recordAudit(), assignRider(), loadOrder(), normalizeShopInput(), conflict() (+2 more)

### Community 14 - "Rider Dispatch & Realtime Location"
Cohesion: 0.08
Nodes (25): emitRiderLocation(), { AuthService }, createRiderAccount(), { emitOrderUpdate, emitRiderLocation }, loadProfile(), locationSchema, { notFound, conflict, forbidden }, { Order, OrderStatus } (+17 more)

### Community 15 - "Address Management & Geo Checks"
Cohesion: 0.10
Nodes (17): { Address, AddressLabel }, AddressController, addressSchema, clearDefault(), { env }, { findServingShops }, { notFound, conflict, HttpError }, { parseLatLng } (+9 more)

### Community 16 - "Shop Management & Metrics API"
Cohesion: 0.09
Nodes (22): addressSchema, adminUpdateShopSchema, computeShopMetrics(), createShopSchema, findOwnShop(), { hashPassword }, mongoose, { notFound, conflict, badRequest } (+14 more)

### Community 17 - "GSD Execution Protocol & Gates"
Cohesion: 0.07
Nodes (29): Anti-Patterns, ✅ Atomic commits, Authentication Gates, Checkpoint Protocol, Checkpoint Return Format, Checkpoint Types, Confirm the commit landed, Continuation Handling (+21 more)

### Community 18 - "Firebase Auth & Token Lifecycle"
Cohesion: 0.12
Nodes (17): getFirebaseAuth(), AuthService, crypto, { env }, { getFirebaseAuth }, { hashPassword, verifyPassword, hashToken }, { HttpError, unauthorized, conflict, badRequest, notFound }, jwt (+9 more)

### Community 19 - "Order Lifecycle & State Machine"
Cohesion: 0.10
Nodes (23): hasPermission(), exportOrdersCsv(), ACTORS, applyStatusChange(), assertCanView(), { assertObjectId }, { hasPermission }, markDelivered() (+15 more)

### Community 20 - "Backend Testing & Config"
Cohesion: 0.07
Nodes (28): author, description, devDependencies, jest, mongodb-memory-server, nodemon, socket.io-client, supertest (+20 more)

### Community 21 - "Systematic Debugging Protocols"
Cohesion: 0.07
Nodes (27): 3-Strike Rule, Binary Search / Divide and Conquer, CHECKPOINT REACHED, Cognitive Biases to Avoid, Comment Out Everything, Core Philosophy, DEBUG.md Structure, Debugging Techniques (+19 more)

### Community 22 - "Auth Controller & User Onboarding"
Cohesion: 0.10
Nodes (15): activateSchema, AuthController, { AuthService }, changePasswordSchema, completeProfileSchema, { env }, googleSchema, { logger } (+7 more)

### Community 23 - "Rider Delivery Verification Flow"
Cohesion: 0.18
Nodes (18): CollectPaymentSection(), DeliveryCompletionScreen(), DeliveryVerificationSection(), ActiveDeliveryCard(), LABELS, RiderContext, useRider(), Card() (+10 more)

### Community 24 - "Codebase Mapping Workflows"
Cohesion: 0.07
Nodes (26): 0. Delegate the Mapping, 10. Offer Next Steps, 1. Validate Project, 2. Analyze Project Structure, 2a. Directory Analysis, 2b. Entry Points, 2c. Component Detection, 3. Analyze Dependencies (+18 more)

### Community 25 - "Env Routing Logger Module"
Cohesion: 0.10
Nodes (21): dotenv, envSchema, { logger }, parsed, path, WEAK_SECRETS, { z }, errorHandler() (+13 more)

### Community 26 - "Module Component 26"
Cohesion: 0.15
Nodes (12): Documentation Synchronization Rules, Permanent Project Instruction: Mandatory Documentation Synchronization, PMart Feature Status Matrix, B1. Secrets and configuration, B2. Authentication and access control, B3. Input and application attacks, B4. API and infrastructure, B5. Monitoring and resilience (+4 more)

### Community 27 - "Module Component 27"
Cohesion: 0.08
Nodes (24): API Route Stubs, Core Principle, GSD Verifier Agent, Level 1: Existence, Level 2: Substantive, Level 3: Wired, React Component Stubs, Step 0: Check for Previous Verification (+16 more)

### Community 28 - "Module Component 28"
Cohesion: 0.08
Nodes (23): 10. Offer Next Steps, 1. Validate Environment (Planning Lock), 2. Parse and Normalize Arguments, 3. Validate Phase, 4. Ensure Phase Directory, 5. Handle Research, 6. Create Plans, 6a. Gather Context (+15 more)

### Community 29 - "Module Component 29"
Cohesion: 0.10
Nodes (20): Checking Process, Dimension 1: Requirement Coverage, Dimension 2: Task Completeness, Dimension 3: Dependency Correctness, Dimension 4: Key Links Planned, Dimension 5: Scope Sanity, Dimension 6: Verification Derivation, GSD Plan Checker Agent (+12 more)

### Community 30 - "Module Component 30"
Cohesion: 0.10
Nodes (19): 10. Offer Next Steps, 1. Validate Environment, 2. Validate Phase Exists, 3. Ensure Phase Directory Exists, 4. Discover Plans, 5. Group Plans by Wave, 6. Execute Waves, 6a. Check Delegation Capability (+11 more)

### Community 31 - "App Firebase Admin Module"
Cohesion: 0.11
Nodes (18): app, cookieParser, cors, crypto, { env }, { errorHandler, notFoundHandler }, express, helmet (+10 more)

### Community 32 - "Module Component 32"
Cohesion: 0.11
Nodes (18): 0. Delegate to a Fresh Verifier, 1. Load Verification Context, 2. Extract Must-Haves, 3. Verify Each Must-Have, 3a. Determine Verification Method, 3b. Execute Verification, 3c. Record Evidence, 4. Create Verification Report (+10 more)

### Community 33 - "Module Component 33"
Cohesion: 0.11
Nodes (18): Anti-Patterns, ❌ Broad Searches, Context Efficiency Metrics, Context Fetch Skill, Inputs, Integration with GSD, ❌ Loading Everything First, Outputs (+10 more)

### Community 34 - "Module Component 34"
Cohesion: 0.11
Nodes (18): 1. Progressive Loading, 2. Just-In-Time Loading, 3. Search Before Load, 4. Summarize & Compress, Anti-Patterns, At 50% Budget, At 70% Budget, Before Each Task (+10 more)

### Community 35 - "Module Component 35"
Cohesion: 0.11
Nodes (17): 1. Structure Analysis, 2. Dependency Analysis, 3. Pattern Analysis, 4. Integration Analysis, 5. Technical Debt Analysis, Analysis Domains, ARCHITECTURE.md, Checklist (+9 more)

### Community 36 - "Module Component 36"
Cohesion: 0.13
Nodes (16): 1. Parse Arguments, 2a. Action: New Sprint, 2b. Action: Status, 2c. Action: Close, Archive Sprint, Commit, Create Sprint File, Display Result (+8 more)

### Community 37 - "Module Component 37"
Cohesion: 0.12
Nodes (16): Anti-Patterns, Automatic Compression Points, Compression Format Templates, Compression Strategies, Compression Triggers, Context Compressor Skill, Decompression Protocol, Diff Template (+8 more)

### Community 38 - "Otp Service Encryption Module"
Cohesion: 0.16
Nodes (12): env, DeliveryVerification, bcrypt, crypto, { DeliveryVerification }, { encryptOtp, decryptOtp }, { env }, crypto (+4 more)

### Community 39 - "Controller Order Http Module"
Cohesion: 0.29
Nodes (6): emitOrderUpdate(), OrderController, respondWithOrder(), badRequest(), forbidden(), runInTransaction()

### Community 40 - "Route Auth Middleware Module"
Cohesion: 0.15
Nodes (14): authorize(), { env }, jwt, PASSWORD_CHANGE_EXEMPT, { User, UserRole }, UserRole, { CartController }, { protect, authorize } (+6 more)

### Community 41 - "Cart Controller Model Module"
Cohesion: 0.14
Nodes (12): { Cart }, CartController, liveItems(), mongoose, { Product }, { Shop }, syncSchema, { z } (+4 more)

### Community 42 - "Helpers Shop Address Module"
Cohesion: 0.13
Nodes (16): { Address }, app, { Category, Product }, createRider(), createUser(), { hashPassword }, jwt, models (+8 more)

### Community 43 - "Module Component 43"
Cohesion: 0.12
Nodes (17): 10. Tests executed, 11. Test results, 12. Browser verification, 13. Manual verification requirements, 14. Remaining issues, 15. Technical debt, 16. Final acceptance matrix, 1. Bugs found (+9 more)

### Community 44 - "Errorboundary App Scrolltotop Module"
Cohesion: 0.19
Nodes (8): App(), ErrorBoundary, ToastContainer(), AuthProvider(), CartProvider(), LocationProvider(), ToastProvider(), ScrollToTop()

### Community 45 - "Module Component 45"
Cohesion: 0.13
Nodes (14): Action Items, Daily Log, Day 1 (YYYY-MM-DD), Day 2 (YYYY-MM-DD), Explicitly Excluded, Goal, Included, Retrospective (end of sprint) (+6 more)

### Community 46 - "Package React Playwright Module"
Cohesion: 0.13
Nodes (14): socket.io-client, name, private, type, version, axios, maplibre-gl, oxlint (+6 more)

### Community 47 - "Module Component 47"
Cohesion: 0.14
Nodes (13): 1. Initialize Debug Session, 1b. Delegate to a Fresh Debugger, 2. Document Symptom, 3. Gather Evidence, 4. Form Hypotheses, 5. Test Hypotheses, 6. Apply Fix (If Root Cause Found), 7. Handle 3-Strike Rule (+5 more)

### Community 48 - "Module Component 48"
Cohesion: 0.14
Nodes (13): Auto-Save Protocol, Behavior Rules, Context Health Monitor, Integration, Purpose, Rule 1: The 3-Strike Rule, Rule 2: Circular Detection, Rule 3: Uncertainty Logging (+5 more)

### Community 49 - "Package Express Dependencies Module"
Cohesion: 0.14
Nodes (14): dependencies, bcryptjs, cookie-parser, cors, dotenv, express, express-rate-limit, firebase-admin (+6 more)

### Community 50 - "Test Auth Admin Module"
Cohesion: 0.16
Nodes (10): { AuditLog }, { RiderProfile }, { startDb, stopDb, clearDb, api, auth, createUser, createShop, createRider, marketplace, placeOrder, NEAR }, { User }, { AuthService }, { startDb, stopDb, clearDb, api, auth, createUser }, { User }, clearDb() (+2 more)

### Community 51 - "Module Component 51"
Cohesion: 0.14
Nodes (14): 10. `auditlogs`, 11. `settings`, 1. `users`, 2. `shops`, 3. `categories`, 4. `products`, 5. `carts`, 6. `addresses` (+6 more)

### Community 52 - "Module Component 52"
Cohesion: 0.14
Nodes (14): Commit Conventions, Context Management, Core Protocol, Delegation, Model Independence, Permanent Project Instruction: Mandatory Documentation Synchronization, PROJECT_RULES.md — GSD Canonical Rules, Proof Requirements (+6 more)

### Community 53 - "Module Component 53"
Cohesion: 0.15
Nodes (12): /new-project Workflow, Phase 10: Done, Phase 1: Setup, Phase 2: Brownfield Offer, Phase 3: Deep Questioning, Phase 4: Write SPEC.md, Phase 5: Research Decision, Phase 6: Define Requirements (+4 more)

### Community 54 - "Module Component 54"
Cohesion: 0.15
Nodes (12): API Endpoint Verification, Before Marking Any Task "Done", Build Verification, Core Principle, Empirical Validation, Examples, Failure Handling, Forbidden Phrases (+4 more)

### Community 56 - "Address Model Test Module"
Cohesion: 0.17
Nodes (9): Address, AddressLabel, AddressSchema, mongoose, { Address }, { Shop }, { startDb, stopDb, clearDb, api, auth, createUser, createShop, NEAR, FAR }, FAR (+1 more)

### Community 57 - "Module Component 57"
Cohesion: 0.15
Nodes (13): 10. Delivery code and fees, 11. Sessions, 12. Google sign-in availability, 1. Frontend Language & Architecture, 2. MARG ERP Integration, 3. Delivery OTP, 4. Payment Architecture, 5. Order State Machine (+5 more)

### Community 58 - "Module Component 58"
Cohesion: 0.15
Nodes (10): PMart Acceptance Tests, 1. Functional, 2. Security and access, 3. Concurrency and data integrity, 4. Not yet covered, PMart Master Test Cases, Backend (automated), Manual browser run (how the 2026-10-13 verification was done) (+2 more)

### Community 59 - "Catalog Model Test Module"
Cohesion: 0.21
Nodes (10): Category, CategorySchema, mongoose, Product, ProductSchema, { Product }, { startDb, stopDb, clearDb, api, auth, createUser, createShop, createCategory, createProduct }, storeWithProducts() (+2 more)

### Community 60 - "Socket Test Tokenfor Module"
Cohesion: 0.20
Nodes (10): tokenFor(), app, { createServer }, { initSocket }, { io: connect }, joinOrder(), once(), open() (+2 more)

### Community 61 - "Module Component 61"
Cohesion: 0.17
Nodes (12): Addresses — `/addresses` (customer), Admin console — `/admin` (ADMIN or EMPLOYEE with the listed permission; mutations rate-limited), Auth — `/auth`, Cart — `/cart` (customer), Catalog management — `/manage`, Orders — `/orders`, PMart API Reference, Profile — `/users` (+4 more)

### Community 62 - "Module Component 62"
Cohesion: 0.17
Nodes (11): 1. SPEC.md (Finalized), 2. ROADMAP.md (Phase Entry), 3. PLAN 1.1 (Wave 1), 4. Wave 1 Execution, 5. Wave 1 State Snapshot, 6. PLAN 1.2 (Wave 2), 7. Wave 2 Execution & Snapshot, 8. Verification (+3 more)

### Community 63 - "Module Component 63"
Cohesion: 0.17
Nodes (11): {Category 1}, {Category 2}, Configuration, Core Technologies, Dependencies, External Dependencies, File Size Inventory, Infrastructure (+3 more)

### Community 64 - "Package React Dom Module"
Cohesion: 0.17
Nodes (12): dependencies, axios, firebase, framer-motion, lucide-react, maplibre-gl, @maptiler/sdk, react (+4 more)

### Community 65 - "Validate Script All Module"
Cohesion: 0.17
Nodes (6): validate-agents.sh script, validate-all.sh script, validate-encoding.sh script, validate-skills.sh script, validate-templates.sh script, validate-workflows.sh script

### Community 66 - "Module Component 66"
Cohesion: 0.18
Nodes (10): 1. Verify All Phases Complete, 2. Run Final Verification, 3. Generate Milestone Summary, 4. Archive Current State, 5. Reset for Next Milestone, 5c. Refresh Architecture, 5d. Update Requirements, 6. Commit and Tag (+2 more)

### Community 67 - "Route Address User Module"
Cohesion: 0.20
Nodes (9): protect(), { AddressController }, { protect, authorize }, { Router }, { UserRole }, { protect }, { Router }, { UserController } (+1 more)

### Community 68 - "Env Test Terms Module"
Cohesion: 0.18
Nodes (6): backendDir, path, { spawnSync }, cp, report, terms

### Community 69 - "Order Lifecycle Test Module"
Cohesion: 0.33
Nodes (10): api(), auth(), placeOrder(), { Order }, otpFor(), { Product }, readyOrder(), { RiderProfile } (+2 more)

### Community 70 - "Module Component 70"
Cohesion: 0.18
Nodes (11): 10. Recommended first tasks, 1. Summary, 2. Stack, 3. Repository layout, 4. Running locally, 5. Authentication and access, 6. Order lifecycle, 7. Portals (+3 more)

### Community 71 - "Module Component 71"
Cohesion: 0.18
Nodes (10): Commits, Deliverables, Lessons Learned, Next Steps, Objective, Phase {N} Summary, Plan {N}.1: {Plan Name}, Plan {N}.2: {Plan Name} (+2 more)

### Community 72 - "Livedeliverymap Trackingservice Routingservice Module"
Cohesion: 0.29
Nodes (6): hasWebGL(), LiveDeliveryMap(), log(), getRoute(), TERMINAL, trackingService

### Community 73 - "Module Component 73"
Cohesion: 0.20
Nodes (9): 1. Parse Arguments, 2. Validate Position, 3. Gather Phase Information, 4. Renumber Existing Phases, 5. Insert New Phase, 6. Update STATE.md, 7. Commit, 8. Display Result (+1 more)

### Community 74 - "Module Component 74"
Cohesion: 0.20
Nodes (9): 1. Validate SPEC Exists, 2. Gather Milestone Information, 3. Generate Phase Breakdown, 4. Update ROADMAP.md, 5. Update STATE.md, 5b. Reset Session Files (if starting fresh), 6. Commit, 7. Offer Next Steps (+1 more)

### Community 75 - "Module Component 75"
Cohesion: 0.20
Nodes (9): 1. Capture Current State, 2. Add Journal Entry, 3. Commit State, 4. Display Handoff, Auto-Save Protocol, Minimum Auto-Save Content, /pause Workflow, Proactive Auto-Save (Session Limit Protection) (+1 more)

### Community 76 - "Module Component 76"
Cohesion: 0.20
Nodes (9): 1. Validate Phase Exists, 2. Check Phase Status, 3. Check for Dependencies, 4. Confirm Removal, 5. Remove Phase, 6. Update STATE.md, 7. Commit, 8. Display Result (+1 more)

### Community 77 - "Module Component 77"
Cohesion: 0.20
Nodes (9): 0. Delegate the Research, 1. Load Phase Context, 2. Identify Research Questions, 3. Conduct Research, 4. Generate RESEARCH.md, 5. Commit Research, 6. Offer Next Steps, Discovery Levels (+1 more)

### Community 78 - "Module Component 78"
Cohesion: 0.20
Nodes (9): 1. Formulate Query, 2. Execute Search, 3. Analyze Results, 4. Summarize Findings, 5. Offer Next Steps, Integration with GSD, Related, /web-search Workflow (+1 more)

### Community 79 - "Socket Package Env Module"
Cohesion: 0.20
Nodes (8): { env }, jwt, { logger }, mongoose, rooms, { Server }, jsonwebtoken, socket.io

### Community 80 - "Routing Route Rate Module"
Cohesion: 0.24
Nodes (8): limiter(), rateLimit, getRoute(), { getRoute }, { limiter }, { protect }, { Router }, express-rate-limit

### Community 81 - "Routing Service Test Module"
Cohesion: 0.29
Nodes (3): RoutingService, osrmResponse, { RoutingService }

### Community 82 - "Checkout Test Helpers Module"
Cohesion: 0.24
Nodes (9): { Cart }, { Order }, { Product }, { Settings }, { Shop }, { startDb, stopDb, clearDb, api, auth, createUser, createAddress, createProduct, marketplace, placeOrder, FAR }, createAddress(), createProduct() (+1 more)

### Community 83 - "Module Component 83"
Cohesion: 0.20
Nodes (9): Common Operations, Cross-Platform Commands Reference, Environment Detection, /execute — Discover Plans, Git Operations (Same on Both), /map — Analyze Codebase, /plan — Check SPEC Status, /verify — Search TODOs (+1 more)

### Community 84 - "Module Component 84"
Cohesion: 0.20
Nodes (9): GSD Workflow Example, Quick Commands Reference, Scenario: Building a Simple Todo API, Step 1: Define the Spec, Step 2: Map the Codebase (if existing), Step 3: Plan the Phases, Step 4: Execute the Phase, Step 5: Verify the Work (+1 more)

### Community 85 - "Module Component 85"
Cohesion: 0.20
Nodes (9): As a {user type}, Constraints, Goals, Non-Goals (Out of Scope), SPEC.md — Project Specification, Success Criteria, Technical Requirements (Optional), User Stories (Optional) (+1 more)

### Community 86 - "Scanner Cjs Missinghtmlfor Module"
Cohesion: 0.20
Nodes (9): fs, missingHtmlFor, missingLabels, path, unmigratedButtons, unmigratedInputs, unmigratedModals, unmigratedSelects (+1 more)

### Community 87 - "Module Component 87"
Cohesion: 0.22
Nodes (9): Anti-Patterns, Code Execution, Context Loading Pattern, Context Window Optimization, Flash vs Pro, Gemini Adapter, Grounding, Integration with .gemini/ (+1 more)

### Community 88 - "Module Component 88"
Cohesion: 0.22
Nodes (8): Anti-Patterns, Context Optimization, Function Calling, GPT Models, GPT & Open Source Models Adapter, Model Selection, Model-Specific Files, Shorter Context Strategies

### Community 89 - "Module Component 89"
Cohesion: 0.22
Nodes (8): 1. Validate Roadmap Exists, 2. Determine Next Phase Number, 3. Gather Phase Information, 4. Add to ROADMAP.md, 5. Update STATE.md, 6. Commit, 7. Offer Next Steps, /add-phase Workflow

### Community 90 - "Module Component 90"
Cohesion: 0.22
Nodes (8): 1. Load Gap Information, 2. Categorize Gaps, 3. Create Gap Closure Phase, 4. Create PLAN.md for Each Gap, 5. Update STATE.md, 6. Commit Plans, 7. Offer Execution, /plan-milestone-gaps Workflow

### Community 91 - "Module Component 91"
Cohesion: 0.22
Nodes (8): 1. Check Current Version, 2. Fetch Latest from GitHub, 3. Compare Versions, 4. Show Changes, 5. Apply Updates, 6. Cleanup, 7. Confirm, /update Workflow

### Community 92 - "Module Component 92"
Cohesion: 0.22
Nodes (8): Handling Results, Inline Fallback, Invocation, Requirements, Subagent Delegation Protocol, Tool Grants, What to Delegate, Workspace Isolation

### Community 93 - "Admin Route Admincontroller Module"
Cohesion: 0.22
Nodes (8): { AdminController }, { limiter }, mutationLimiter, { OrderController, exportOrdersCsv }, { protect, authorize, authorizePermission: can }, { Router }, { ShopController }, { UserRole }

### Community 94 - "Module Component 94"
Cohesion: 0.22
Nodes (8): Architecture, Component A, Component B, Components, Conventions, Data Flow, Overview, Technical Debt

### Community 95 - "Module Component 95"
Cohesion: 0.22
Nodes (8): Accomplished, Blockers Encountered, Handoff Notes, JOURNAL.md — Session Log, Objective, Session: YYYY-MM-DD HH:MM, Sessions, Verification

### Community 96 - "Module Component 96"
Cohesion: 0.25
Nodes (7): Anti-Patterns, Artifacts Mode, Claude Adapter, Context Optimization, Effort Levels, Extended Thinking Mode, File Conventions

### Community 97 - "Module Component 97"
Cohesion: 0.25
Nodes (7): 1. Load Milestone Context, 2. Check Must-Haves Verification, 3. Review Technical Debt, 4. Analyze Phase Quality, 5. Generate Audit Report, 6. Offer Actions, /audit-milestone Workflow

### Community 98 - "Module Component 98"
Cohesion: 0.25
Nodes (7): 1. Load Phase Context, 2. Analyze Requirements, 3. Present Discussion Points, 4. Gather User Input, 5. Document Decisions, 6. Offer Next Steps, /discuss-phase Workflow

### Community 99 - "Module Component 99"
Cohesion: 0.25
Nodes (7): 1. Check for Existing Installation, 2. Clone from GitHub, 3. Copy Files, 4. Cleanup, 5. Add to .gitignore (Optional), 6. Confirm Installation, /install Workflow

### Community 100 - "Module Component 100"
Cohesion: 0.25
Nodes (7): 1. Load Saved State, 2. Display Context, 3. Load Recent Journal, 4. Check for Conflicts, 5. Update State, 6. Suggest Action, /resume Workflow

### Community 101 - "Auth Model Authprovider Module"
Cohesion: 0.25
Nodes (5): AuthProvider, { E164_REGEX }, mongoose, PERMISSIONS, UserSchema

### Community 102 - "Auth Route Authcontroller Module"
Cohesion: 0.25
Nodes (7): { AuthController }, { limiter }, loginLimiter, passwordLimiter, { protect }, registerLimiter, { Router }

### Community 103 - "Order Route Checkoutlimiter Module"
Cohesion: 0.25
Nodes (7): checkoutLimiter, { limiter }, { OrderController }, otpLimiter, { protect, authorize }, { Router }, { UserRole }

### Community 104 - "Rider Route Candispatch Module"
Cohesion: 0.25
Nodes (7): canDispatch(), { limiter }, locationLimiter, { protect, authorize, hasPermission }, { RiderController }, { Router }, { UserRole }

### Community 105 - "Module Component 105"
Cohesion: 0.25
Nodes (6): Done in the 2026-10-13 rebuild (for reference), P0 — before going live, P1, P2 — housekeeping, PMart Remaining Work, PMart Remaining Work

### Community 106 - "Module Component 106"
Cohesion: 0.25
Nodes (7): All Commands, Core Rules, GSD Quick Reference Card, Key Files, Priority Indicators, Workflow Lifecycle, XML Task Structure

### Community 107 - "Package React Playwright Module"
Cohesion: 0.25
Nodes (8): devDependencies, oxlint, playwright, @playwright/test, @types/react, @types/react-dom, vite, @vitejs/plugin-react

### Community 108 - "Module Component 108"
Cohesion: 0.25
Nodes (8): Authentication, Authorization, Data, Delivery code, Known issues, PMart Security, Rate limits (production; off in development unless `RATE_LIMIT_IN_DEV=true`), Transport and headers

### Community 109 - "Module Component 109"
Cohesion: 0.29
Nodes (6): 1. Load Phase Plans, 2. Extract Assumptions, 3. Categorize Assumptions, 4. Display Assumptions, 5. Offer Validation, /list-phase-assumptions Workflow

### Community 110 - "Catalog Route Authorizepermission Module"
Cohesion: 0.29
Nodes (6): authorizePermission(), { CatalogController }, { limiter }, { protect, authorizePermission }, { Router }, searchLimiter

### Community 111 - "Module Component 111"
Cohesion: 0.29
Nodes (6): 1. Verify identity out of band, 2. Set a temporary password (database administrator only), 3. Hand over securely, 4. Record it, Manual procedure, PMart Account Recovery Procedure

### Community 112 - "Module Component 112"
Cohesion: 0.29
Nodes (6): A1. Design Tokens & SCSS Variables, A2. Shared Components, A3. Existing Visual Inconsistencies, A4. Responsive & Accessible Behavior, A5. UI Verification Plan, PMart UI Consistency Audit

### Community 114 - "Module Component 114"
Cohesion: 0.29
Nodes (6): 1. Rate Limiting, 2. CORS Policy, 3. Checkout Idempotency & Invariants, 4. Admin / Privilege Protection, Conclusion, PMart Security & Business Invariant Verification Audit

### Community 115 - "Module Component 115"
Cohesion: 0.29
Nodes (7): Commands, Documentation, How an order flows, License, PMart — Quick-Commerce Grocery Platform, Project layout, Quick start

### Community 116 - "Etaindicator Trackingpanel Deliveryotp Module"
Cohesion: 0.52
Nodes (5): DeliveryOTP(), ETAIndicator(), RiderInfoCard(), TrackingPanel(), TrackingStatus()

### Community 117 - "Module Component 117"
Cohesion: 0.33
Nodes (5): 1. Parse Arguments, 2. Ensure TODO.md Exists, 3. Add Todo Item, 4. Confirm, /add-todo Workflow

### Community 118 - "Module Component 118"
Cohesion: 0.33
Nodes (5): 1. Load Current State, 2. Calculate Progress, 3. Display Status, 4. Suggest Action, /progress Workflow

### Community 119 - "Module Component 119"
Cohesion: 0.33
Nodes (5): 1. Read CHANGELOG.md, 2. Display Recent Changes, Related, /whats-new Workflow, Workflows

### Community 120 - "Module Component 120"
Cohesion: 0.33
Nodes (5): Debugging Rules, Invocation Contract, Return Contract, Shell Discipline, System Prompt

### Community 121 - "Module Component 121"
Cohesion: 0.33
Nodes (5): Execution Rules, Invocation Contract, Return Contract, Shell Discipline, System Prompt

### Community 122 - "Module Component 122"
Cohesion: 0.33
Nodes (5): Invocation Contract, Planning Rules, Return Contract, Self-Check Before Returning, System Prompt

### Community 123 - "Module Component 123"
Cohesion: 0.33
Nodes (5): Invocation Contract, Research Rules, Return Contract, Shell Discipline, System Prompt

### Community 124 - "Module Component 124"
Cohesion: 0.33
Nodes (5): Invocation Contract, Return Contract, Shell Discipline, System Prompt, Verification Rules

### Community 125 - "Module Component 125"
Cohesion: 0.33
Nodes (5): Backend — `backend/.env`, Dev-server only (shell environment, not `.env`), PMart Environment Reference, Rotate now, Web app — `.env` in the project root (Vite, `VITE_*` values are public)

### Community 126 - "Module Component 126"
Cohesion: 0.33
Nodes (6): Canonical Rules, Core Principles, Gemini-Specific Tips, GSD Methodology — Mission Control Rules, Quick Reference, Workflow Integration

### Community 127 - "Module Component 127"
Cohesion: 0.33
Nodes (5): Context Template, File Template, Guidelines, How to Use, When to Create

### Community 128 - "Module Component 128"
Cohesion: 0.33
Nodes (5): Debug Template, File Template, Lifecycle, Resume Behavior, Section Rules

### Community 129 - "Module Component 129"
Cohesion: 0.33
Nodes (5): Integration with STATE.md, Minimal Snapshot (Debug Session), State Snapshot Template, Template, When to Use

### Community 130 - "Module Component 130"
Cohesion: 0.33
Nodes (5): Add to .env.local, File Template, Guidelines, Test the connection, User Setup Template

### Community 131 - "Oxlintrc Rules React Module"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 132 - "Livetrackingmap Package Maptiler Module"
Cohesion: 0.53
Nodes (5): @maptiler/sdk, hasWebGL(), LiveTrackingMap(), log(), toLatLng()

### Community 133 - "Module Component 133"
Cohesion: 0.33
Nodes (5): 1. Schema Changes, 2. API Endpoint Changes, 3. Legacy User Account Migration & Recovery Process, 4. Security Audit, Authentication Migration Plan

### Community 134 - "Module Component 134"
Cohesion: 0.33
Nodes (5): 1. Outstanding User Requests, 2. Work Accomplished, 3. Current State, 4. Next Steps, Session Summary: Error Boundary Verification and IDOR Fixes

### Community 135 - "Module Component 135"
Cohesion: 0.40
Nodes (4): 1. Load TODO.md, 2. Parse and Filter, 3. Display, /check-todos Workflow

### Community 136 - "Convert Execsync Path Module"
Cohesion: 0.40
Nodes (3): { execSync }, fs, path

### Community 137 - "Module Component 137"
Cohesion: 0.40
Nodes (4): Discovery Template, File Template, Output Structure, When to Use

### Community 138 - "Module Component 138"
Cohesion: 0.40
Nodes (4): File Template, Guidelines, Lifecycle, Milestone Template

### Community 139 - "Module Component 139"
Cohesion: 0.40
Nodes (4): File Template, Guidelines, Project Template, Status Flow

### Community 140 - "Module Component 140"
Cohesion: 0.40
Nodes (4): File Template, Guidelines, Roadmap Template, Status Icons

### Community 141 - "Module Component 141"
Cohesion: 0.40
Nodes (4): File Template, Resume Protocol, State Template, Update Rules

### Community 142 - "Module Component 142"
Cohesion: 0.40
Nodes (4): Format, Items, Priority Levels, TODO.md — Pending Items

### Community 143 - "Module Component 143"
Cohesion: 0.40
Nodes (4): Quick Report (Minimal), Template, Token Report Template, When to Create

### Community 144 - "Module Component 144"
Cohesion: 0.40
Nodes (4): File Template, Test Case Guidelines, UAT Template, Usage Guidelines

### Community 145 - "Migrate Cjs Ensureinputimport Module"
Cohesion: 0.40
Nodes (3): fs, path, walkDir()

### Community 146 - "Migrate Btn Select Module"
Cohesion: 0.40
Nodes (3): fs, path, walkDir()

### Community 148 - "Package Scripts Build Module"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, preview

### Community 149 - "Module Component 149"
Cohesion: 0.40
Nodes (5): Budget Thresholds, Compression Protocol, Loading Rules, Per-Wave Efficiency, Token Efficiency Rules

### Community 150 - "Firebase Package Firebaseconfig Module"
Cohesion: 0.40
Nodes (4): firebase, firebaseConfig, googleProvider, isGoogleSignInConfigured

### Community 151 - "Vite Config Package Module"
Cohesion: 0.40
Nodes (3): vite, @vitejs/plugin-react, __dirname

### Community 152 - "Setup Search Check Module"
Cohesion: 0.70
Nodes (4): check_fd(), check_ripgrep(), setup_search.sh script, suggest_install()

### Community 153 - "Module Component 153"
Cohesion: 0.50
Nodes (4): General Guidance, Local Deployment, Open Source Models, Recommended Patterns

### Community 154 - "Inputs Cjs Path Module"
Cohesion: 0.50
Nodes (3): fs, path, walkDir()

### Community 155 - "Module Component 155"
Cohesion: 0.50
Nodes (3): Decisions, DECISIONS.md — Architecture Decision Records, Template

### Community 156 - "Module Component 156"
Cohesion: 0.50
Nodes (3): PLAN.md Template, Task Types, Wave Assignment

### Community 157 - "Module Component 157"
Cohesion: 0.50
Nodes (3): File Template, Guidelines, Requirements Template

### Community 158 - "Module Component 158"
Cohesion: 0.50
Nodes (3): File Template, Guidelines, Summary Template

### Community 159 - "Inventory Cjs Path Module"
Cohesion: 0.50
Nodes (3): fs, path, walkDir()

### Community 161 - "Module Component 161"
Cohesion: 0.67
Nodes (3): Current documentation, Historical (pre-rebuild, kept for reference), PMart Developer Handover Index

## Knowledge Gaps
- **797 isolated node(s):** `jest`, `nodemon`, `socket.io-client`, `sass`, `socket.io-client` (+792 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1401 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `auth()` connect `Order Lifecycle Test Module` to `Permissions & Rider Admin UI`, `Helpers Shop Address Module`, `Test Auth Admin Module`, `Checkout Test Helpers Module`, `Address Model Test Module`, `Catalog Model Test Module`, `Socket Test Tokenfor Module`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **What connects `jest`, `nodemon`, `socket.io-client` to the rest of the system?**
  _797 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admin Layout & Navigation UI` be split into smaller, more focused modules?**
  _Cohesion score 0.09350547730829421 - nodes in this community are weakly interconnected._
- **Why does `GoogleSignInButton()` connect `Permissions & Rider Admin UI` to `Admin Layout & Navigation UI`, `Order Lifecycle Test Module`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Should `System Settings & Sockets` be split into smaller, more focused modules?**
  _Cohesion score 0.04751131221719457 - nodes in this community are weakly interconnected._
- **Why does `Button()` connect `Permissions & Rider Admin UI` to `Admin Layout & Navigation UI`, `Common UI Modals & Feedback`, `Product Showcase & Router UI`, `Order Tracking & Rider UI`, `Shop & Admin Dashboard Views`, `Errorboundary App Scrolltotop Module`, `Etaindicator Trackingpanel Deliveryotp Module`, `Rider Delivery Verification Flow`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Should `Permissions & Rider Admin UI` be split into smaller, more focused modules?**
  _Cohesion score 0.14479638009049775 - nodes in this community are weakly interconnected._