# PMart UI Design System

_Added 2026-11-04 with the whole-app visual redesign; storefront home, header and footer rebuilt on 2026-11-05 to the
owner's mockup, and all icons moved from lucide-react to react-icons. This is the reference for how every portal looks
and where the styles live. It supersedes the historical [UI Consistency Audit](PMart_UI_CONSISTENCY_AUDIT.md)._

## 1. Principles
- **One look in every portal.** Storefront, store portal, rider app, admin console (incl. in-store billing and
  inventory) and the sign-in pages use the same colours, spacing scale, radii, shadows and type.
- **Brand colours only.** PMart red `#F20D18`, charcoal `#111318`, white, light neutral `#F7F8FA`, leaf green
  `#15803D` (logo accent). Semantic colours (success, warning, error, info) come from tokens; pages do not hard-code hex values.
- **One brand surface.** The portal sidebars, the rider header, the sign-in panel, the profile summary and the dark
  page headers (Offers, Help, order tracking) use the same treatment: charcoal gradient + a soft PMart-red glow + a
  faint dot grid (`@include brand-surface`). The storefront footer is charcoal with red waves at its bottom corners (mockup).
- **Storefront home follows the owner's mockup (2026-11-05).** A light hero card (white → PMart-red tint, soft waves):
  eyebrow "Fresh groceries, everyday", "Your Everyday / Grocery Store" (second line red), description, red "Shop Now"
  pill; on the right a drawn basket illustration (`src/components/home/HeroBasketArt.jsx`: an SVG basket carrying the
  real PMart logo, filled with react-icons food icons — no photograph). The mockup's three promise chips (Fresh
  Products, Fast Delivery, Trusted Quality) were removed at the owner's request (2026-11-05). On phones the hero stays
  side by side (text left, basket right, smaller type; checked at 375 and 320 px). Then *Shop by Category* as large cards (category image, or a matching food icon from
  `CategoryIcon.jsx` when a category has no image) with a "View All Categories →" link, then the product rows. This
  replaced the "no hero" state of earlier on 2026-11-05.
- **Logo unchanged.** Every place uses `/Pmart.png` as is; on dark surfaces it sits on a white `logo-chip`.
- **Footer at the bottom.** `CustomerLayout.scss` makes the storefront layout at least the window's height (flex
  column, main content grows), so on short pages the footer sits at the bottom with no empty band under it. On phones
  the footer keeps 62 px below it for the bottom navigation bar.
- **No photography for decoration.** Products show only admin-verified photos, otherwise the "Image Not Available"
  placeholder. The hero uses a drawn illustration, not a photo; the mockup's basket photo was not copied. The old
  AI-generated `public/hero-bg.png` is no longer referenced.
- **Icons: react-icons only.** All UI icons come from `react-icons` — the Tabler set (`react-icons/tb`) for interface
  icons and Game Icons (`react-icons/gi`) for the food illustrations. `lucide-react` was removed from `package.json`.
  Imports keep the old names as aliases (`import { TbTrash as Trash2 } from 'react-icons/tb'`), and
  `App.jsx` sets a 24 px default size through `IconContext` (lucide's default) so icons without a `size` keep their size.
- **Card sizes are fixed.** The redesign changed borders, radii, shadows and colours only — padding, widths and
  heights of product cards, category tiles, KPI tiles and stat cards are unchanged (measured: product card 210 × 339.5 px
  in a home row at 1440 px, media 208.4 px square, category tile 134 × 110 px, ADD button 75 × 32.4 px, KPI tile 134 px high).
- **No demo data.** Empty lists use `EmptyState`; screens never fall back to sample content.

## 2. Where the styles live
| File | Contents |
|---|---|
| `src/styles/_variables.scss` | Tokens: colours, brand-surface colours (`$brand-surface-base`, `$brand-gradient`, `$on-dark-*`), type, radii, shadows (`$shadow-xs` … `$shadow-xl`, `$shadow-brand`, `$focus-ring`), layout sizes |
| `src/styles/_mixins.scss` | `brand-surface`, `glass-surface`, `logo-chip`, `heading-display`, `heading-accent`, `caps-label`, `pill-link`, `view-all-link`, `ghost-icon-btn`, `text-btn`, `portal-sidebar`, `portal-nav-link`, `portal-topbar`, `stat-card-surface`, `pmart-card`, button mixins, scrollbars |
| `src/pages/customer/HomePage.scss`, `src/components/home/` | Home hero card, basket illustration positions, category cards |
| `src/styles/_globals.scss` | `.container`, focus ring, `.btn*`, `.badge*`, form controls, `.pmart-table*`, `.pmart-card`, skeleton, modal/drawer overlays and their entry animations |
| `src/styles/_ui-components.scss` | Styles for `src/components/ui`: modal header, `EmptyState`, `ErrorMessage`, `PageHeader`, `LoadingState`, dialogs, `Input` icon |
| `src/styles/_utilities.scss` | Spacing/layout/text utilities, `.alert`, `.kpi-grid` / `.kpi-tile`, `.tab-bar` (segmented control), `.form-grid`, `.link-button` |
| `src/styles/_typography.scss` | Body text, display/section/page titles; `h1`–`h3` use the display face (Manrope) |
| `src/styles/error-boundary.scss` | Full-page error fallback (now matches the `ErrorBoundary` markup) |

`vite.config.js` prepends `variables`, `mixins` and `breakpoints` to every SCSS file a component imports, so tokens
and mixins can be used anywhere without `@use`. Partials inside `src/styles` are loaded by `main.scss` and need their
own `@use` lines. Save SCSS as **UTF-8 without a BOM**.

## 3. Tokens
| Group | Values |
|---|---|
| Radius | `xs 6` · `sm 8` · `md 10` (inputs, buttons) · `lg 12` (chips) · `xl 16` (cards) · `2xl 22` (modals, dark page headers) · `pill` |
| Shadows | Layered and charcoal-tinted; `$shadow-sm` for resting cards, `$shadow-card-hover` on hover, `$shadow-brand` for red CTAs |
| Type | Inter for text, Manrope for headings, prices and KPI values; headings use `-0.02em` tracking; small labels are uppercase 11 px with `0.06em` tracking (`caps-label`) |
| Spacing | Utility scale 2 / 4 / 6 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 px (`_utilities.scss`) |
| Focus | Every focusable element shows a red ring on keyboard focus (`:focus-visible`); inputs use `$focus-ring` |
| Breakpoints | `mobile` < 768, `tablet` 768–1023, `desktop` ≥ 1024 (`_breakpoints.scss`) |

## 4. Shared patterns
- **Section headings** (home rows, category grid): `heading-display` (24 px) + `heading-accent` (red bar) + `view-all-link` (bold red "View All →", arrow nudges on hover).
- **Cards**: white, `1px $border-light`, `$radius-xl`, `$shadow-sm`; hover raises the shadow. Product cards also tint the border red on hover.
- **KPI / stat cards** (admin overview, store dashboard, payments, reports, rider home): `stat-card-surface` — the same card with a 3 px red accent bar on top.
- **Buttons**: `Button` defaults to `variant="primary"` (red). Primary = solid red, hover darker red + red glow; secondary = white with border; `outline-red`; `dark`. Text and icon actions built on `<Button>` with a custom class must reset the red fill with `@include text-btn` or `@include ghost-icon-btn` (several did not and rendered red-on-red, e.g. the Cart/Checkout "Change" link — fixed).
- **Destructive actions** (Delete product, Delete invoice): a `secondary` button that takes the error tint on hover
  (`.delete-action` on Products; `.btn.invoice-delete-btn` in `pages/billing/billing.scss`, using `$error-text`,
  `$error-border`, `$error-bg`), opening a `Modal` with `.dialog-text`, the form fields, then `.dialog-actions`:
  a secondary "Keep …" button and the red primary confirm button.
- **Badges**: soft pills in the semantic tints.
- **Tables**: light header row with uppercase labels, red-tinted row hover; `.pmart-table-wrapper` and any `.pmart-card` that directly contains a table scroll sideways on small screens instead of clipping.
- **Tabs** (`.tab-bar`): a segmented control; the page still passes `dark` (active) / `secondary` (inactive) buttons.
- **Portal chrome**: `portal-sidebar` + `portal-nav-link` (active item = red gradient pill) + `portal-topbar` (frosted white). The logo sits on a white `logo-chip` on dark surfaces because the "Mart" wordmark is charcoal.
- **Storefront chrome** (mockup): sticky header with the logo, a "Deliver to / Select Location" pill (red pin), a grey pill search, Offers and Orders links, a bordered profile or Login pill with a red user icon, and a charcoal "My Cart" pill with a red count badge on its corner (shows 0 when empty; with items the label becomes "N items / ₹total"). At tablet width Login and the cart become icon-only so the search keeps its width. Frosted mobile bottom nav with a red indicator on the active tab. Footer: charcoal with red corner waves, title-case column headings, icons beside the account and contact links.
- **Not copied from the mockup:** the red notification dots on Offers/Orders (there is no data behind them) and the social-media icons in the footer (settings have no social links; see Remaining Work R33).

## 5. Exceptions
- **Maps** (`LiveTrackingMap.scss`, the live-deliveries map) keep a Google-style palette (`#1a73e8` route blue, marker colours) because the route line and markers are drawn in JS with the same colours.
- A few inline colours remain in JSX (order timeline cancelled state, confirmation modal button, out-of-stock text, map markers). They match the tokens' values but are not tokens — see Remaining Work R27.

## 6. Verification (2026-11-05, mockup redesign + icons)
Sandbox API again (in-memory MongoDB, test accounts, no live data):
- Storefront home viewed and screenshotted at 1440, 768 and 375 px (hero, categories, product rows, footer). Fixed on
  the way: search icon overlapping the placeholder on phones, search squeezed at 768 px, basket art too tall on phones.
- No horizontal overflow at 375 / 768 / 1440 px on home, category, product, search, cart, offers, help and login;
  admin (overview, orders, products, new invoice, invoices, restock, users, settings, reports, live deliveries) at
  375 px and the main ones at 768 / 1440 px; store portal (dashboard, orders, products, settings) at 375 / 768 px;
  rider home at 375 px.
- Admin, store and rider screens viewed with the new icons; no icon renders oversized or missing.
- `npx vite build` passes; `npm run lint` shows the same single pre-existing error (`LocationModal.jsx`) and no new
  findings in the changed files.

**Not checked (2026-11-05):** category cards with real category images (the sandbox categories have none), the
storefront signed in with a full name in the profile pill, every modal and drawer with the new icons.

## 6a. Verification (2026-11-04)
Checked in the browser preview against a **sandbox API** (in-memory MongoDB, session-only test accounts, sandbox
products without photos; never the live database), see [Test Strategy](PMart_TEST_STRATEGY.md):
- **No horizontal overflow at 375, 768 and 1440 px** on every routed screen: storefront (home, category, product,
  search, cart, checkout, orders, order tracking, profile, addresses, offers, help), auth (login, register, activate,
  set-password, rider enrol), store portal (dashboard, orders, order detail, products, new product, riders, analytics,
  settings), rider app (home, active, history, profile) and admin (overview, live deliveries, orders, order detail,
  users, customers, stores, products, new product, categories, payments, reports, settings, billing overview, new
  invoice, invoices, payment history, inventory import, restock, stock ledger, product images, inventory reports).
  Fixed on the way: cart page at 375 px, storefront header at 768 px, store-portal main column widening to its tables,
  dashboard tables clipped at 375 px, live-deliveries side column below 768 px, a report table and a file input at 375 px.
- **Screenshots** taken of the storefront home (1440 and 375), checkout, store dashboard, rider home (375), admin
  overview, admin inventory products, new invoice and sign-in.
- `npx vite build` passes; `npm run lint` reports the same single pre-existing error (`LocationModal.jsx`, rules-of-hooks) and no new findings.

**Not checked:** maps (tracking, live deliveries, address pin), modals and drawers in every state, the rider's active
delivery screens with a live order, invoice detail/print, real product photos (none verified in the sandbox), and real
devices. Visual review is a manual judgement; there is no automated visual regression suite.
