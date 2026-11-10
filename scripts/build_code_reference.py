"""Keep crawlable HTML and interactive defaults in sync with data/promo-codes.json.
Run from any directory after editing the code reference; never invent test dates.
"""
from pathlib import Path
from html import escape
import json
import re

ROOT = Path(__file__).resolve().parents[1]
LABELS = {'allplayers': 'All players', 'newplayers': 'New players', 'returningplayers': 'Returning players', 'expired': 'Expired'}

def build():
    codes = json.loads((ROOT / 'data/promo-codes.json').read_text())
    assert len({c['code'] for c in codes}) == len(codes), 'Duplicate codes'
    for code in codes:
        assert code['type'] in LABELS and code['reward']
    p = ROOT / 'index.html'
    source = p.read_text()
    source, n = re.subn(r'const codes = \[[\s\S]*?\n\];', 'const codes = ' + json.dumps(codes, ensure_ascii=False, indent=1) + ';', source, count=1)
    assert n == 1
    for category, grid, counter in [('allplayers', 'allPlayersGrid', 'allPlayersActiveCount'), ('newplayers', 'newPlayersGrid', 'newPlayersActiveCount'), ('returningplayers', 'returningPlayersGrid', 'returningPlayersActiveCount')]:
        entries = [c for c in codes if c['type'] == category]
        cards = []
        for c in entries:
            name, reward = escape(c['code']), escape(c['reward'])
            expiry = ' · Listed expiry: ' + escape(c['expiresAt']) if c.get('expiresAt') else ''
            evidence = ''
            if c.get('videoId'):
                evidence = '<a class="code-evidence" href="https://www.youtube.com/watch?v=' + escape(c['videoId']) + '">Watch ' + name + ' coverage · Published ' + escape(c['videoPublished']) + '</a>'
            cards.append('<article class="code-card"><div class="code-top"><span class="code-name">' + name + '</span><span class="pill promo-code-status ' + category + '">' + LABELS[category].upper() + '</span></div><div class="reward">' + reward + expiry + '</div><small class="code-last-checked">In-game checked by MechNova</small>' + evidence + '</article>')
        pattern = r'(<div class="code-grid" id="' + grid + r'">)[\s\S]*?(</div>\s*\n  </div>)'
        source, n = re.subn(pattern, lambda m: m[1] + '\n' + '\n'.join(cards) + '\n' + m[2], source, count=1)
        assert n == 1, grid
        source = re.sub(r'(id="' + counter + r'">)[^<]*', lambda m: m[1] + str(len(entries)) + ' LISTED', source)
    source = re.sub(r'(id="activeCount">)[^<]*', lambda m: m[1] + str(sum(c['type'] != 'expired' for c in codes)), source)
    source = re.sub(r'(id="expiredCount">)[^<]*', lambda m: m[1] + str(sum(c['type'] == 'expired' for c in codes)), source)
    p.write_text(source)
    p = ROOT / 'promo-codes-2026.html'
    source = p.read_text()
    a = source.index('<table class="code-snapshot">'); start = source.index('<tbody>', a); end = source.index('</tbody>', start) + len('</tbody>')
    rows = []
    for c in codes:
        if c['type'] == 'expired': continue
        expiry = ' Listed expiry: ' + c['expiresAt'] + '.' if c.get('expiresAt') else ''
        rows.append('<tr><td><code>' + escape(c['code']) + '</code></td><td>' + LABELS[c['type']] + '</td><td>' + escape(c['reward'] + expiry) + '</td></tr>')
    p.write_text(source[:start] + '<tbody>\n' + '\n'.join(rows) + '\n</tbody>' + source[end:])

if __name__ == '__main__':
    build()
