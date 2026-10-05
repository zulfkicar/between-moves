"""Independent benchmark/PGN audit. pip install chess==1.11.2 for this tool only."""
import io
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent / '.local' / 'python'))
import chess
import chess.pgn

report_path = Path(sys.argv[1])
report = json.loads(report_path.read_text(encoding='utf-8-sig'))
games = report['results']
parsed_pgn = io.StringIO(report_path.with_suffix('.pgn').read_text(encoding='utf-8'))
audits = []
for i, game in enumerate(games):
    board = chess.Board()
    assert len(game['moves']) == len(game['uciMoves']), f'Game {i}: SAN count'
    for ply, (uci, san) in enumerate(zip(game['uciMoves'], game['moves']), 1):
        move = chess.Move.from_uci(uci)
        assert move in board.legal_moves, f'Game {i}, ply {ply}: illegal {uci}'
        assert board.san(move) == san, f'Game {i}, ply {ply}: incorrect SAN {san}'
        board.push(move)
    assert board.fen(en_passant='fen') == game['finalFen'], f'Game {i}: final FEN'
    end = game['termination']
    if 'Checkmate' in end:
        assert board.is_checkmate(), f'Game {i}: false checkmate'
    elif 'stalemate' in end:
        assert board.is_stalemate(), f'Game {i}: false stalemate'
    elif 'fifty-move' in end:
        assert board.is_fifty_moves(), f'Game {i}: false fifty-move draw'
    elif 'repetition' in end:
        assert board.is_repetition(3), f'Game {i}: false repetition'
    elif 'insufficient' in end:
        assert board.is_insufficient_material(), f'Game {i}: false insufficient material'
    elif 'on time' not in end and 'Unresolved' not in end:
        raise AssertionError(f'Game {i}: unknown termination {end}')
    expected = '*' if game['score'] is None else '1/2-1/2' if game['score'] == .5 else '1-0' if (game['score'] == 1) == (game['botColor'] == 'w') else '0-1'
    if 'Checkmate' in end:
        assert board.result() == expected, f'Game {i}: wrong winning color'
    elif end.startswith('Draw'):
        assert expected == '1/2-1/2', f'Game {i}: wrong draw score'
    pgn_game = chess.pgn.read_game(parsed_pgn)
    assert pgn_game is not None and not pgn_game.errors, f'Game {i}: invalid PGN'
    assert [m.uci() for m in pgn_game.mainline_moves()] == game['uciMoves'], f'Game {i}: PGN differs'
    assert pgn_game.headers['Result'] == expected, f'Game {i}: PGN result'
    audits.append({'opening': game['opening'], 'botColor': game['botColor'], 'pliesIncludingOpening': board.ply(), 'termination': end, 'result': expected})
assert chess.pgn.read_game(parsed_pgn) is None, 'Unexpected additional PGN games'
result = {'library': 'python-chess', 'version': chess.__version__, 'report': report_path.name, 'sourceStatus': report['status'], 'gamesAudited': len(audits), 'checks': ['Every move legal', 'SAN matches', 'Final FEN matches', 'Terminal condition and winning color', 'PGN round-trip'], 'results': audits}
report_path.with_name(report_path.stem + '-audit.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
print(json.dumps({k: v for k, v in result.items() if k != 'results'}, indent=2))
