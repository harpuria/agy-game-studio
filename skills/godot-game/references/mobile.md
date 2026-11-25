# Godot Mobile Template (`godot-mobile-template`)

Procedures and contracts specific to Android and iOS games built on `harpuria/godot-mobile-template` (Godot **4.7.2 Standard**).

## Platform services (never call mobile plugins directly)

`App` owns every mobile service instance. Game code under `game/` communicates only through these facades:

| Service | Access | Key Contract |
| :--- | :--- | :--- |
| **Ads** | `App.ads` (`AdsService`) | Grant rewarded bonuses **only** on `rewarded_completed`. Ads require `App.privacy.can_request_ads()`. |
| **Privacy / Consent** | `App.privacy` (`PrivacyService`) | Check `can_request_ads()` before ad requests and `can_use_services()` before analytics. `privacy_enabled = false` does **not** imply consent is granted. |
| **Billing / IAP** | `App.billing` (`BillingService`) | Pass **logical** product IDs. On native builds, validate and persist `transaction_received` before calling `finish_purchase`; deduplicate grants with `purchase_token` (see `examples/purchase_ledger/purchase_ledger.gd`—copy into `game/` and adapt). Connect to billing signals in your first game scene and drain `get_unfinished_transactions()` on start/resume. |
| **Analytics** | `App.analytics` (`Analytics`) | Guard behind `App.privacy.can_use_services()`. |
| **Game Services** | `App.game_services` | Leaderboards & achievements (`docs/GAME_SERVICES.md`, `docs/ANDROID_PLAY_GAMES.md`). Keep `android_native_verified` / `ios_native_verified = false` until device-verified. |
| **In-App Review** | `App.review` (`ReviewService`) | Request only at natural positive moments (never mid-action or on loss). |

**Mock vs. Native rules**:
- Mocks run only in **Debug** builds with `mode="mock"` (and `allow_mobile_debug_mocks=true` on mobile devices). Release builds never select mock adapters and mock purchases must never succeed in release.
- Android native ads, billing, and UMP require both per-feature native gates (`*_native_verified=true` after device check) and the corresponding SDK export option.

## Configuration, stores, and native builds

- Edit `config/game.cfg` for `name`, `version`, `build_number` (bump by `+1` on every store submission), `android_package`, `ios_bundle`, `orientation`, `main_scene`, `init_script`, feature flags, and store IDs.
- Apply changes to `project.godot` and all Android/iOS export presets:
  ```bash
  godot --headless --path . --script res://tools/configure.gd
  ```
  Re-running `configure.gd` must produce no `git diff` (CI checks idempotency).
- **One store per Android export preset**: Never ship Google Play Billing in a ONE store build (`Android Google Play` vs. `Android ONE store`). Follow `docs/STORE_RELEASE.md`, `docs/ANDROID_SERVICES.md`, and `docs/ONESTORE.md`.
- Keep production store keys (such as `onestore_public_key`), signing material, and `config/android.local.cfg` out of Git.
- Native plugin sources under `native/` build into `addons/`; keep unverified `addons/` build outputs out of Git until device-verified.

## Mobile UX, Safe Area, and lifecycle

- Wrap HUD and interactive controls in `SafeArea` (`ui/common/safe_area.gd`) so notches, camera cutouts, and rounded corners never clip touch targets.
- Connect `App.back_requested` to handle Android hardware/gesture back cleanly (close popup -> open pause -> confirm exit).
- `App`'s mobile pause notification flushes saves and suspends audio, but does not impose a global gameplay pause UI—listen to `App.paused` / `App.resumed` in your gameplay scene to open your pause overlay when appropriate.
- Keep touch controls large (`>= 48dp` equivalent) and test both portrait and landscape if `orientation="sensor"`.

## Headless validation and device verification

Run from the game repository root:

```bash
godot --headless --path . --editor --import --quit
godot --headless --path . --scene res://tests/integration.tscn
godot --headless --path . --scene res://tests/integration.tscn -- --disabled
godot --headless --path . --scene res://tests/integration.tscn -- --native
python3 tools/check_docs.py   # whenever docs changed
```

- Check exit code `0`, `INTEGRATION: N checks, 0 failures`, and absence of `SCRIPT ERROR` / `Parse Error` / `ERROR:` in logs.
- `--disabled` verifies feature-disabled paths; `--native` verifies unavailable native SDK failure paths (it is **not** a real store test).
- If you changed default product IDs or feature flags in `config/game.cfg`, review `tests/integration.gd` inputs accordingly.
- For on-device Android verification of Ads + Billing + UMP simultaneously, use the `android_services_probe` feature and `scenes/android_services_probe.tscn` per `docs/ANDROID_SERVICES.md`.
- Record desktop/headless tests separately from real-device verification (touch, orientation, safe area, accounts, live ads, billing, store upload). Never claim device verification from Desktop runs.
