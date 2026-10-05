# Between Moves — interface direction

## Opponent profile, 2026-10-04

| Before | After |
| --- | --- |
| Basic opponent-memory text inside Settings | Dedicated Profile tab with finished-game, position and eligibility counts |
| Opening codes and capture totals | Readable first-move sequences by side, capture frequency with its denominator |
| Hidden position-specific reply records | Selectable positions with reply distributions, visit counts and a three-visit eligibility label |
| Memory impact buried in analysis copy | Last engine decision explains a final tie-break, with an Analysis link when memory changed the choice |
| Empty memory offered no way to explore the feature | Explicit sample preview isolated from saved games and engine input |

The profile presents observed choices without inventing personality labels or confidence scores. Opening sequences and capture frequency describe play. Position-specific replies can influence the existing bounded engine adaptation. The final choice explanation uses the completed play result, with the preference captured at search launch. Search-only analysis never impersonates an engine turn.

Position inspection preserves the live game and its history. Phone inspection brings the board into view. The sample has a visible label, never enters storage or the worker, and returns to the live game on exit. Counts use tabular numerals, tabs retain keyboard navigation, and position buttons keep focus after selection. More recorded positions are available six at a time.

## App workspace refinement, 2026-10-03

| Before | After |
| --- | --- |
| Editorial landing page with a large metaphorical introduction | Compact app header, Play and Explore routes, short task-oriented copy |
| Board and tree separated by a long page | Persistent board beside the active inspector on desktop |
| Scattered controls and oversized technical sections | Time/depth beside Analyze, preferences in Settings, expandable search details |
| Explicit view-board action after selecting a branch | Immediate board preview, last-move highlights and an explicit Return to game state |
| Live iterations replaced the path being explored | Manual branch navigation pins the current completed iteration |
| Plain history rows | Clickable move review with active position styling and PGN export |
| Patchwork typography and page spacing | Sans-serif controls, restrained serif brand, walnut board, consistent light/dark surfaces |
| Stacked views requiring repeated scrolling on a phone | Search details / View board shortcuts, sticky navigation and touch-sized controls |
| Two notebook tabs and stale loading/error text | Three keyboard-navigable tabs, one board tab stop, explicit stop/empty/error/retry states |
| Python preview helper | Dependency-free local Node preview and npm start |

The board retains its place across workspace modes. Inspecting a search or game position never applies a move. The inspection banner makes that distinction visible. Branch buttons represent recorded search visits, and score bounds, trace counters, static evaluation and benchmark evidence remain available without competing with the main navigation.

At laptop sizes the primary game controls fit in the viewport. The inspector scrolls independently. Phones use a full-width board with the desktop evaluation meter hidden, followed by the active panel. The game, side, orientation and preferences survive reloads.

No playing-strength changes are part of this interface refinement.

## Search explorer update, 2026-10-03

| Before | After |
| --- | --- |
| Four candidate moves and a text continuation | Connected root/candidate/reply view of actual bounded search traces |
| Only the latest completed result | Selector for completed search depths and all root branches |
| General material/position description | Additive material, activity, pawn, and king terms for inspected positions |
| No visible pruning explanation | Alpha-beta bound labels, cutoff counts, and tactical extension counts with scope disclosed |
| No strength evidence | Expandable local match results with settings, reports and explicit unrated status |
| Static-horizon tactical play | Quiescence, killer/history ordering, repetition-aware search and phase-aware evaluation |

The project should feel like sitting at a chessboard with the engine's notebook open. It follows the portfolio's warm workbench identity without copying the pinboard layout.

## Hierarchy

The board is primary, followed by turn state and game controls. The notebook is secondary, with search summary first, candidate moves second, and the anticipated continuation below them. Technical labels stay out of the primary play instructions. The engine explanation documents algorithmic limits on demand.

## Visual language

Warm paper and sage, a serif headline, a restrained monogram, original SVG pieces, and small monospace metadata. White and black pieces use consistent silhouettes with distinct fills. Current selection, legal targets, last move, and check have separate treatments. The notebook uses light surface depth rather than a grid of dashboard cards. Dark mode is equally supported.

## Interaction contracts

- Click or keyboard-select, then choose a legal target. A selected square retains focus after rendering.
- Promotion requires an explicit piece choice.
- Undo cancels outstanding engine computation before restoring the board.
- New game requires choosing a side and explains that it replaces the saved game.
- Candidate inspection shows the position that was actually searched. An explicit Return to game control exits inspection. The app never silently overlays old analysis on the current position.
- Worker messages are associated with a search generation so cancelled searches cannot play stale moves.
- Current game persistence contains only moves, side, and orientation. It is reconstructed through legal moves on reload.
- Search reports completed depths and measured work. Scores are heuristic evaluations, not confidence percentages.

## Responsive and accessible behavior

The board and notebook stack on phones. Short laptop screens get a smaller board and tighter header so all ranks remain visible. The board supports arrow navigation, Enter/Space selection, and Escape cancellation. Tabs support left/right keys. Dialogs use native modal behavior. SVG pieces have descriptive square labels, and turn information is announced through a status region. Motion is restricted to hover feedback, a short move transition, and the evaluation meter, with reduced-motion support.

## First-build changes

| Before | After |
| --- | --- |
| Planned chess project | Standalone static browser app with original legal rules and search worker |
| No visual identity | Paper/sage study, monogram, serif hierarchy, original pieces, light/dark themes |
| No game interaction | Piece selection, legal targets, move transitions, check indication, side choice, undo and rotation |
| No search visibility | Completed-depth telemetry, ranked candidates, continuation and explicit position inspection |
| No session tools | Local restoration, SAN history, PGN export, and inline help |
| No responsive or keyboard behavior | Phone stacking, laptop height adaptation, keyboard board/tabs, native dialogs and reduced motion |

## Later refinements

Step through an entire principal variation, explain evaluation components, add a tactical sample position, improve keyboard announcements, and test with a real touch device. Search strength improvements should remain separate from the UI so a stronger engine never makes the interface harder to understand.
