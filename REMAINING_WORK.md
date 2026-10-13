# PMart Remaining Work

The maintained list is [docs/PMart_REMAINING_WORK.md](docs/PMart_REMAINING_WORK.md) and what is verified is in
[docs/PMart_FEATURE_STATUS_MATRIX.md](docs/PMart_FEATURE_STATUS_MATRIX.md).

The matrices that used to be here (UI migration, security, Playwright browsers) described the code before the
2026-10-13 rebuild. The Playwright suite they reference was removed because it depended on seeded demo accounts.

Top items right now:
1. Rotate the MapTiler key (it was committed to git and is still the one in `.env`).
2. Visually review every screen and the maps (the 2026-10-13 browser run could not take screenshots).
3. Test rider GPS on a real phone.
4. Write a new self-contained browser e2e suite.
5. Scope the storefront to the store that serves the customer's address before adding a second store.
