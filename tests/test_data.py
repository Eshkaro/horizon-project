import csv
import json
import unittest
from collections import defaultdict
from datetime import datetime
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class PortfolioIntegrity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads((ROOT / 'data/portfolio.json').read_text())
        cls.projects = {p['id']: p for p in cls.data['projects']}

    def rows(self, name):
        with (ROOT / 'data' / name).open() as f:
            return list(csv.DictReader(f))

    def test_exact_entity_and_one_project_per_participation(self):
        rows = self.rows('bocconi_participations.csv')
        self.assertEqual({r['organisationID'] for r in rows}, {'999838850'})
        self.assertEqual(len(rows), len({r['projectID'] for r in rows}))
        self.assertEqual({r['projectID'] for r in rows}, set(self.projects))

    def test_participant_money_reconciles_to_dashboard(self):
        rows = self.rows('bocconi_participations.csv')
        expected = sum(Decimal(r['netEcContribution'].replace(',', '.')) for r in rows)
        actual = sum(Decimal(str(p['bocconiEU'])) for p in self.projects.values())
        self.assertEqual(actual, expected)
        self.assertLess(actual, sum(Decimal(str(p['consortiumEU'])) for p in self.projects.values()))

    def test_sagittarius_independent_official_factsheet_spotcheck(self):
        # https://cordis.europa.eu/project/id/101104657 checked 29 October 2026.
        p = self.projects['101104657']
        self.assertEqual(p['bocconiEU'], 381937.75)
        self.assertEqual(p['start'], '2023-07-01')
        self.assertEqual(p['end'], '2028-06-30')
        self.assertEqual(p['consortiumEU'], 5999764.58)

    def test_project_columns_remain_aligned_after_source_csv_repair(self):
        for row in self.rows('projects.csv'):
            with self.subTest(project=row['id']):
                datetime.strptime(row['contentUpdateDate'], '%Y-%m-%d %H:%M:%S')
                if row['grantDoi']:
                    self.assertEqual(row['grantDoi'], '10.3030/' + row['id'])
                self.assertTrue(row['rcn'].isdigit())
                self.assertLessEqual(row['startDate'], row['endDate'])
        resolve = self.projects['101136502']
        self.assertIn('standardized, decentralized MRD analysis', resolve['objective'])
        self.assertEqual(resolve['updated'], '2026-09-02 13:40:17')

    def test_partner_edges_reconcile_without_duplicates(self):
        expected = defaultdict(set)
        for row in self.rows('collaborators.csv'):
            self.assertNotEqual(row['organisationID'], '999838850')
            expected[row['organisationID']].add(row['projectID'])
        self.assertEqual(len(expected), len(self.data['partners']))
        for p in self.data['partners']:
            self.assertEqual(set(p['projects']), expected[p['id']])
            self.assertEqual(p['count'], len(set(p['projects'])))


if __name__ == '__main__':
    unittest.main()
