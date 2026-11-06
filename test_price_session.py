"""热力图价格日：1 日涨跌用哪两笔收盘，标题用哪一天。不联网。"""
import datetime as dt
import unittest

import constituents as C
import quality_gate as Q


class PriceSession(unittest.TestCase):
    def test_nov5_close_not_wednesday_rebound(self):
        # 纳斯达克历史日线：AAPL 11/4 收 349.51，11/5 收 344.17。筛选器曾把 349.51、+5.31% 当成「最新」。
        dates = ['2026-11-03', '2026-11-04', '2026-11-05']
        values = [331.90, 349.51, 344.17]
        bar = C.price_fields(dates, values, '2026-11-05')
        self.assertEqual(bar['px'], 344.17)
        self.assertEqual(bar['px_date'], '2026-11-05')
        self.assertTrue(bar['on_session'])
        self.assertAlmostEqual(bar['d1'], 344.17 / 349.51 - 1)
        wed = 349.51 / 331.90 - 1
        self.assertGreater(abs(bar['d1'] - wed), 0.05)
        self.assertAlmostEqual(round(bar['d1'], 4), -0.0153)

    def test_missing_thursday_bar_is_not_painted_as_thursday(self):
        dates = ['2026-11-03', '2026-11-04']
        values = [331.90, 349.51]
        bar = C.price_fields(dates, values, '2026-11-05')
        self.assertEqual(bar['px'], 349.51)
        self.assertEqual(bar['px_date'], '2026-11-04')
        self.assertFalse(bar['on_session'])
        self.assertIsNone(bar['d1'])

    def test_majority_thursday_is_the_label_not_the_newest_single_bar(self):
        last = ['2026-11-05'] * 396 + ['2026-11-04'] * 106 + ['2026-11-06']
        ps, n = C.choose_price_session(last, target='2026-11-05')
        self.assertEqual(ps, '2026-11-05')
        self.assertEqual(n, 397)

    def test_thin_thursday_stays_on_wednesday(self):
        last = ['2026-11-05'] * 40 + ['2026-11-04'] * 460
        ps, n = C.choose_price_session(last, target='2026-11-05')
        self.assertEqual(ps, '2026-11-04')
        self.assertEqual(n, 500)

    def test_failed_fetch_keeps_last_good_close(self):
        old = dict(px=344.17, px_date='2026-11-05', d1=-0.0153, on_session=True)
        kept = C.price_fields([], [], '2026-11-06', old)
        self.assertEqual(kept['px'], 344.17)
        self.assertEqual(kept['px_date'], '2026-11-05')
        self.assertFalse(kept['on_session'])
        self.assertIsNone(kept['d1'])
        same = C.price_fields([], [], '2026-11-05', old)
        self.assertTrue(same['on_session'])
        self.assertEqual(same['d1'], -0.0153)
        # 旧文件只有筛选器价格、没有价格日：不能当成某一天的收盘留下
        self.assertIsNone(C.price_fields([], [], '2026-11-05', dict(px=349.51, d1=0.0531))['px'])

    def test_us_session_before_open_and_across_dst(self):
        # 2026-11-06 08:41 UTC = 03:41 美东（夏令时已在 11/1 结束），美股还没开盘
        self.assertEqual(C.us_session(dt.datetime(2026, 11, 6, 8, 41, tzinfo=dt.timezone.utc)), '2026-11-05')
        # 同日 21:20 UTC = 16:20 美东，当天已经收盘
        self.assertEqual(C.us_session(dt.datetime(2026, 11, 6, 21, 20, tzinfo=dt.timezone.utc)), '2026-11-06')
        # 夏令时：16:00 美东还不算收盘，16:20 算
        self.assertEqual(C.us_session(dt.datetime(2026, 7, 15, 20, 0, tzinfo=dt.timezone.utc)), '2026-07-14')
        self.assertEqual(C.us_session(dt.datetime(2026, 7, 15, 20, 20, tzinfo=dt.timezone.utc)), '2026-07-15')

    def test_gate_rejects_asof_without_price_session(self):
        want = '2026-11-05'
        self.assertIsNotNone(Q.constituent_price_gap({'asof': '2026-11-05'}, want))
        self.assertIsNotNone(Q.constituent_price_gap({'price_session': '2026-11-04', 'price_session_n': 500, 'lagging_n': 0}, want))
        self.assertIsNotNone(Q.constituent_price_gap({'price_session': '2026-11-05', 'price_session_n': 396, 'lagging_n': 106}, want))
        self.assertIsNone(Q.constituent_price_gap({'price_session': '2026-11-05', 'price_session_n': 490, 'lagging_n': 12}, want))


if __name__ == '__main__':
    unittest.main()
