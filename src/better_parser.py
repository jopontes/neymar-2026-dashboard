import re

md_file = '/Users/jonataspontes/Dropbox/Coding/neymar/neymar-dashboard/src/compass_artifact_wf-544c5c5a-d86d-4c54-a53c-a0452472f349_text_markdown.md'

with open(md_file, 'r', encoding='utf-8') as f:
    content = f.read()

player_map = {
    'NEYMAR': 'neymar',
    'VINÍCIUS': 'vini',
    'RAPHINHA': 'raphinha',
    'ESTÊVÃO': 'estevao',
    'ENDRICK': 'endrick',
    'JOÃO PEDRO': 'joaopedro',
    'RICHARLISON': 'richarlison',
    'GABRIEL JESUS': 'jesus',
    'GABRIEL MARTINELLI': 'martinelli',
    'MATHEUS CUNHA': 'cunha',
    'IGOR THIAGO': 'thiago',
    'LUCAS PAQUETÁ': 'paqueta',
    'LUÍS HENRIQUE': 'henrique',
    'RODRYGO': 'rodrygo',
}

year_keys = ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025']
year_labels = { '2018': '2018', '2019': '2019', '2020': '2020', '2021': '2021', '2022': '2022', '2023': '2023', '2024': '2024', '2025': '2025/26' }

def clean_val(v):
    if not v:
        return 0
    v = str(v)
    # strip bold, tilde, asterisks, percent
    v = v.replace('**', '').replace('~', '').replace('%', '').replace('≈', '').replace('*', '').strip()
    # take only first numeric token
    m = re.match(r'^[\s]*([\d\.]+)', v)
    if not m:
        return 0
    raw = m.group(1)
    try:
        # Distinguish thousands (e.g. 2.550 -> 2550) from decimals (e.g. 5.5 -> 5.5)
        if '.' in raw:
            parts = raw.split('.')
            if len(parts[1]) == 3:   # thousands separator
                return int(raw.replace('.', ''))
            else:
                return float(raw)
        return int(raw)
    except:
        return 0

def parse_inline(text, keys):
    """Extract key: value from an inline string like 'gols: **23** | assist: 13 | ...'"""
    result = {}
    for key in keys:
        pattern = rf'{key}:\s*(?:\*?\*?~?≈?)([^\|\n,\)]+)'
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            raw = m.group(1).strip()
            # Check N/A
            if any(x in raw.upper() for x in ['N/A', 'EMPTY', '-']):
                result[key] = 0
            else:
                result[key] = clean_val(raw)
    return result

# Empty stats template
def empty():
    return { 'gols': 0, 'assist': 0, 'ga': 0, 'mins': 0, 'jogos': 0,
             'xg': 0.0, 'xa': 0.0, 'chancesCriadas': 0, 'driblesCertos': 0,
             'passesProgressivos': 0, 'disponibilidade': 0 }

def merge(base, updates):
    for k, v in updates.items():
        if v != 0:
            base[k] = v
    return base

# Build flat data structure: data[player][year] = {'clubes': {...}, 'selecao': {...}}
data = {}
for p in player_map.values():
    data[p] = {}
    for y in year_keys:
        data[p][y] = {'clubes': empty(), 'selecao': empty()}

lines = content.split('\n')
n = len(lines)
i = 0
current_player = None
current_context = None  # 'clubes' or 'selecao'

while i < n:
    line = lines[i]
    stripped = line.strip()

    # ---- Detect player header (## N. NOME) ----
    if stripped.startswith('## '):
        current_player = None
        current_context = None
        for k, v in player_map.items():
            if k in stripped.upper():
                current_player = v
                break
        i += 1
        continue

    # ---- Detect context (### CLUBE / ### SELEÇÃO) ----
    if stripped.startswith('### '):
        upper = stripped.upper()
        if 'CLUBE' in upper:
            current_context = 'clubes'
        elif 'SELEÇÃO' in upper or 'SELECAO' in upper:
            current_context = 'selecao'
        i += 1
        continue

    if not current_player or not current_context:
        i += 1
        continue

    # ---- FORMAT A: #### 20XX/YY heading ----
    if stripped.startswith('#### '):
        year_found = None
        for y in year_keys:
            if y + '/' in stripped or stripped.endswith(y) or (y + ' ' in stripped):
                year_found = y
                break

        if year_found:
            stats = empty()
            j = i + 1
            while j < n:
                l = lines[j].strip()
                # Stop at next heading
                if l.startswith('#'):
                    break
                # Skip table rows
                if l.startswith('|'):
                    j += 1
                    continue
                if l.startswith('-'):
                    parsed = parse_inline(l, ['gols', 'assist', 'ga', 'mins', 'jogos',
                                              'xg', 'xa', 'chancesCriadas', 'driblesCertos',
                                              'passesProgressivos', 'disponibilidade'])
                    stats = merge(stats, parsed)
                j += 1
            data[current_player][year_found][current_context] = stats
            i = j
            continue

    # ---- FORMAT B: bullet with **20XX/YY** embedded ----
    if stripped.startswith('-') and '**' in stripped and current_context == 'clubes':
        year_found = None
        for y in year_keys:
            if re.search(rf'\*\*{y}', stripped) or re.search(rf'{y}/\d\d', stripped):
                year_found = y
                break

        if year_found:
            stats = empty()
            # Gather this line + possible continuation lines (indented)
            blob = stripped
            j = i + 1
            while j < n:
                l = lines[j]
                ls = l.strip()
                # Continuation lines are indented sub-bullets
                if ls.startswith('-') and (l.startswith('  ') or l.startswith('\t')):
                    blob += ' ' + ls
                    j += 1
                elif not ls or ls.startswith('#') or (ls.startswith('-') and not l.startswith(' ')):
                    break
                else:
                    blob += ' ' + ls
                    j += 1

            parsed = parse_inline(blob, ['gols', 'assist', 'ga', 'mins', 'jogos',
                                         'xg', 'xa', 'chancesCriadas', 'driblesCertos',
                                         'passesProgressivos', 'disponibilidade'])
            stats = merge(stats, parsed)
            data[current_player][year_found][current_context] = stats
            i = j
            continue

    # ---- FORMAT C: table for SELEÇÃO (| 2018/19 | 7 | 4 | ~2 | ~600 |) ----
    if stripped.startswith('|') and current_context == 'selecao':
        parts = [p.strip() for p in stripped.split('|')]
        parts = [p for p in parts if p]  # remove empty
        if len(parts) >= 4:
            year_found = None
            for y in year_keys:
                if y in parts[0]:
                    year_found = y
                    break
            if year_found:
                try:
                    jogos = clean_val(parts[1])
                    gols  = clean_val(parts[2])
                    assist = clean_val(parts[3])
                    ga = gols + assist
                    mins = clean_val(parts[4]) if len(parts) > 4 else 0
                    s = data[current_player][year_found]['selecao']
                    if jogos: s['jogos'] = jogos
                    if gols:  s['gols'] = gols
                    if assist: s['assist'] = assist
                    if ga:    s['ga'] = ga
                    if mins:  s['mins'] = mins
                except:
                    pass
        i += 1
        continue

    # ---- FORMAT D: bullet selecao inline like "2023/24:" ----
    if stripped.startswith('-') and current_context == 'selecao':
        for y in year_keys:
            pattern = rf'\*?\*?{y}'
            if re.search(pattern, stripped):
                parsed = parse_inline(stripped, ['gols', 'assist', 'ga', 'mins', 'jogos', 'disponibilidade'])
                s = data[current_player][y]['selecao']
                for k, v in parsed.items():
                    if v: s[k] = v
                break
        i += 1
        continue

    i += 1

# ---- Normalize ga (should be gols+assist when missing) ----
for p in data:
    for y in year_keys:
        for ctx in ['clubes', 'selecao']:
            s = data[p][y][ctx]
            if s['ga'] == 0 and (s['gols'] or s['assist']):
                s['ga'] = s['gols'] + s['assist']

# ---- Build JS output ----
js_players = """\
export const playersInfo = [
  { id: 'neymar', name: 'Neymar', color: '#ef4444' },
  { id: 'vini', name: 'Vini Jr', color: '#3b82f6' },
  { id: 'raphinha', name: 'Raphinha', color: '#22c55e' },
  { id: 'estevao', name: 'Estêvão', color: '#a855f7' },
  { id: 'joaopedro', name: 'João Pedro', color: '#f59e0b' },
  { id: 'rodrygo', name: 'Rodrygo', color: '#e2e8f0' },
  { id: 'richarlison', name: 'Richarlison', color: '#64748b' },
  { id: 'jesus', name: 'G. Jesus', color: '#0ea5e9' },
  { id: 'martinelli', name: 'Martinelli', color: '#ec4899' },
  { id: 'cunha', name: 'M. Cunha', color: '#8b5cf6' },
  { id: 'thiago', name: 'Igor Thiago', color: '#14b8a6' },
  { id: 'paqueta', name: 'Paquetá', color: '#f97316' },
  { id: 'henrique', name: 'L. Henrique', color: '#84cc16' },
  { id: 'endrick', name: 'Endrick', color: '#06b6d4' },
];

const createEmptyStats = () => ({ 
  gols: 0, assist: 0, ga: 0, mins: 0, jogos: 0, 
  xg: 0, xa: 0, chancesCriadas: 0, driblesCertos: 0, passesProgressivos: 0, disponibilidade: 0 
});
"""

player_order = ['neymar','vini','raphinha','estevao','joaopedro','rodrygo',
                'richarlison','jesus','martinelli','cunha','thiago','paqueta','henrique','endrick']

def fmt_stats(s):
    return (f"{{ gols: {s['gols']}, assist: {s['assist']}, ga: {s['ga']}, "
            f"mins: {s['mins']}, jogos: {s['jogos']}, "
            f"xg: {s['xg']}, xa: {s['xa']}, "
            f"chancesCriadas: {s['chancesCriadas']}, driblesCertos: {s['driblesCertos']}, "
            f"passesProgressivos: {s['passesProgressivos']}, disponibilidade: {s['disponibilidade']} }}")

js_evo = "export const evolutionData = [\n"
for y in year_keys:
    label = year_labels[y]
    js_evo += f"  {{\n    year: '{label}',\n"
    for ctx in ['clubes', 'selecao']:
        js_evo += f"    {ctx}: {{\n"
        for p in player_order:
            s = data.get(p, {}).get(y, {}).get(ctx, empty())
            js_evo += f"      {p}: {fmt_stats(s)},\n"
        js_evo += "    },\n"
    js_evo += "  },\n"
js_evo += "];\n"

js_matches = """
export const matchHistory = [
  {
    id: 1,
    date: 'Julho de 2019',
    opponent: 'Peru / Argentina',
    score: 'Brasil Campeão 3x1 / 2x0',
    importance: 'Máxima — Copa América 2019',
    neymarPlayed: false,
    playedWell: true,
    dataAnalysis: 'Neymar cortado por lesão. Brasil conquistou o título jogando futebol de altíssima eficiência tática. Jesus, Firmino e Everton Cebolinha foram protagonistas. Prova máxima de que o coletivo suplanta o individual.'
  },
  {
    id: 2,
    date: 'Março de 2024',
    opponent: 'Inglaterra',
    score: 'Brasil 1 x 0 Inglaterra',
    importance: 'Alta — Amistoso em Wembley',
    neymarPlayed: false,
    playedWell: true,
    dataAnalysis: 'Brasil dominou taticamente. xG 1.95 vs 0.8 da Inglaterra. Raphinha, Vini Jr e Rodrygo criaram 5 grandes chances. Endrick fez o gol da vitória com personalidade absurda.'
  },
  {
    id: 3,
    date: 'Novembro de 2022',
    opponent: 'Suíça',
    score: 'Brasil 1 x 0 Suíça',
    importance: 'Altíssima — Copa do Mundo (fase de grupos)',
    neymarPlayed: false,
    playedWell: true,
    dataAnalysis: 'Neymar saiu lesionado na estreia vs Sérvia. Suíça: xG 0.00 — zero chutes no gol. Brasil controlou com precisão e venceu com golaço coletivo do Casemiro.'
  },
  {
    id: 4,
    date: 'Dezembro de 2022',
    opponent: 'Coreia do Sul',
    score: 'Brasil 4 x 1 Coreia do Sul',
    importance: 'Altíssima — Oitavas da Copa do Mundo',
    neymarPlayed: true,
    playedWell: true,
    dataAnalysis: 'Auge do Neymar moderno. Participou de 2 gols nos primeiros 36 minutos. xG Brasil 3.2. O time foi uma máquina nesse jogo específico.'
  },
  {
    id: 5,
    date: 'Outubro de 2023',
    opponent: 'Uruguai',
    score: 'Uruguai 2 x 0 Brasil',
    importance: 'Alta — Eliminatórias Copa 2026',
    neymarPlayed: true,
    playedWell: false,
    dataAnalysis: 'Desastre. Brasil com Neymar titular: 0 chutes a gol. Neymar foi substituído. O estilo físico de Bielsa apagou qualquer criação individual.'
  }
];
"""

output = "// Banco de Dados Central — Scout Analytics 2026\n// Dados extraídos de FBref, Transfermarkt, Sofascore, StatMuse e fontes oficiais de clubes.\n\n"
output += js_players + "\n"
output += js_evo
output += js_matches

with open('/Users/jonataspontes/Dropbox/Coding/neymar/neymar-dashboard/src/data.js', 'w', encoding='utf-8') as f:
    f.write(output)

print("✅ data.js gerado com sucesso!")

# Quick sanity check
for p in player_order:
    total_ga = sum(data.get(p, {}).get(y, {}).get('clubes', empty()).get('ga', 0) for y in year_keys)
    print(f"  {p}: GA total clubes = {total_ga}")
