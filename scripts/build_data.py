"""Build a traceable Bocconi-only extract from the official CORDIS CSV archive.

Python standard library only. No API key is required.
"""
import argparse
import csv
import hashlib
import io
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from urllib.request import urlopen
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
URL = 'https://cordis.europa.eu/data/cordis-HORIZONprojects-csv.zip'
PIC = '999838850'


def amount(value):
    return None if not value.strip() else float(Decimal(value.replace(',', '.')))


def build(archive, retrieved, last_modified=None):
    z = ZipFile(archive)
    repairs = []
    def read(name):
        reader = csv.reader(io.TextIOWrapper(z.open(name), encoding='utf-8-sig'), delimiter=';')
        fields = next(reader)
        result = []
        for values in reader:
            if name == 'project.csv' and values[0] not in ids:
                continue
            if len(values) != len(fields):
                # This snapshot has unescaped semicolons in RESOLVE's objective.
                # Recover the variable-width objective only with validated tail anchors.
                if (name == 'project.csv' and len(values) > len(fields)
                        and re.fullmatch(r'\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}', values[-6])
                        and values[-5].isdigit() and values[-4].startswith('10.3030/')):
                    repairs.append({'file': name, 'projectID': values[0], 'repair': 'Rejoined unescaped objective semicolons; validated trailing date, RCN and DOI.'})
                    values = values[:15] + [';'.join(values[15:-6])] + values[-6:]
                else:
                    raise ValueError('Unexpected CSV width in ' + name + ': ' + str(values[:2]))
            result.append(dict(zip(fields, values)))
        return result

    organisations = read('organization.csv')
    candidates = [r for r in organisations if 'BOCCONI' in r['name'].upper()]
    mine = [r for r in organisations if r['organisationID'] == PIC]
    ids = {r['projectID'] for r in mine}
    if len(ids) != len(mine):
        raise ValueError('Duplicate Bocconi project participations: review before aggregating.')
    projects = {r['id']: r for r in read('project.csv') if r['id'] in ids}
    if ids != set(projects):
        raise ValueError('Some participation rows have no matching project.')
    scopes = defaultdict(set)
    for row in read('euroSciVoc.csv'):
        if row['projectID'] in ids:
            scopes[row['projectID']].add(row['euroSciVocPath'])
    topic_rows = [r for r in read('topics.csv') if r['projectID'] in ids]
    topic_names = {r['topic']: r['title'] for r in topic_rows}
    collaborators = [r for r in organisations if r['projectID'] in ids and r['organisationID'] != PIC]
    partner_sets = defaultdict(set)
    partner_info = {}
    for row in collaborators:
        partner_sets[row['organisationID']].add(row['projectID'])
        partner_info[row['organisationID']] = row
    result = []
    for row in mine:
        p = projects[row['projectID']]
        result.append({
            'id': p['id'], 'acronym': p['acronym'], 'title': p['title'],
            'start': p['startDate'], 'end': p['endDate'], 'sourceStatus': p['status'],
            'role': row['role'], 'participationEnded': row['endOfParticipation'] == 'true',
            'bocconiEU': amount(row['netEcContribution']),
            'bocconiGrossEU': amount(row['ecContribution']),
            'consortiumEU': amount(p['ecMaxContribution']),
            'scheme': p['fundingScheme'], 'topics': p['topics'],
            'topicTitles': [topic_names.get(t.strip(), t.strip()) for t in p['topics'].split(';') if t.strip()],
            'sciencePaths': sorted(scopes[p['id']]), 'objective': p['objective'],
            'updated': p['contentUpdateDate'], 'url': 'https://cordis.europa.eu/project/id/' + p['id'],
        })
    result.sort(key=lambda p: (p['start'], p['id']), reverse=True)
    partners = sorted([{'id': pid, 'name': partner_info[pid]['name'],
        'country': partner_info[pid]['country'], 'projects': sorted(shared), 'count': len(shared)}
        for pid, shared in partner_sets.items()], key=lambda p: (-p['count'], p['name']))
    metadata = {
        'institution': 'Università Commerciale Luigi Bocconi', 'organisationID': PIC,
        'source': URL, 'retrievedUTC': retrieved, 'httpLastModified': last_modified,
        'archiveSHA256': hashlib.sha256(Path(archive).read_bytes()).hexdigest(),
        'archiveProjectFileTimestamp': list(z.getinfo('project.csv').date_time),
        'nameMatches': dict(Counter(r['organisationID'] + ' | ' + r['name'] for r in candidates)),
        'projectCount': len(result), 'missingNetContributions': sum(p['bocconiEU'] is None for p in result),
        'nameMatchOutsidePIC': sorted({r['organisationID'] for r in candidates if r['organisationID'] != PIC}),
        'csvRepairs': repairs,
    }
    data = {'metadata': metadata, 'projects': result, 'partners': partners}
    target = ROOT / 'data'
    target.mkdir(exist_ok=True)
    (target / 'portfolio.json').write_text(json.dumps(data, ensure_ascii=False, indent=2))
    # Embed data so the dashboard also works by double-clicking index.html.
    (ROOT / 'portfolio-data.js').write_text('window.PORTFOLIO = ' + json.dumps(data, ensure_ascii=False).replace('</', '<\\/') + ';\n')
    for name, records in [('bocconi_participations.csv', mine), ('projects.csv', list(projects.values())),
                          ('collaborators.csv', collaborators), ('topics.csv', topic_rows)]:
        with (target / name).open('w', newline='') as f:
            w = csv.DictWriter(f, fieldnames=list(records[0]) if records else [])
            w.writeheader(); w.writerows(records)
    (target / 'source-manifest.json').write_text(json.dumps(metadata, indent=2, ensure_ascii=False))
    from build_page import build_page
    build_page()
    print(json.dumps({'projects': len(result), 'partners': len(partners), 'metadata': metadata}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path, help='Use an existing official ZIP instead of downloading.')
    parser.add_argument('--retrieved', help='Original archive retrieval timestamp (UTC).')
    parser.add_argument('--last-modified', help='HTTP Last-Modified header of the original download.')
    args = parser.parse_args()
    retrieved = args.retrieved or datetime.now(timezone.utc).isoformat()
    archive = args.archive
    modified = args.last_modified
    if archive is None:
        archive = ROOT / 'data' / 'cordis-HORIZONprojects-csv.zip'
        with urlopen(URL, timeout=120) as response:
            modified = response.headers.get('Last-Modified')
            archive.write_bytes(response.read())
    build(archive, retrieved, modified)
