"""QDII 监视：T-1 和 EST 不合并，申购未知不当成正常，拖累公式，历史只追加真观察。"""
import unittest
import qdii_monitor as Q

T1_HTML = '''<title>2026年11月6日纳指100/标普500场内溢价</title><span class="gen-time">15:30 生成</span>
<table><tr><td>纳斯达克100</td><td>国泰基金</td><td class="c-code">513100</td><td>纳指ETF国泰</td><td>2013-04-25</td><td>197.66</td><td>4.95</td>
<td class="c-limit" title="前一日收盘价/最新净值-1（净值2026-11-04）"><span class="num">+17.16%</span></td><td>0.80%</td></tr>
<tr><td>标普500</td><td>博时基金</td><td>513500</td><td>标普500ETF博时</td><td>2013-04-01</td><td>10</td><td>1</td>
<td title="前一日收盘价/最新净值-1（净值2026-11-04）">+9.50%</td><td>0.80%</td></tr>
<tr><td>纳斯达克100</td><td>华夏基金</td><td>015299</td><td>联接A</td><td><span class="badge">暂停</span></td><td><span>暂停</span></td><td>0.80%</td><td>2.42%</td><td>代销 2026-07-31</td></tr>
</table>'''

EST_HTML = '''<table>
<tr><td><a>SH513100</a></td><td>2.158</td><td>-3.19%</td><td>2026-11-06</td><td>15:00</td><td>纳指ETF国泰</td></tr>
<tr><td title="纳指ETF国泰"><a>SH513100</a></td><td>1.781</td><td>2026-11-05</td><td>21.17%</td><td>1.769</td><td>21.98%</td><td>1.791</td><td>20.49%</td></tr>
<tr><td><a>SH513500</a></td><td>2.000</td><td>2026-11-05</td><td>8.00%</td><td>1.900</td><td>10.00%</td><td></td><td></td></tr>
</table>'''


class Monitor(unittest.TestCase):
    def test_t1_keeps_nav_date_and_does_not_invent_subscription(self):
        t1 = Q.parse_qdiilimit(T1_HTML)
        row = t1['funds']['513100']
        self.assertEqual(row['t1_premium'], 17.16)
        self.assertEqual(row['t1_nav_date'], '2026-11-04')
        snap = Q.build_snapshot(t1, Q.parse_palmmicro(EST_HTML), '2026-11-06 17:00')
        fund = next(f for f in snap['funds'] if f['code'] == '513100')
        self.assertEqual(fund['subscription'], 'unknown')
        self.assertNotEqual(fund['subscription'], 'normal')
        self.assertEqual(fund['t1_premium'], 17.16)
        self.assertEqual(fund['rt_premium'], 20.49)
        self.assertNotEqual(fund['t1_premium'], fund['rt_premium'])

    def test_empty_realtime_stays_empty(self):
        est = Q.parse_palmmicro(EST_HTML)
        self.assertIsNone(est['est']['513500']['rt_premium'])
        self.assertEqual(est['est']['513500']['official_premium'], 8.0)
        self.assertEqual(est['est']['513500']['ref_premium'], 10.0)

    def test_limit_states_do_not_call_blank_normal(self):
        self.assertEqual(Q.subscription_state('暂停', '暂停')[0], 'suspended')
        self.assertEqual(Q.subscription_state('10', '暂停')[0], 'limited')
        self.assertEqual(Q.subscription_state(None, None)[0], 'unknown')
        self.assertEqual(Q.subscription_state('无代销', '无直销')[0], 'unknown')

    def test_theme_spread_counts_only_present_values(self):
        t1 = Q.parse_qdiilimit(T1_HTML)
        snap = Q.build_snapshot(t1, Q.parse_palmmicro(EST_HTML), '2026-11-06 17:00')
        nasdaq = snap['themes']['nasdaq']['rt']
        self.assertEqual(nasdaq['n'], 1)
        self.assertEqual(nasdaq['missing'], 4)
        self.assertIsNone(nasdaq['spread'])
        spx = snap['themes']['spx']['t1']
        self.assertEqual(spx['n'], 1)
        self.assertGreater(spx['missing'], 0)

    def test_drag_example(self):
        # 15% 买入溢价，净值年化 7%，10 年，卖出溢价 0
        raw = Q.drag(0.15, 0.07, 10, 0)
        shown = Q.format_drag(raw)
        self.assertEqual(shown['cumulative_pct'], 71.1)
        self.assertEqual(shown['annualized_pct'], 5.5)
        self.assertEqual(shown['wealth_vs_nav_pct'], -13.0)
        self.assertEqual(shown['ending_multiple'], 1.711)
        self.assertEqual(shown['nav_ending_multiple'], 1.967)
        self.assertEqual(shown['shortfall_pct'], 13.0)
        nav_only = (1.07 ** 10) - 1
        self.assertGreater(nav_only, raw['cumulative'])

    def test_history_appends_only_new_observations(self):
        t1 = Q.parse_qdiilimit(T1_HTML)
        snap = Q.build_snapshot(t1, Q.parse_palmmicro(EST_HTML), '2026-11-06 17:00')
        obs = Q.new_observations(snap)
        hist, added = Q.merge_history(None, obs)
        self.assertEqual(added, len(obs))
        again, added2 = Q.merge_history(hist, obs)
        self.assertEqual(added2, 0)
        self.assertEqual(len(again['observations']), len(obs))
        changed = dict(obs[0], value=obs[0]['value'] + 1)
        _, added3 = Q.merge_history(again, [changed])
        self.assertEqual(added3, 1)
        self.assertLess(Q.history_days(again, 't1'), 30)

    def test_failure_keeps_last_success(self):
        import os, tempfile, json
        from pathlib import Path
        tmp = tempfile.mkdtemp()
        old_root_files = (Q.CONTENT, Q.LATEST, Q.HISTORY, Q.DATA_JS, Q.DATA_JSON)
        content = os.path.join(tmp, 'content', 'qdii')
        os.makedirs(content)
        Q.CONTENT = content
        Q.LATEST = os.path.join(content, 'latest.json')
        Q.HISTORY = os.path.join(content, 'history.json')
        Q.DATA_JS = os.path.join(tmp, 'qdii_monitor.js')
        Q.DATA_JSON = os.path.join(tmp, 'qdii_monitor.json')
        try:
            t1 = Q.parse_qdiilimit(T1_HTML)
            snap = Q.build_snapshot(t1, Q.parse_palmmicro(EST_HTML), '2026-11-06 17:00')
            snap['last_success'] = '2026-11-06 17:00'
            Q.write_outputs(snap, dict(version=1, observations=[]))
            msg = Q.keep_failure('模拟断网', '2026-11-07 09:00')
            saved = json.loads(Path(Q.LATEST).read_text())
            self.assertIn('kept previous', msg)
            self.assertEqual(saved['last_success'], '2026-11-06 17:00')
            self.assertEqual(saved['update_error'], '模拟断网')
            self.assertEqual(saved['funds'][0]['code'], '513100')
            self.assertTrue(saved['funds'])
        finally:
            Q.CONTENT, Q.LATEST, Q.HISTORY, Q.DATA_JS, Q.DATA_JSON = old_root_files


def _source(codes):
    t1 = dict(funds={}, page_title='t', generated_on_page='15:30 生成')
    est = dict(prices={}, est={})
    want = set(codes)
    for code, theme, name in Q.WATCH:
        if code not in want: continue
        label = '纳斯达克100' if theme == 'nasdaq' else '标普500'
        t1['funds'][code] = dict(name=name, theme_label=label, t1_premium=10.0, t1_nav_date='2026-11-04', t1_title='前一日收盘价/最新净值-1')
        est['prices'][code] = dict(price=1.5, price_date='2026-11-06', price_time='15:00', name=name)
        est['est'][code] = dict(name=name, official_est=1.2, est_date='2026-11-05', official_premium=11.0,
                                ref_est=1.1, ref_premium=12.0, rt_est=1.15, rt_premium=13.0)
    for i in range(20):
        c = f'8{i:05d}'
        t1['funds'][c] = dict(name='别的基金', theme_label='纳斯达克100', t1_premium=1.0, t1_nav_date='2026-11-04', t1_title='x')
        est['est'][c] = dict(official_est=1, est_date='2026-11-05', official_premium=1, ref_est=1, ref_premium=1, rt_est=1, rt_premium=1)
    return t1, est


class PartialFailure(unittest.TestCase):
    def test_absent_target_keeps_previous_and_does_not_advance_success(self):
        codes = [c for c, _, _ in Q.WATCH]
        t1, est = _source(codes)
        self.assertGreaterEqual(len(t1['funds']), 5)   # 别的行很多，以前会因此算成功
        old = Q.apply_parsed_update(t1, est, None, '2026-11-06 17:00')
        self.assertFalse(old['partial'])
        self.assertEqual(old['last_success'], '2026-11-06 17:00')
        t1, est = _source([c for c in codes if c != '513100'])
        new = Q.apply_parsed_update(t1, est, old, '2026-11-07 16:20')
        self.assertTrue(new['partial'])
        self.assertEqual(new['last_success'], '2026-11-06 17:00')
        row = next(f for f in new['funds'] if f['code'] == '513100')
        self.assertTrue(row['stale'])
        self.assertEqual(row['t1_premium'], 10.0)
        self.assertEqual(row['rt_premium'], 13.0)
        self.assertNotEqual(row['t1_premium'], 0)
        self.assertEqual(row['last_success'], '2026-11-06 17:00')
        other = next(f for f in new['funds'] if f['code'] == '159941')
        self.assertFalse(other['stale'])
        self.assertEqual(other['last_success'], '2026-11-07 16:20')
        self.assertFalse(any(o['code'] == '513100' for o in Q.new_observations(new)))

    def test_field_turning_none_restores_previous_number(self):
        codes = [c for c, _, _ in Q.WATCH]
        old = Q.apply_parsed_update(*_source(codes), None, '2026-11-06 17:00')
        t1, est = _source(codes)
        est['est']['159659']['rt_premium'] = None
        est['est']['159659']['rt_est'] = None
        new = Q.apply_parsed_update(t1, est, old, '2026-11-07 16:20')
        row = next(f for f in new['funds'] if f['code'] == '159659')
        self.assertTrue(row['stale'])
        self.assertEqual(row['rt_premium'], 13.0)
        self.assertIsNotNone(row['rt_premium'])
        self.assertEqual(row['t1_premium'], 10.0)
        self.assertEqual(new['last_success'], '2026-11-06 17:00')
        self.assertNotIn(0, (row['rt_premium'], row['t1_premium']))

    def test_recovery_clears_stale_and_advances_success(self):
        codes = [c for c, _, _ in Q.WATCH]
        old = Q.apply_parsed_update(*_source(codes), None, '2026-11-06 17:00')
        t1, est = _source([c for c in codes if c != '513500'])
        partial = Q.apply_parsed_update(t1, est, old, '2026-11-07 16:20')
        self.assertTrue(partial['partial'])
        recovered = Q.apply_parsed_update(*_source(codes), partial, '2026-11-08 16:20')
        self.assertFalse(recovered['partial'])
        self.assertIsNone(recovered['update_error'])
        self.assertEqual(recovered['last_success'], '2026-11-08 16:20')
        self.assertFalse(any(f.get('stale') for f in recovered['funds']))
        self.assertTrue(all(f['last_success'] == '2026-11-08 16:20' for f in recovered['funds']))


if __name__ == '__main__':
    unittest.main()
