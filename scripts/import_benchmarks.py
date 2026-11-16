"""Import the Commission's downloaded Qlik chart export. Read-only XLSX input."""
import csv
import hashlib
import json
import shutil
import sys
from pathlib import Path
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'https://dashboard.tech.ec.europa.eu/qs_digit_dashboard_mt/public/sense/app/28b39a3a-4d62-4180-9dfa-551489b06928/sheet/9ccb6c45-f749-4b6a-aecd-eeb2868d5916/state/analysis'
GLOSSARY = SOURCE.replace('9ccb6c45-f749-4b6a-aecd-eeb2868d5916', 'f499d2d6-f222-411d-997f-689f3bd251e1')


def main(path):
    sheet = openpyxl.load_workbook(path, data_only=True, read_only=True).active
    rows = list(sheet.values)
    assert rows[0] == ('Thematic Priority Descr', 'Retained Proposals', 'Non-Successful Eligible Proposals', 'Success Rate Proposals')
    records = []
    for name, retained, non_successful, rate in rows[1:]:
        eligible = retained + non_successful
        assert eligible > 0 and abs(rate - retained / eligible) < 1e-12
        records.append({'name': name, 'retained': retained, 'nonSuccessful': non_successful,
                        'eligible': eligible, 'exportedRate': rate})
    assert len(records) == 14
    assert sum(r['retained'] for r in records) == 26072
    assert sum(r['eligible'] for r in records) == 184441
    raw = ROOT / 'data' / 'horizon-proposals-source.xlsx'
    shutil.copy2(path, raw)
    data = {
        'metadata': {'source': SOURCE, 'glossary': GLOSSARY, 'retrievedDate': '2026-11-16',
                     'sourceCutoff': None, 'filters': {'Programme': 'HORIZON EUROPE'},
                     'chart': 'Eligible and retained proposals by programme/thematic priority',
                     'fileSHA256': hashlib.sha256(raw.read_bytes()).hexdigest(),
                     'refresh': 'Static snapshot. Refresh requires a new official export.',
                     'definitions': {
                         'eligible': 'Excludes ineligible, inadmissible, duplicate and withdrawn proposals and proposals without evaluation results.',
                         'retained': 'Eligible proposals with final evaluation status MAIN, shortlisted or mainlisted for funding. Not the same as a signed grant.',
                         'applications': 'Organisation participations in proposals. One organisation in N proposals counts N times; not used as the success-rate denominator.'},
                     'limitations': ['The export does not specify a data cutoff; retrieval date is not the date of the latest evaluation.',
                                    'EIC figures include resubmissions. They are not unique applicant counts.',
                                    'EIT data have availability gaps and a small number of proposals.',
                                    'Thematic areas contain different funding schemes and eligibility rules. Rates do not measure proposal quality or individual chances.']},
        'overall': {'name': 'Horizon Europe overall', 'eligible': 184441, 'retained': 26072, 'nonSuccessful': 158369},
        'areas': records,
        'frameworks': [
            {'name': 'Horizon Europe', 'eligible': 184441, 'retained': 26072},
            {'name': 'Horizon 2020', 'eligible': 285615, 'retained': 34155},
            {'name': 'FP7', 'eligible': 135805, 'retained': 25163}],
    }
    (ROOT / 'data' / 'proposal-benchmarks.json').write_text(json.dumps(data, ensure_ascii=False, indent=2))
    (ROOT / 'benchmarks-data.js').write_text('window.BENCHMARKS = ' + json.dumps(data, ensure_ascii=False).replace('</', '<\\/') + ';\n')
    with (ROOT / 'data' / 'proposal-benchmarks.csv').open('w', newline='') as f:
        fields = ['name', 'eligible', 'retained', 'nonSuccessful', 'exportedRate']
        w = csv.DictWriter(f, fieldnames=fields); w.writeheader(); w.writerows(records)
    print(f'Imported {len(records)} areas; {data["overall"]["retained"]:,} / {data["overall"]["eligible"]:,} = {26072/184441:.2%}')


if __name__ == '__main__':
    main(Path(sys.argv[1]))
