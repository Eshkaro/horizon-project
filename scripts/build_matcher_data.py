"""Build an evidence index from an official CORDIS ZIP. Standard library only."""
import argparse
import csv
import hashlib
import io
import json
import re
import unicodedata
import zipfile
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BOCCONI = '999838850'
SCHEMES = {'HORIZON-RIA','HORIZON-IA','HORIZON-CSA','HORIZON-JU-RIA','HORIZON-JU-IA','HORIZON-JU-CSA'}
STOP = set('the and for with from this that will have has are was were can its our their into through both more new project projects research european europe union objective objectives aim aims how why what when where who improve improving also such these those which within using use based support development develop including provide towards across under other been being among between over not all any each only than them they about could would should ensure work activities results innovative innovation approach'.split())


def tokens(text):
    text = ''.join(c for c in unicodedata.normalize('NFD', text.lower()) if unicodedata.category(c) != 'Mn')
    return {t for t in re.findall(r'[a-z]{3,}', text) if t not in STOP}


def build(archive):
    z = zipfile.ZipFile(archive)
    repairs, excluded = [], []
    def rows(name):
        reader = csv.reader(io.TextIOWrapper(z.open(name), encoding='utf-8-sig'), delimiter=';')
        header = next(reader)
        for v in reader:
            if len(v) != len(header):
                if name == 'project.csv' and len(v)>len(header) and re.fullmatch(r'\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}',v[-6]) and v[-5].isdigit():
                    repairs.append(v[0]); v=v[:15]+[';'.join(v[15:-6])]+v[-6:]
                else:
                    excluded.append({'file':name,'firstField':v[0] if v else '', 'reason':'Unexpected CSV width'}); continue
            yield dict(zip(header,v))
    project_rows={p['id']:p for p in rows('project.csv') if p['fundingScheme'] in SCHEMES and not re.search('TERMINAT|CANCEL',p['status'],re.I)}
    participants=defaultdict(set)
    organisations={}
    bocconi_projects=set()
    for o in rows('organization.csv'):
        if o['organisationID']==BOCCONI:bocconi_projects.add(o['projectID'])
        if o['projectID'] not in project_rows or o['endOfParticipation']=='true':continue
        participants[o['projectID']].add(o['organisationID'])
        organisations[o['organisationID']]={k:o[k] for k in ['name','country','activityType','organizationURL','city']}
    # Three listed organisations is a corpus rule, not an eligibility judgement.
    ids=sorted(pid for pid,orgs in participants.items() if len(orgs)>=3)
    used_orgs=sorted({oid for pid in ids for oid in participants[pid] if oid!=BOCCONI})
    org_idx={oid:i for i,oid in enumerate(used_orgs)}
    science=defaultdict(set)
    for row in rows('euroSciVoc.csv'):
        if row['projectID'] in project_rows:science[row['projectID']].add(row['euroSciVocPath'])
    projects=[]; index=defaultdict(list); prior=defaultdict(set)
    for pid in ids:
        p=project_rows[pid]
        for oid in participants[pid]:
            if pid in bocconi_projects and oid!=BOCCONI:prior[oid].add(pid)
        text=' '.join([p['title'],p['objective'],p['keywords'],*science[pid]])
        n=len(projects)
        for term in tokens(text):index[term].append(n)
        projects.append({'id':pid,'acronym':p['acronym'],'title':p['title'],
                         'objective':p['objective'],'start':p['startDate'],'end':p['endDate'],
                         'scheme':p['fundingScheme'],'topics':p['topics'],
                         'orgs':[org_idx[o] for o in sorted(participants[pid]) if o!=BOCCONI]})
    orgs=[]
    for oid in used_orgs:
        o=organisations[oid]
        url=o['organizationURL']
        orgs.append({'id':oid,'name':o['name'],'country':('GR' if o['country']=='EL' else o['country'] if re.fullmatch('[A-Z]{2}',o['country']) else ''),'countryRaw':o['country'],'type':o['activityType'],
                     'city':o['city'],'website':url if re.match(r'^https?://',url,re.I) else '',
                     'bocconiProjects':sorted(prior[oid])})
    meta={'source':'https://cordis.europa.eu/data/cordis-HORIZONprojects-csv.zip',
          'retrievedDate':'2026-11-26','archiveLastModified':'2026-11-10T13:11:43Z',
          'archiveSHA256':hashlib.sha256(Path(archive).read_bytes()).hexdigest(),
          'archiveProjectFileTimestamp':z.getinfo('project.csv').date_time,
          'projectCount':len(projects),'organisationCount':len(orgs),'schemes':sorted(SCHEMES),
          'filters':'Non-terminated RIA/IA/CSA and JU equivalents with at least three listed organisations; ended participations excluded.',
          'csvRepairedProjectIDs':repairs,'csvExcludedRows':excluded,
          'countryRule':'EL normalised to GR. Ambiguous or malformed country values retained as countryRaw and left unclassified in country filters.',
          'identityRule':'Exact CORDIS organisation IDs. Bocconi ID 999838850 excluded from candidates. Affiliates are not merged.',
          'profileSource':'Manually summarised official institutional profiles, checked 2026-11-26. No publication author matching or personal contact details.'}
    corpus={'metadata':meta,'researchers':json.loads((ROOT/'data/researcher-profiles.json').read_text()),
            'call':json.loads((ROOT/'data/matcher-call.json').read_text()),'organisations':orgs,'projects':projects,'index':index,'stopWords':sorted(STOP)}
    text=json.dumps(corpus,ensure_ascii=False,separators=(',',':'))
    (ROOT/'data/matcher-corpus.json').write_text(text)
    (ROOT/'data/matcher-manifest.json').write_text(json.dumps(meta,indent=2))
    print(json.dumps({'projects':len(projects),'organisations':len(orgs),'sizeMB':round(len(text.encode())/1e6,2),'repairs':repairs,'excluded':excluded},indent=2))


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('archive',type=Path);args=parser.parse_args();build(args.archive)
