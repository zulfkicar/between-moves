# External strength measurement

This document and its reports describe the previous **v2**, not the upgraded app. Historical harnesses now import `engine-v2.js` and `search-v2.js`, which preserve that behavior with redirected imports. The upgraded build is currently unrated. Its opening repertoire, endgame tables and opponent memory were not part of this match.

The external opponent is official Stockfish 19, with `UCI_LimitStrength=true` and an explicit `UCI_Elo`. Stockfish's [documentation](https://official-stockfish.github.io/docs/stockfish-wiki/UCI-Protocol-and-Stockfish-Commands.html#uci_elo) describes its calibration at 120 seconds plus one second per move, anchored to CCRL 40/4. This is an engine-rating reference, not a human chess-site rating.

## Protocol

- The bot was the original v2 `engine.js` / `search.js`, without code changes during the match. Those files are now frozen as `engine-v2.js` / `search-v2.js`. It used Considered mode: 1200 ms per move, maximum depth 7, trace enabled, full repetition history.
- Both clocks start at 120 seconds with a one-second increment. The bot retains its app budget instead of adding a new adaptive time manager. Stockfish receives the actual remaining clocks through UCI and chooses its own search time. Remaining-time clipping applies to the bot.
- Six fixed legal opening sequences are played with reversed colors. Initial opening moves do not consume clocks. No book or tablebases are used by the bot. Stockfish has no configured Syzygy path, pondering, or opening book.
- The 1320 and 1600 settings each run three isolated match processes. A four-game middle check at 1440 uses two processes. These runs overlap, with up to seven concurrent games. Each Stockfish process uses one thread and 16 MB hash. Searches alternate within each game. Time is wall-clock time, so results depend on hardware and system load.
- Termination uses checkmate, stalemate, automatic threefold repetition, automatic fifty-move draw, the bot's limited insufficient-material detection, or a clock loss. A 400-played-ply cap leaves a game unresolved. No evaluation-based win/draw adjudication or resignation.
- Stockfish 19 validates the whole UCI move sequence and its final legal-move count is checked against the bot's count. Every game records SAN, UCI, final FEN, clocks and bot search telemetry. Failed processes and illegal moves abort testing instead of being scored as losses.
- Source and binary SHA-256 hashes, UCI options and protocol transcripts accompany reports. No engine binaries belong in the published app. Local tools live under ignored `.local/`.

## Rating calculation

For a completed schedule with no unresolved games, score is `(wins + draws/2) / games`. For a single anchor, performance estimate is `anchor + 400 log10(score/(1-score))`. For the combined multi-anchor report, fit one rating R such that `mean(1/(1+10^((anchor-R)/400)))` equals the overall score, weighting each game equally. A score of exactly zero or one has no finite estimate. No arbitrary score smoothing is used.

The conservative 95% sampling interval uses Hoeffding's bound on the mean of the color-pair scores: `margin = sqrt(log(2/0.05)/(2 * pairs))`. The combined report has fourteen pairs: six each at 1320 and 1600, plus two at 1440. Score endpoints are clipped to zero and one, then converted using the corresponding single- or multi-anchor model. Zero and one endpoints remain unbounded. This treats each color pair as one bounded observation and assumes independent opponent randomization between pairs. It describes the selected opening schedule, not a representative population of all chess positions. This small sample gives a deliberately wide interval. It excludes Stockfish calibration uncertainty and hardware/interpreter differences.

The UI rounds point estimates to the nearest 50 and interval endpoints outward. The JSON retains the direct formula result. Node's execution of the same search code approximates browser strength, rather than measuring every visitor's device or worker-message overhead.

This was an exploratory calibration. The 1600, full 1320, and middle 1440 schedules were chosen as earlier results arrived. The nominal independence interval does not account for adaptive reference-setting selection. It should not be treated as a rigorous confidence guarantee for the bot's population strength.

## Reproduce

Download the Windows x86-64 universal archive from the [official Stockfish 19 release](https://github.com/official-stockfish/Stockfish/releases/tag/sf_19). Its archive SHA-256 is `3c8bf1f9ea66a09350a40df4f632288285ac206d99f33ab5842c408fc30b48a7`. Keep its included license/source and documentation with the local executable. Our benchmark communicates with the separate executable through UCI.

```powershell
node external-match.js '.local\tools\stockfish\stockfish\stockfish-windows-x86-64-universal.exe' 1600 1200
node external-match.js '.local\tools\stockfish\stockfish\stockfish-windows-x86-64-universal.exe' 1320 1200
node external-match.js '.local\tools\stockfish\stockfish\stockfish-windows-x86-64-universal.exe' 1440 1200 2
node combine-ratings.js reports/external-1320-1200.json reports/external-1440-1200.json reports/external-1600-1200.json
node --test engine.test.js rating-summary.test.js
```

`external-match.js` runs a twelve-game schedule at one reference setting by default, or a smaller paired schedule with its optional pair-count argument. `external-benchmark.js` runs a sequential subset when passed a pair count and opening offset. `rating-summary.js` can recalculate a summary from a completed JSON report. `combine-ratings.js` fits the combined estimate after all schedules finish. Match outcomes vary because of reference-engine randomization and approximate search deadlines. Running each batch serially removes the overlapping-load condition and may change outcomes.

For an independent audit, install `chess==1.11.2` into `.local/python` (or your Python environment) and run `python audit-match.py reports/external-calibration.json`. This checks every move, SAN, final FEN, result and terminal condition, and round-trips the PGN. Python and Stockfish are benchmark tools only and are not dependencies of the browser app.

## Setup pilot

Two initial games against the 1320 setting were both bot wins. The remaining serial schedule was interrupted to choose a closer 1600 anchor and run a fresh twelve-game schedule concurrently. Those setup games are archived in `reports/external-pilot.json` and `.pgn`, with the original harness in `reports/pilot-harness.txt`. They are excluded from the final point estimate. The original interrupted twelve-game report should not be interpreted as a completed match.
