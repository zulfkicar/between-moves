## Publication preparation verified 2026-10-05

- The current four-suite run passes 37 tests, including the seven opponent-profile checks.
- Static demo assets are packaged under the portfolio playground/chess/ route. A browser check played e4, received a legal opening reply, and completed position analysis through the module worker. The search explorer showed real recorded replies.
- The current engine remains unrated. Existing calibration and independent tablebase audit records describe their documented historical protocols and were not rerun for publication.

# Verification — 2026-09-20

## Opponent profile verified 2026-10-04

- Added a fourth keyboard-navigable Profile tab. Finished-game counts, capture opportunities, opening sequences split by playing side, and per-position reply frequencies come from legally replayed records. Three visits indicate eligibility, not statistical confidence. More positions load six at a time.
- The 37-test suite passed, including seven new profile checks for aggregation, legal SAN, side-specific denominators, the three-visit threshold, exclusion of incomplete/invalid/post-termination/nonstandard games, 30-game retention, sample isolation and truthful decision explanations. Final app and profile module syntax checks passed.
- Actual browser checks covered the zero-game state, eight-game sample (seven positions, six eligible), expansion to the seventh position with two visits and one needed, position inspection, active selection, returning to the original game, and the disabled-memory notice. Leaving the sample restored zero real games and the original one-ply position.
- Played Black's e7–e5 and received a completed engine response. The profile correctly displayed No final tie-break. Taking back restored the original one-ply game and cleared that decision. Restored the original 10-second, 12-ply settings and enabled memory. Board analysis does not replace the last played engine decision.
- A changed memory choice and the Analysis impact banner are covered by unit tests/source wiring, but were not triggered by real user history in the browser because that history is empty. No changed-choice browser claim or strength improvement is made.
- Verified dark desktop and light narrow-screen appearance. At 390 × 844 and 320 × 740 there was no horizontal document overflow. Tabs measured 42 pixels high. Selecting a pattern on a phone returned the viewport to the board. Temporary viewport/theme changes were restored. No real touch-device or exhaustive accessibility audit.
- Final browser logs contained no errors or warnings. Restarted the existing loopback-only Node preview. No commit or publication. Screenshots reports/opponent-profile.png and reports/opponent-profile-mobile.png show labelled sample data.

## App workspace verified 2026-10-03

- Rebuilt the interface around Play and Explore modes sharing one board. Analysis, Moves and Settings are keyboard-navigable tabs. Time and depth controls stay above the workspace. Routing preserves the game and avoids fragment scroll jumps.
- In the actual browser, selecting a recorded reply updated the board immediately and highlighted its from/to squares. The path pinned the selected completed iteration. Returning to Start showed all 20 searched first moves, and Return to game restored the unchanged one-ply game.
- Clicked the recorded Nf3 in Moves, verified its position and active row, then returned to the live game. ArrowRight from Moves selected Settings.
- Played Black's e7–e5, observed the engine's completed Nxe5 reply through the worker and a three-ply history. Take back restored the original one-ply game and e7 pawn. A separate take-back during a running search also restored the original game without a stale reply.
- After the completed turn, the board had exactly one tab stop. Piece selection preserved focus and exposed both legal pawn destinations.
- Cancelled a 10-second / 12-ply analysis, retaining its last completed result without playing a move. A full analysis at those restored original settings completed five plies within the time budget. The UI displayed 5 / 12, not a fabricated twelve-ply result.
- Disabled both opening repertoire and opponent memory, reloaded, and verified both preferences plus time/depth and the original game were restored. Returned both toggles to their original enabled settings.
- The Settings engine-info button opened the native dialog. Light and dark desktop layouts were inspected. Search details and View board shortcuts worked on the phone layout, including completed-iteration selection.
- Viewports of 320 × 740, 390 × 844, and 820 × 800 had no horizontal document overflow. At 390 pixels, the full-width board's square targets measured about 42.8 pixels. The temporary viewport overrides were reset. This is browser-based responsive verification, not a real-device or full accessibility audit.
- The existing 30 engine and rating tests passed. Final app, explorer and local preview server syntax checks passed. No engine-strength algorithms were changed.
- Final browser console contained no errors or warnings. The loopback-only Node server returned HTTP 200 and the app HTML. npm start now supplies the dependency-free local preview. No commit or publication.
- Added explicit loading, stopped-search, error and retry states. Worker failure/retry was reviewed in source but not fault-injected in the browser.
- Screenshots: reports/workbench-desktop.png, reports/workbench-dark.png, reports/workbench-mobile.png.

## Current engine and explorer verified 2026-10-03

- 30 tests pass: the existing rules, tactical and rating checks plus opening-book legality, table-guided optimal mate with either stronger color, fifty-move and capture-draw handling, repetition fallback, cached-versus-uncached completed scores, legal traces beyond three plies, root-draw rejection and opponent-memory eligibility/safety limits.
- Independent python-chess audit passed on 20,565 deterministic KQK/KRK states, including every generated checkmate state. It checks state validity and distance recurrence against independently generated legal children. This is sampled verification rather than an exhaustive independent table audit. Evidence: `reports/tablebase-audit.json`.
- Four fixed-depth search-work comparisons with frozen v2 completed at depth 4 with identical root scores. Current node visits fell from 13,516 to 12,624, 59,807 to 46,121, 58,578 to 54,524 and 1,810 to 1,479. Cold wall-clock timings varied and were not consistently faster. This is not a strength or Elo test. Protocol, source hashes and timings: `reports/upgrade-search-check.json`.
- Actual browser completed depth 5 with a five-ply ceiling and 10-second budget. Followed real branches to plies 4 and 5, inspected score bounds/windows, returned continuations and source types. Compared completed iterations. The trace discloses six-child, eight-ply and 2,400-descendant limits, plus omitted/pruned children.
- Analysis mode did not play a move. Stop analysis preserved the live game and kept the last completed iteration. An inspected fourth-ply board was analyzed separately, with its legal root moves (including Nb8 and Ng8) confirmed and the live-game count unchanged at one ply. Returned to the live game afterward.
- Opening play as Black triggered an automatic White repertoire move. The notebook displayed book source, zero searched nodes and an unscored meter instead of an invented evaluation/tree.
- Rook endgame study loaded the local table. After Rg1, the bot's defensive reply displayed an exact loss in 14 plies and KRK source. Study games are excluded from memory. Queen/rook mate sequences for both colors were verified at engine level.
- Local memory validation, minimum three observations, unfinished-game exclusion, terminal-game replay and the 25-centipawn adaptation limit are automated tests. Long-running personalized play and memory controls with many completed UI games have not been exercised.
- Desktop light/dark layouts and a 390 x 844 viewport were inspected. Narrow document width equaled its scroll width, with no horizontal overflow. Corrected the analysis button's hover contrast. No real touch-device or full accessibility audit.
- Browser console had no errors or warnings during opening play, endgame replies, cancellation or deeper analysis. Local-only server remains on port 8768. No publishing or commits.
- The previous v2 Elo estimate is explicitly historical. Current build is unrated. Frozen `engine-v2.js` and `search-v2.js` preserve its behavior, and historical rating/development harnesses use those files.
- Screenshots: `reports/explorer-upgraded.jpg`, `reports/explorer-dark.jpg`, `reports/controls-mobile.jpg`.

Earlier sections below describe previous builds and are retained as history.

## External calibration verified 2026-10-03

- 28 completed games against official Stockfish 19 at UCI_Elo 1320, 1440 and 1600: respectively 9W/1D/2L, 3W/0D/1L and 2W/0D/10L. No capped games or time losses. Source and binary hashes, UCI options, clocks, telemetry, full moves and PGNs retained.
- Combined fitted estimate 1471, shown as about 1450 in the app. Normal Considered mode, 1200 ms, depth cap 7, tracing enabled, 120s+1s clocks, Intel Core Ultra 7 255H, Node v24.15.0. Up to seven concurrent games.
- Independent python-chess 1.11.2 audit passed for all 28 games, including every legal move, SAN, final FEN, terminal result and PGN round-trip. The two setup pilot games also passed but are excluded from the estimate.
- 21 tests pass: all 15 existing engine tests plus six statistical-conversion, unresolved-game and multi-anchor/pairing checks.
- This is an exploratory engine-scale estimate. Nominal sampling range 1130–1841, with calibration, hardware/browser and adaptive-setting uncertainty excluded. No FIDE or online rating claim. No source changes to the bot during measurement.
- Browser disclosure verified: about 1450, all three reference settings, 28-game totals, rounded uncertainty range and links to match JSON, PGN and calculation. Console showed no errors or warnings. Screenshot: `reports/strength-benchmark.jpg`.

Earlier verification below is retained as history.

## Upgrade verified 2026-10-03

- 15 engine tests pass, including all original perft checks plus poisoned-pawn avoidance, legal bounded traces, score decomposition, and trace/no-trace equivalence at fixed depth.
- Two completed 12-game paired-opening matches against frozen v1: 8W/2D/2L at 40 ms and 10W/0D/2L at 120 ms. No capped games. JSON reports and full PGNs retained. Descriptive relative Elo is +191 and +280 respectively. Absolute Elo is not measured.
- In the actual browser, played e4 then Nf3 and received legal v2 replies. Explored depth 2 versus the latest depth 4, inspected the original search position, and returned to the live game. The trace reports sampled replies and bound inequalities explicitly. No browser console errors observed.
- A 390-pixel viewport has no horizontal document overflow. The wide tree itself scrolls horizontally within its panel. No real touch-device verification.
- Screenshot: `reports/search-explorer.jpg`. Local-only server on 8768. No publishing.

The original verification below describes v1 and is retained as history.

## Automated

`node --test engine.test.js`: **11 tests passed**. Includes standard perft positions, legal/illegal en passant, four promotions, castling and attacked transit squares, mate search, stalemate, insufficient material, and repetition-key normalization. JavaScript syntax checked with Node. No external engine dependency.

## Actual browser checks

Using the local static server on port 8768:

- Played e4 and received an engine reply through the module worker.
- Selected a knight and verified legal destinations plus preserved keyboard focus.
- Played Nf3 and observed a completed depth-4 search, 56,832 visited positions, and 1.20 seconds of measured work. Counts and moves vary with hardware and time budget.
- Selected an alternative candidate, verified explicit inspection mode, and returned to the live game.
- Took back a full turn and verified history returned to e4 / Nc6.
- Reloaded and verified game restoration.
- Selected Black in the new-game dialog and verified board orientation and an automatic White opening.
- Inspected light and dark desktop appearances and a 390 × 844 phone viewport. No horizontal document overflow in the phone check. Actual touch-device behavior has not been tested.
- Checked browser logs after play and inspection: no errors or warnings.

## Scope of evidence

Promotion and endgame behavior were tested at the engine level, not by playing full games through the UI. PGN generation is implemented but file download contents have not been independently round-tripped through another chess application. This is not an exhaustive accessibility audit or a strength benchmark. No public deployment or GitHub publication has been performed.
