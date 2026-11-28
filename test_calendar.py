"""经济日历故障回退与核验时间；不联网、不改仓库数据。"""
import datetime as dt
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch, Mock
import sys

import extra_data as C

FRED = '''<title>Economic Release Calendar</title><table><tbody>
<tr><td colspan="3"><span class="date">Friday November 13, 2026</span></td></tr>
<tr><td>7:30 am</td><td><a href="/release?rid=10">Consumer Price Index</a></td></tr>
</tbody></table>'''
FOMC = '''FOMC Meetings <h2>2026 FOMC Meetings</h2>
<div class="fomc-meeting__month"><strong>December</strong></div>
<div class="fomc-meeting__date">8-9*</div>'''


def event(day='2026-11-13', **kw):
    return dict(date=day, tw=day + ' 21:30', name='CPI 消费者物价', desc='测试', imp=3,
                src='FRED', url='https://fred.stlouisfed.org/release?rid=10', **kw)


class CalendarTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.raw = Path(self.tmp.name) / 'raw'; self.out = Path(self.tmp.name) / 'data'
        self.out.mkdir(); (self.raw / 'cal').mkdir(parents=True)
        for name, value in [('RAW', str(self.raw)), ('OUT', str(self.out)),
                            ('TODAY', dt.date(2026, 11, 13)), ('STATUS', {}),
                            ('RELEASES', {10: C.RELEASES[10]})]:
            p = patch.object(C, name, value); p.start(); self.addCleanup(p.stop)
        p = patch.object(C.time, 'sleep'); p.start(); self.addCleanup(p.stop)

    def old(self, rows, **kw):
        (self.out / 'calendar.json').write_text(json.dumps(dict(events=rows, **kw)))

    def build(self, status='missing'):
        with patch.object(C, 'get', return_value=status):
            return C.build_calendar()

    def test_missing_keeps_rows_in_taipei_window_without_invented_verification(self):
        self.old([event('2026-10-22'), event(), event('2027-01-01')], generated='2026-11-12 12:00')
        result = self.build()
        self.assertEqual(len(result['events']), 1)
        self.assertTrue(result['events'][0]['stale'])
        self.assertIsNone(result['events'][0]['last_verified'])
        self.assertIsNone(result['sources']['FRED 日历:10']['last_success'])
        self.assertEqual(result['stale_n'], 2)

    def test_recent_raw_cache_is_still_unverified_when_fetch_failed(self):
        (self.raw / 'cal' / 'fred_10.html').write_text(FRED)
        result = self.build('cached')
        row = result['events'][0]
        self.assertEqual(row['tw'], '2026-11-13 21:30')
        self.assertTrue(row['stale'])
        self.assertIsNone(row['last_verified'])
        self.assertIsNone(result['asof'])

    def test_success_clears_stale_and_sets_source_and_event_time(self):
        self.old([event(stale=True, last_verified='2026-11-01 10:00')])
        (self.raw / 'cal' / 'fred_10.html').write_text(FRED)
        (self.raw / 'cal' / 'fomc.html').write_text(FOMC)
        result = self.build('ok')
        self.assertEqual(result['stale_n'], 0)
        self.assertEqual(len(result['events']), 2)
        self.assertFalse(result['events'][0]['stale'])
        self.assertEqual(result['events'][0]['last_verified'], result['last_attempt'])
        self.assertEqual(result['sources']['FRED 日历:10']['last_success'], result['last_attempt'])
        self.assertEqual(result['events'][1]['tw'], '2026-12-10 03:00')

    def test_failed_refresh_preserves_existing_verification_time(self):
        self.old([event(last_verified='2026-11-10 08:00')],
                 sources={'FRED 日历:10': {'last_success': '2026-11-10 08:00'}})
        result = self.build()
        self.assertEqual(result['events'][0]['last_verified'], '2026-11-10 08:00')
        self.assertEqual(result['sources']['FRED 日历:10']['last_success'], '2026-11-10 08:00')
        self.assertTrue(result['events'][0]['stale'])

    def test_http_200_unparseable_html_does_not_erase_old_events(self):
        self.old([event()])
        (self.raw / 'cal' / 'fred_10.html').write_text('<h1>Economic Release Calendar</h1>')
        result = self.build('ok')
        self.assertEqual(len(result['events']), 1)
        self.assertEqual(result['sources']['FRED 日历:10']['status'], 'parse_error')
        self.assertTrue(result['events'][0]['stale'])

    def test_invalid_date_is_isolated_to_source(self):
        self.old([event()])
        (self.raw / 'cal' / 'fred_10.html').write_text(FRED.replace('November 13', 'November 32'))
        (self.raw / 'cal' / 'fomc.html').write_text(FOMC)
        result = self.build('ok')
        self.assertEqual(result['sources']['FRED 日历:10']['status'], 'parse_error')
        self.assertEqual(result['sources']['美联储 FOMC 日程']['status'], 'ok')

    def test_taipei_window_boundary_and_deduplication(self):
        row = event('2026-11-09'); row['tw'] = '2026-11-10 03:00'
        self.old([row, row])
        result = self.build()
        self.assertEqual(len(result['events']), 1)
        self.assertEqual(result['events'][0]['date'], '2026-11-09')

    def test_dst_and_unknown_time(self):
        self.assertEqual(C._ct_to_taipei(dt.date(2026, 7, 10), '7:30 am'), '2026-07-10 20:30')
        self.assertEqual(C._ct_to_taipei(dt.date(2026, 11, 13), '7:30 am'), '2026-11-13 21:30')
        self.assertIsNone(C._ct_to_taipei(dt.date(2026, 11, 13), 'N/A'))

    def test_all_expired_events_can_publish_empty_window_and_failure_status(self):
        self.old([event('2026-10-01')])
        result = self.build()
        self.assertEqual(result['events'], [])
        self.assertEqual(result['stale_n'], 2)
        # 全局的“0 条保留原文件”保护不能遮蔽日历新产生的失败状态。
        with patch.object(C, 'build_calendar', return_value=result), \
             patch.object(C, 'build_world', return_value={'indices': [], 'cmdty': []}), \
             patch.object(C, 'build_earnings', return_value={}), \
             patch.object(C, 'build_qdii', return_value={}), \
             patch.object(C, 'dump') as dump, \
             patch.dict(sys.modules, {'qdii_monitor': Mock(run=Mock(return_value='skipped'))}):
            C.run()
        self.assertTrue(any(call.args[0] == 'calendar' and call.args[2]['events'] == [] for call in dump.call_args_list))


if __name__ == '__main__':
    unittest.main()
