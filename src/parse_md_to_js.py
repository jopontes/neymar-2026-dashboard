import re
import json

md_file = '/Users/jonataspontes/Dropbox/Coding/neymar/neymar-dashboard/src/compass_artifact_wf-544c5c5a-d86d-4c54-a53c-a0452472f349_text_markdown.md'

with open(md_file, 'r', encoding='utf-8') as f:
    content = f.read()

# mapping names in MD to IDs in our JS
player_map = {
    'NEYMAR JR': 'neymar',
    'VINÍCIUS JÚNIOR': 'vini',
    'RAPHINHA': 'raphinha',
    'RODRYGO': 'rodrygo',
    'RICHARLISON': 'richarlison',
    'GABRIEL JESUS': 'jesus',
    'GABRIEL MARTINELLI': 'martinelli',
    'MATHEUS CUNHA': 'cunha',
    'LUCAS PAQUETÁ': 'paqueta',
    'JOÃO PEDRO': 'joaopedro',
    'ESTÊVÃO': 'estevao',
    'IGOR THIAGO': 'thiago',
    'ENDRICK': 'endrick'
}

# The years we want in our JS array
# In the MD, years are like "2018/19", "2019/20", "2020/21", "2021/22", "2022/23", "2023/24", "2024/25", "2025/26"
year_map = {
    '2018/19': '2018',
    '2019/20': '2019',
    '2020/21': '2020',
    '2021/22': '2021',
    '2022/23': '2022',
    '2023/24': '2023',
    '2024/25': '2024',
    '2025/26': '2025/26'
}

years = list(year_map.values())

data_structure = []
for y in years:
    data_structure.append({
        'year': y,
        'clubes': {},
        'selecao': {}
    })

def clean_val(val_str):
    if not val_str or 'N/A' in val_str or 'empty' in val_str:
        return 0
    val_str = val_str.replace('*', '').replace('~', '').replace('%', '').strip()
    try:
        if '.' in val_str and len(val_str.split('.')[1]) > 0: # Check if it's actually thousands like 2.550 or decimal like 1.5
             if len(val_str.split('.')[1]) == 3: # thousands
                 return int(val_str.replace('.', ''))
             return float(val_str)
        return int(val_str.replace('.', ''))
    except:
        return 0

def extract_metric(line, metric_name):
    # e.g., "gols: **23** | assist: **13**"
    # or "xg: ~17 | xa: ~10"
    match = re.search(rf'{metric_name}:\s*([^\s|]+)', line)
    if match:
         return clean_val(match.group(1))
    return 0

current_player = None
current_context = None

lines = content.split('\n')
i = 0
while i < len(lines):
    line = lines[i].strip()
    
    if line.startswith('## '):
        for k, v in player_map.items():
            if k in line.upper():
                current_player = v
                break
    
    elif line.startswith('### '):
        if 'CLUBE' in line.upper():
            current_context = 'clubes'
        elif 'SELEÇÃO' in line.upper() or 'SELECAO' in line.upper():
            current_context = 'selecao'
            
    elif line.startswith('#### '):
        year_key = None
        for k, v in year_map.items():
            if k in line:
                year_key = v
                break
        
        if year_key and current_player and current_context:
            stats = {
                'gols': 0, 'assist': 0, 'ga': 0, 'mins': 0, 'jogos': 0,
                'xg': 0, 'xa': 0, 'chancesCriadas': 0, 'driblesCertos': 0, 'passesProgressivos': 0, 'disponibilidade': 0
            }
            
            # Read next few lines for stats
            j = i + 1
            while j < len(lines) and lines[j].startswith('-'):
                stat_line = lines[j]
                
                if 'gols:' in stat_line:
                    stats['gols'] = extract_metric(stat_line, 'gols')
                    stats['assist'] = extract_metric(stat_line, 'assist')
                    stats['ga'] = extract_metric(stat_line, 'ga')
                    stats['mins'] = extract_metric(stat_line, 'mins')
                    stats['jogos'] = extract_metric(stat_line, 'jogos')
                elif 'xg:' in stat_line:
                    stats['xg'] = extract_metric(stat_line, 'xg')
                    stats['xa'] = extract_metric(stat_line, 'xa')
                    stats['chancesCriadas'] = extract_metric(stat_line, 'chancesCriadas')
                    stats['driblesCertos'] = extract_metric(stat_line, 'driblesCertos')
                    stats['passesProgressivos'] = extract_metric(stat_line, 'passesProgressivos')
                elif 'disponibilidade:' in stat_line:
                    stats['disponibilidade'] = extract_metric(stat_line, 'disponibilidade')
                    
                j += 1
            
            # Add to data_structure
            for y_obj in data_structure:
                if y_obj['year'] == year_key:
                    y_obj[current_context][current_player] = stats
                    break
            
            i = j - 1 # skip processed lines
            
    i += 1

# Make sure all players exist for all years/contexts, fill missing with 0s
for y_obj in data_structure:
    for ctx in ['clubes', 'selecao']:
        for p in player_map.values():
            if p not in y_obj[ctx]:
                 y_obj[ctx][p] = {
                    'gols': 0, 'assist': 0, 'ga': 0, 'mins': 0, 'jogos': 0,
                    'xg': 0, 'xa': 0, 'chancesCriadas': 0, 'driblesCertos': 0, 'passesProgressivos': 0, 'disponibilidade': 0
                 }

js_output = "export const evolutionData = [\n"
for y_obj in data_structure:
    js_output += f"  {{\n    year: '{y_obj['year']}',\n"
    for ctx in ['clubes', 'selecao']:
        js_output += f"    {ctx}: {{\n"
        player_lines = []
        for p in player_map.values():
            stats = y_obj[ctx][p]
            player_lines.append(f"      {p}: {{ gols: {stats['gols']}, assist: {stats['assist']}, ga: {stats['ga']}, mins: {stats['mins']}, jogos: {stats['jogos']}, xg: {stats['xg']}, xa: {stats['xa']}, chancesCriadas: {stats['chancesCriadas']}, driblesCertos: {stats['driblesCertos']}, passesProgressivos: {stats['passesProgressivos']}, disponibilidade: {stats['disponibilidade']} }}")
        js_output += ",\n".join(player_lines) + "\n"
        js_output += f"    }}{',' if ctx == 'clubes' else ''}\n"
    js_output += "  },\n"
js_output += "];\n"

with open('/Users/jonataspontes/Dropbox/Coding/neymar/neymar-dashboard/src/evolution_data_generated.js', 'w', encoding='utf-8') as f:
    f.write(js_output)
    
print("Successfully generated evolution_data_generated.js")
