"""Independent python-chess checks of our generated DTM tables, not a runtime dependency."""
import sys, json, random, hashlib
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / '.local/python'))
import chess

ROOT = Path(__file__).parent
def encode(a, b, p, turn):
    return (((a * 64 + b) * 64 + p) * 2 + turn)
def ours(square):
    return square ^ 56
def lookup(board, data, piece):
    extra = list(board.pieces(piece, chess.WHITE))
    if not extra:
        return 254
    return data[encode(ours(board.king(chess.WHITE)), ours(board.king(chess.BLACK)), ours(extra[0]), 0 if board.turn else 1)]

rng = random.Random(20261003)
report = {'method': 'Independent legal-move and Bellman checks with python-chess', 'seed': 20261003, 'tables': []}
for name, piece in [('kqk', chess.QUEEN), ('krk', chess.ROOK)]:
    data = (ROOT / 'tablebases' / (name + '.bin')).read_bytes()
    checked = valid = wins = draws = mates = 0
    # Include every terminal state as well as a deterministic broad sample.
    ids = set(rng.sample(range(len(data)), 10000)) | {i for i, d in enumerate(data) if d == 0}
    for i in sorted(ids):
        turn = i % 2
        q = i // 2
        p, b, a = q % 64, (q // 64) % 64, q // 4096
        board = chess.Board(None)
        board.set_piece_at(ours(a), chess.Piece(chess.KING, chess.WHITE))
        board.set_piece_at(ours(b), chess.Piece(chess.KING, chess.BLACK))
        board.set_piece_at(ours(p), chess.Piece(piece, chess.WHITE))
        board.turn = turn == 0
        legal = a != b and a != p and b != p and board.is_valid()
        d = data[i]
        assert (d != 255) == legal, (name, i, board.fen(), d, 'validity')
        checked += 1
        if not legal:
            continue
        valid += 1
        if board.is_checkmate():
            assert d == 0
            mates += 1
            continue
        children = []
        for m in board.legal_moves:
            board.push(m)
            children.append(lookup(board, data, piece))
            board.pop()
        if not children:
            assert d == 254 and board.is_stalemate()
        elif turn == 0:
            winning = [n for n in children if n < 254]
            expected = min(winning) + 1 if winning else 254
            assert d == expected, (name, board.fen(), d, expected, children)
        else:
            expected = 254 if 254 in children else max(children) + 1
            assert d == expected, (name, board.fen(), d, expected, children)
        wins += d < 254
        draws += d == 254
    report['tables'].append({'name': name.upper(), 'positionsChecked': checked, 'legal': valid, 'wins': wins, 'draws': draws, 'checkmates': mates, 'sha256': hashlib.sha256(data).hexdigest()})
report['passed'] = True
(ROOT / 'reports' / 'tablebase-audit.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report))
