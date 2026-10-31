import datetime
import importlib.util
import pathlib
import tempfile
import types
import unittest
from unittest.mock import patch

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / 'scripts/collect-motion-popularity.py'
spec = importlib.util.spec_from_file_location('motion_popularity_collector', SCRIPT)
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)

class PopularityCollectionTest(unittest.TestCase):
    def test_failed_refresh_keeps_newest_known_record(self):
        source='https://x.com/author/status/123'
        collector.now=datetime.datetime(2026,10,30,tzinfo=datetime.timezone.utc)
        collector.args=types.SimpleNamespace(max_age_hours=72)
        collector.prior={'works':{'123':{'sourceUrl':source,'likes':200,'observedAt':'2026-10-26T00:00:00+00:00'}}}
        collector.media={'123':{'sourceUrl':source,'likes':100,'metricsCheckedAt':'2026-10-23T00:00:00+00:00'}}
        with tempfile.TemporaryDirectory() as folder, patch.object(collector,'CACHE',pathlib.Path(folder)), patch.object(collector,'download',side_effect=RuntimeError('offline')):
            _,result=collector.collect_x({'id':'123','sourceUrl':source})
        self.assertEqual(result['likes'],200)
        self.assertEqual(result['observedAt'],'2026-10-26T00:00:00+00:00')

if __name__=='__main__':unittest.main()
