"""Add id attributes to headings that are missing them, then rebuild search index."""
import json, re, sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

data_dir = 'src/data'
with open(os.path.join(data_dir, 'index.json'), 'r', encoding='utf-8') as f:
    index = json.load(f)

total_fixed = 0

for section in index:
    slug = section['slug']
    fpath = os.path.join(data_dir, f'{slug}.json')
    if not os.path.exists(fpath):
        continue
    with open(fpath, 'r', encoding='utf-8') as f:
        sdata = json.load(f)
    html = sdata.get('html', '')
    if not html:
        continue

    used_ids = set()
    for m in re.finditer(r'id="([^"]+)"', html):
        used_ids.add(m.group(1))

    count = [0]

    def add_id(match):
        tag = match.group(1)
        attrs = match.group(2)
        content = match.group(3)
        if 'id=' in attrs:
            return match.group(0)

        text = re.sub(r'<[^>]+>', '', content).strip()
        slug_id = re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')[:60]
        base = slug_id
        counter = 2
        while slug_id in used_ids:
            slug_id = f'{base}-{counter}'
            counter += 1
        used_ids.add(slug_id)
        count[0] += 1
        return f'<{tag} id="{slug_id}"{attrs}>{content}</{tag}>'

    new_html = re.sub(r'<(h[1-4])([^>]*)>(.*?)</\1>', add_id, html, flags=re.DOTALL)

    if count[0] > 0:
        sdata['html'] = new_html
        with open(fpath, 'w', encoding='utf-8') as f:
            json.dump(sdata, f, ensure_ascii=False)
        print(f'{slug}: added {count[0]} heading IDs')
        total_fixed += count[0]

print(f'\nTotal headings fixed: {total_fixed}')

# Now rebuild search index
print('\nRebuilding search index...')
all_chunks = []

for section in index:
    slug = section['slug']
    name = section['name']
    section_file = os.path.join(data_dir, f'{slug}.json')
    if not os.path.exists(section_file):
        continue
    with open(section_file, 'r', encoding='utf-8') as f:
        sdata = json.load(f)
    html = sdata.get('html', '')
    if not html:
        continue

    parts = re.split(r'(<h[1-4][^>]*>.*?</h[1-4]>)', html)

    cur_h1 = name
    cur_heading = name
    cur_id = ''
    cur_text = ''

    for part in parts:
        hm = re.match(r'<(h[1-4])([^>]*)>(.*?)</\1>', part, re.DOTALL)
        if hm:
            plain = re.sub(r'<[^>]+>', '', cur_text).strip()
            if plain or cur_heading != name:
                all_chunks.append({
                    'section': slug, 'sectionName': name,
                    'heading': cur_heading, 'id': cur_id,
                    'text': plain[:600]
                })

            tag_name = hm.group(1)
            attrs = hm.group(2)
            id_m = re.search(r'id="([^"]*?)"', attrs)
            cur_id = id_m.group(1) if id_m else ''
            heading_text = re.sub(r'<[^>]+>', '', hm.group(3)).strip()

            if tag_name == 'h1':
                cur_h1 = heading_text
                cur_heading = heading_text
            else:
                generic_names = [
                    'Evaluation', 'Treatment', 'Prognosis', 'Clinical Presentation',
                    'Epidemiology', 'Diagnosis', 'Diagnostic Criteria', 'Pathophysiology',
                    'Workup', 'Management', 'Etiology', 'Complications', 'Prevention',
                    'Differential Diagnosis', 'Classification', 'Monitoring'
                ]
                generic = heading_text.rstrip(':') in generic_names
                if generic and cur_h1 != name:
                    cur_heading = f'{cur_h1} \u2014 {heading_text}'
                else:
                    cur_heading = heading_text
            cur_text = ''
        else:
            cur_text += ' ' + part

    plain = re.sub(r'<[^>]+>', '', cur_text).strip()
    if plain:
        all_chunks.append({
            'section': slug, 'sectionName': name,
            'heading': cur_heading, 'id': cur_id,
            'text': plain[:600]
        })

empty_ids = sum(1 for c in all_chunks if not c['id'])
print(f'Built {len(all_chunks)} chunks ({empty_ids} with empty id)')

with open(os.path.join(data_dir, 'search.json'), 'w', encoding='utf-8') as f:
    json.dump(all_chunks, f, ensure_ascii=False, indent=2)
with open('public/search.json', 'w', encoding='utf-8') as f:
    json.dump(all_chunks, f, ensure_ascii=False)
print('Saved search index')
