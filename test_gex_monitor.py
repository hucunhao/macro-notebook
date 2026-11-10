"""指数期权 GEX。夹具都是测试数据，不会写进 data/gex.js。"""
import datetime as dt
import json
import os
import tempfile
import unittest

import gex_monitor as G

UTC = dt.timezone.utc
NOV9 = dt.date(2026, 11, 9)


def occ(root, expiry, cp, strike):
    return '%s%s%s%08d' % (root, expiry.strftime('%y%m%d'), cp, int(round(strike * 1000)))


def opt(root, expiry, cp, strike, gamma, oi, iv=0.2):
    return {'option': occ(root, expiry, cp, strike), 'gamma': gamma, 'open_interest': oi, 'iv': iv}


def payload(index, spot, options, timestamp='2026-11-10 02:58:42', last='2026-11-09T16:14:59', security='index'):
    meta = G.INDEXES[index]
    return {
        'timestamp': timestamp,
        'symbol': meta['chain_symbol'],
        'data': {
            'symbol': meta['source_symbol'],
            'security_type': security,
            'current_price': spot,
            'last_trade_time': last,
            'options': options,
        },
    }


def hand(idx, session, quote, net, sign, flip, rel, close=True, spot=100.0, recorded='2026-11-10 10:00'):
    def w(net, sign, flip, rel):
        return {
            'net_gex': net, 'sign': sign, 'flip': flip,
            'flip_status': 'none' if flip is None else 'ok',
            'spot_vs_flip': rel,
            'call_wall': {'strike': 110, 'gex': 1},
            'put_wall': {'strike': 90, 'gex': -1},
        }
    return {
        'id': idx, 'status': 'ok', 'session_date': session, 'is_daily_close': close,
        'quote_timestamp_utc': quote, 'computed_at': recorded, 'last_success': recorded, 'spot': spot,
        'windows': {
            'all': w(net, sign, flip, rel),
            'd7': w(net, sign, flip, rel),
            'd30': w(net, sign, flip, rel),
        },
    }


class Formula(unittest.TestCase):
    def test_unit_sign_and_invalid(self):
        # 0.01 × 10 × 100 × 100² × 0.01 = 1000 美元 / 1%
        self.assertEqual(G.contract_gex(1, 0.01, 10, 100), 1000)
        self.assertEqual(G.contract_gex(-1, 0.01, 10, 100), -1000)
        self.assertEqual(G.contract_gex(1, 0, 10, 100), 0)
        self.assertIsNone(G.contract_gex(1, -0.01, 10, 100))
        self.assertIsNone(G.contract_gex(1, float('nan'), 10, 100))
        self.assertIsNone(G.contract_gex(1, 0.01, -1, 100))
        self.assertIsNone(G.contract_gex(1, 0.01, 10, 0))
        self.assertIsNone(G.contract_gex(1, None, 10, 100))

    def test_round_the_sum_not_each_contract(self):
        # 每张 0.5 美元，两张合计 1，不能先四舍五入成 1+1。
        day = dt.date(2026, 11, 16)
        gamma = 0.5 / (100.0 * (100.0 ** 2) * 0.01)
        chain = payload('SPX', 100, [
            opt('SPXW', day, 'C', 90, gamma, 1),
            opt('SPXW', day, 'C', 110, gamma, 1),
        ])
        snap = G.compute_index('SPX', chain, None, dt.datetime(2026, 11, 10, 2, 58, tzinfo=UTC))
        self.assertEqual(snap['windows']['all']['net_gex'], 1)
        self.assertEqual(snap['windows']['all']['sign'], 'positive')
        self.assertEqual(G.iround(0.5), 1)
        self.assertEqual(G.iround(-0.5), -1)

    def test_put_is_negative_and_walls_break_ties_toward_lower_strike(self):
        day = dt.date(2026, 11, 16)
        chain = payload('SPX', 100, [
            opt('SPX', day, 'C', 110, 0.02, 10),
            opt('SPX', day, 'C', 90, 0.02, 10),
            opt('SPX', day, 'P', 80, 0.01, 10),
            opt('SPX', day, 'P', 70, 0.05, 10),
        ])
        snap = G.compute_index('SPX', chain, None, dt.datetime(2026, 11, 10, 2, 58, tzinfo=UTC))
        w = snap['windows']['all']
        self.assertGreater(w['call_gex'], 0)
        self.assertLess(w['put_gex'], 0)
        self.assertEqual(w['net_gex'], w['call_gex'] + w['put_gex'])
        self.assertEqual(w['call_wall']['strike'], 90)
        self.assertEqual(w['put_wall']['strike'], 70)
        calls_only = payload('SPX', 100, [opt('SPX', day, 'C', 100, 0.02, 10)])
        bare = G.compute_index('SPX', calls_only, None, dt.datetime(2026, 11, 10, 2, 58, tzinfo=UTC))
        self.assertIsNone(bare['windows']['all']['put_wall'])


class Parsing(unittest.TestCase):
    def test_roots_expiries_and_filters(self):
        p = G.parse_symbol('SPXW261120C06510000')
        self.assertEqual((p['root'], p['expiry'].isoformat(), p['sign'], p['strike']), ('SPXW', '2026-11-20', 1, 6510))
        q = G.parse_symbol('NDXP261113P27900000')
        self.assertEqual((q['root'], q['cp'], q['strike']), ('NDXP', 'P', 27900))
        self.assertIsNotNone(G.parse_symbol('SPY261113C00750000'))
        self.assertIsNone(G.parse_symbol('not-an-option'))
        self.assertIsNone(G.parse_symbol('SPX261132C06510000'))
        self.assertIsNone(G.parse_symbol('SPX261120C00000000'))

        now = dt.datetime(2026, 11, 10, 2, 58, tzinfo=UTC)
        options = [
            opt('SPXW', dt.date(2026, 11, 9), 'C', 7500, 5, 999),          # 收盘后当天到期，去掉
            opt('SPXW', dt.date(2026, 11, 16), 'C', 7500, 0.01, 1),         # 7 个日历日
            opt('SPXW', dt.date(2026, 11, 16), 'C', 7500, 0.02, 4),         # 重复，留最后一条
            opt('SPXW', dt.date(2026, 11, 17), 'C', 7600, 0.01, 1),         # 8 日，不进 7 日
            opt('SPX', dt.date(2026, 12, 9), 'P', 7000, 0.01, 1),           # 正好 30 日
            opt('SPX', dt.date(2026, 12, 10), 'C', 8000, 0.01, 1),          # 31 日，只在全部
            opt('SPY', dt.date(2026, 11, 16), 'C', 750, 9, 100),            # 不是指数
            opt('SPXO', dt.date(2026, 11, 18), 'C', 7400, 0.01, 0),         # 指数根，未平仓 0
            {'option': 'SPXW261116P00720000', 'gamma': -1, 'open_interest': 50, 'iv': 0.2},
            {'option': '坏的', 'gamma': 1, 'open_interest': 1, 'iv': 0.2},
        ]
        snap = G.compute_index('SPX', payload('SPX', 7500, options), None, now)
        cov = snap['coverage']
        self.assertEqual(cov['duplicates'], 1)
        self.assertEqual(cov['expired'], 1)
        self.assertEqual(cov['rejected_roots'], {'SPY': 1})
        self.assertGreaterEqual(cov['invalid_gamma_or_oi'], 1)
        self.assertEqual(cov['unparsed'], 1)
        w = snap['windows']
        # 7 日列只有重复代码留下的那一张看涨。30 日再加 11-17、12-09 和未平仓为 0 的 SPXO。
        self.assertEqual(w['d7']['contracts_used'], 1)
        self.assertEqual(w['d30']['contracts_used'], 4)
        self.assertEqual(w['all']['contracts_used'], 5)
        self.assertLess(w['d7']['contracts_used'], w['d30']['contracts_used'])
        self.assertLess(w['d30']['contracts_used'], w['all']['contracts_used'])
        kept = G.contract_gex(1, 0.02, 4, 7500)
        self.assertEqual(w['d7']['net_gex'], G.iround(kept))
        self.assertNotIn('SPY', snap['coverage']['roots'])
        self.assertIn('SPXO', snap['coverage']['roots'])
        self.assertFalse(snap['proxy'])

    def test_ndx_keeps_ndxp_and_rejects_spx_roots(self):
        now = dt.datetime(2026, 11, 10, 2, 58, tzinfo=UTC)
        day = dt.date(2026, 11, 16)
        snap = G.compute_index('NDX', payload('NDX', 20000, [
            opt('NDXP', day, 'C', 20000, 0.001, 2),
            opt('NDX', day, 'P', 19000, 0.001, 2),
            opt('SPXW', day, 'C', 7500, 1, 100),
        ]), None, now)
        self.assertEqual(set(snap['coverage']['roots']), {'NDX', 'NDXP'})
        self.assertEqual(snap['coverage']['rejected_roots'], {'SPXW': 1})
        self.assertEqual(snap['source_symbol'], '^NDX')
        self.assertEqual(snap['security_type'], 'index')

    def test_spy_chain_and_empty_chain_are_not_computed(self):
        now = dt.datetime(2026, 11, 10, 2, 58, tzinfo=UTC)
        bad = payload('SPX', 750, [opt('SPY', dt.date(2026, 11, 16), 'C', 750, 0.1, 10)])
        bad['symbol'] = 'SPY'
        bad['data']['symbol'] = 'SPY'
        with self.assertRaises(G.ChainError) as caught:
            G.compute_index('SPX', bad, None, now)
        self.assertIn('不是', str(caught.exception))
        etf = payload('SPX', 7500, [opt('SPX', dt.date(2026, 11, 16), 'C', 7500, 0.1, 1)], security='etf')
        with self.assertRaises(G.ChainError):
            G.compute_index('SPX', etf, None, now)
        empty = payload('SPX', 7500, [])
        with self.assertRaises(G.ChainError):
            G.compute_index('SPX', empty, None, now)
        expired = payload('SPX', 7500, [opt('SPXW', dt.date(2026, 11, 9), 'C', 7500, 1, 100)])
        with self.assertRaises(G.ChainError):
            G.compute_index('SPX', expired, None, now)


class Flip(unittest.TestCase):
    def _book(self, specs):
        rows = [{'sign': s, 'oi': oi, 'strike': k, 'iv': iv, 't_years': 30 / 365} for s, k, oi, iv in specs]
        prep, bad = G.prepare_flip(rows)
        return prep, bad

    def test_no_root_is_not_the_spot(self):
        prep, bad = self._book([(1, 100, 50, 0.2)])
        self.assertEqual(bad, 0)
        found = G.find_zero_flips(prep, 100)
        self.assertEqual(found['flip_status'], 'none')
        self.assertIsNone(found['flip'])
        self.assertIsNone(found['spot_vs_flip'])
        self.assertNotEqual(found['flip'], 100)

    def test_one_root_changes_sign_and_invalid_iv_is_left_out(self):
        prep, _ = self._book([(-1, 80, 100, 0.2), (1, 120, 100, 0.2)])
        found = G.find_zero_flips(prep, 100)
        self.assertEqual(found['flip_status'], 'ok')
        self.assertEqual(len(found['flip_roots']), 1)
        root = found['flip']
        self.assertGreater(root, 80)
        self.assertLess(root, 120)
        below = G.reprice_gex(prep, root - 2)
        above = G.reprice_gex(prep, root + 2)
        self.assertLess(below, 0)
        self.assertGreater(above, 0)
        self.assertLess(abs(G.reprice_gex(prep, root)), min(abs(below), abs(above)))
        dirty, bad = self._book([
            (-1, 80, 100, 0.2), (1, 120, 100, 0.2),
            (-1, 100, 10 ** 9, 0), (-1, 100, 10 ** 9, 9), (-1, 100, 10 ** 9, None),
        ])
        self.assertGreaterEqual(bad, 3)
        self.assertEqual(len(dirty), len(prep))
        again = G.find_zero_flips(dirty, 100)
        self.assertEqual(again['flip'], found['flip'])

    def test_multiple_roots_and_flat_book(self):
        prep, _ = self._book([(-1, 70, 80, 0.2), (1, 100, 500, 0.2), (-1, 130, 80, 0.2)])
        found = G.find_zero_flips(prep, 100)
        self.assertEqual(found['flip_status'], 'multiple')
        self.assertGreaterEqual(len(found['flip_roots']), 2)
        nearest = min(found['flip_roots'], key=lambda r: (abs(r - 100), r))
        self.assertEqual(found['flip'], nearest)
        self.assertIn(found['spot_vs_flip'], ('above', 'below', 'at'))
        flat, _ = self._book([(-1, 100, 40, 0.2), (1, 100, 40, 0.2)])
        zero = G.find_zero_flips(flat, 100)
        self.assertEqual(zero['flip_reason'], 'flat')
        self.assertIsNone(zero['flip'])

    def test_chain_gamma_sign_does_not_invent_a_flip(self):
        # 看跌有巨大的链上 gamma，但隐含波动率无效。当前敞口为负；翻转点只重定价那张看涨，没有根。
        now = dt.datetime(2026, 11, 10, 2, 58, tzinfo=UTC)
        day = dt.date(2026, 12, 9)
        snap = G.compute_index('SPX', payload('SPX', 100, [
            opt('SPX', day, 'C', 100, 0.01, 10, iv=0.2),
            opt('SPX', day, 'P', 100, 1, 100, iv=0),
            opt('SPX', day, 'P', 90, 1, 100, iv=8),
        ]), None, now)
        w = snap['windows']['all']
        self.assertEqual(w['sign'], 'negative')
        self.assertIsNone(w['flip'])
        self.assertIn(w['flip_status'], ('none', 'undefined'))
        self.assertNotEqual(w['flip'], snap['spot'])
        self.assertTrue(any(x['code'] == 'iv_gap' for x in snap['warnings']))

    def test_tiny_iv_does_not_blow_up(self):
        prep, bad = self._book([(1, 100, 10, 1e-12)])
        self.assertEqual(prep, [])
        self.assertEqual(bad, 1)
        self.assertEqual(G.find_zero_flips(prep, 100)['flip_status'], 'undefined')


class Session(unittest.TestCase):
    def test_observed_spx_timestamp_is_utc_and_a_close(self):
        modified = dt.datetime(2026, 11, 10, 2, 58, 45, tzinfo=UTC)
        quote, zone, ok, _basis = G.parse_quote_timestamp('2026-11-10 02:58:42', modified)
        self.assertEqual(zone, 'UTC')
        self.assertTrue(ok)
        trade = G.parse_last_trade('2026-11-09T16:14:59')
        self.assertEqual(trade.hour, 16)
        self.assertEqual(trade.tzinfo.key, 'America/New_York')
        info = G.resolve_session(quote, trade)
        self.assertEqual(info['quote_et'], '2026-11-09 21:58:42')
        self.assertEqual(info['session_date'], '2026-11-09')
        self.assertTrue(info['is_daily_close'])
        self.assertFalse(info['stale_chain'])

    def test_daylight_saving_cutoff_uses_new_york_not_a_fixed_offset(self):
        def at(y, m, d, hh, mm, trade):
            quote = dt.datetime(y, m, d, hh, mm, tzinfo=UTC)
            return G.resolve_session(quote, G.parse_last_trade(trade))

        jan_open = at(2026, 1, 15, 20, 30, '2026-01-15T15:20:00')
        self.assertEqual(jan_open['quote_et'], '2026-01-15 15:30:00')
        self.assertFalse(jan_open['is_daily_close'])
        jan_late = at(2026, 1, 15, 22, 30, '2026-01-15T16:14:00')
        self.assertEqual(jan_late['quote_et'], '2026-01-15 17:30:00')
        self.assertTrue(jan_late['is_daily_close'])
        jul_open = at(2026, 7, 15, 19, 0, '2026-07-15T15:00:00')
        self.assertEqual(jul_open['quote_et'], '2026-07-15 15:00:00')
        self.assertFalse(jul_open['is_daily_close'])
        jul_late = at(2026, 7, 15, 22, 30, '2026-07-15T16:14:00')
        self.assertEqual(jul_late['quote_et'], '2026-07-15 18:30:00')
        self.assertTrue(jul_late['is_daily_close'])
        # 20:30 UTC 在冬令时还没收盘，在夏令时已经收盘。定时不能用这个钟点。
        self.assertLess(dt.datetime(2026, 1, 15, 20, 30, tzinfo=UTC).astimezone(G.ET).hour, 16)
        self.assertGreaterEqual(dt.datetime(2026, 7, 15, 20, 30, tzinfo=UTC).astimezone(G.ET).hour, 16)

    def test_existing_workflow_crons_are_after_the_close_in_both_seasons(self):
        text = open(os.path.join(G.ROOT, '.github', 'workflows', 'update-data.yml'), encoding='utf-8').read()
        self.assertGreaterEqual(text.count('gex_monitor.py'), 2)
        self.assertIn('30 22', text)
        self.assertIn('America/New_York', text)
        qdii = open(os.path.join(G.ROOT, '.github', 'workflows', 'update-qdii.yml'), encoding='utf-8').read()
        self.assertNotIn('gex_monitor', qdii)
        slots = [
            (2026, 1, 15, 22, 30), (2026, 7, 15, 22, 30),
            (2026, 1, 15, 23, 45), (2026, 7, 15, 23, 45),
            (2026, 1, 16, 1, 0), (2026, 7, 16, 1, 0),
        ]
        for part in slots:
            et = dt.datetime(*part, tzinfo=UTC).astimezone(G.ET)
            self.assertGreaterEqual((et.hour, et.minute), (16, 0), et.isoformat())

    def test_missing_last_trade_is_not_a_close(self):
        quote, _, _, _ = G.parse_quote_timestamp('2026-11-10 02:58:42', None)
        info = G.resolve_session(quote, None)
        self.assertFalse(info['is_daily_close'])


class History(unittest.TestCase):
    def test_close_idempotent_and_events_keep_prior_values(self):
        state = G.initial_state()
        first = hand('SPX', '2026-11-09', '2026-11-10 02:58:42', 1000, 'positive', 90, 'above', recorded='2026-11-10 10:00')
        state, status = G.accept_snapshot(state, first)
        self.assertEqual(status, 'appended_close')
        self.assertEqual(len(state['closes']['SPX']), 1)
        self.assertEqual(state['events'], [])
        retry = hand('SPX', '2026-11-09', '2026-11-10 04:00:00', -999, 'negative', 110, 'below', recorded='2026-11-10 12:00')
        again, status = G.accept_snapshot(state, retry)
        self.assertIs(again, state)
        self.assertEqual(status, 'duplicate_close')
        self.assertEqual(state['closes']['SPX'][0]['net_gex'], 1000)
        self.assertEqual(state['closes']['SPX'][0]['recorded_at'], '2026-11-10 10:00')
        self.assertEqual(state['closes']['SPX'][0]['sign'], 'positive')
        intraday = hand('SPX', '2026-11-10', '2026-11-10 15:00:00', 50, 'positive', 90, 'above', close=False, recorded='2026-11-10 23:00')
        state, status = G.accept_snapshot(state, intraday)
        self.assertEqual(status, 'updated_intraday')
        self.assertEqual(len(state['closes']['SPX']), 1)
        self.assertFalse(state['indices']['SPX']['is_daily_close'])
        second = hand('SPX', '2026-11-10', '2026-11-10 22:40:00', -50, 'negative', 120, 'below', recorded='2026-11-11 07:00')
        state, status = G.accept_snapshot(state, second)
        self.assertEqual(status, 'appended_close')
        self.assertEqual([c['session_date'] for c in state['closes']['SPX']], ['2026-11-09', '2026-11-10'])
        kinds = {e['type']: e for e in state['events']}
        self.assertEqual(set(kinds), {'sign_switch', 'flip_cross'})
        switch = kinds['sign_switch']
        self.assertEqual(switch['prior_date'], '2026-11-09')
        self.assertEqual(switch['current_date'], '2026-11-10')
        self.assertEqual(switch['prior_sign'], 'positive')
        self.assertEqual(switch['current_sign'], 'negative')
        self.assertEqual(switch['prior_net_gex'], 1000)
        self.assertEqual(switch['current_net_gex'], -50)
        cross = kinds['flip_cross']
        self.assertEqual(cross['prior_relation'], 'above')
        self.assertEqual(cross['current_relation'], 'below')
        self.assertEqual(cross['prior_flip'], 90)
        self.assertEqual(cross['current_flip'], 120)
        self.assertEqual(cross['prior_spot'], 100)
        self.assertEqual(cross['current_spot'], 100)
        replay, status = G.accept_snapshot(state, second)
        self.assertIs(replay, state)
        self.assertEqual(status, 'duplicate_close')
        self.assertEqual(len(state['events']), 2)
        older = hand('SPX', '2026-11-06', '2026-11-07 22:00:00', 1, 'positive', 90, 'above')
        skipped, status = G.accept_snapshot(state, older)
        self.assertIs(skipped, state)
        self.assertEqual(status, 'older_quote')
        self.assertEqual(len(state['closes']['SPX']), 2)

    def test_missing_flip_does_not_become_a_crossing(self):
        state = G.initial_state()
        state, _ = G.accept_snapshot(state, hand('NDX', '2026-11-09', '2026-11-10 02:00:00', 10, 'positive', None, None))
        state, _ = G.accept_snapshot(state, hand('NDX', '2026-11-10', '2026-11-11 02:00:00', -10, 'negative', None, None))
        self.assertEqual([e['type'] for e in state['events']], ['sign_switch'])
        vague = hand('NDX', '2026-11-12', '2026-11-13 02:00:00', 5, 'undefined', 80, 'above')
        vague['windows']['all']['sign'] = 'undefined'
        events = G.detect_events(state['closes']['NDX'][-1], G.close_row(vague), 'NDX')
        self.assertEqual(events, [])

    def test_one_index_failure_preserves_the_other_and_does_not_advance_freshness(self):
        state = G.initial_state()
        state, _ = G.accept_snapshot(state, hand('SPX', '2026-11-09', '2026-11-10 02:58:42', 1000, 'positive', 90, 'above'))
        state, _ = G.accept_snapshot(state, hand('NDX', '2026-11-09', '2026-11-10 05:59:25', -20, 'negative', 20000, 'below', spot=20000))
        before_spx = json.dumps(state['indices']['SPX'])
        before_closes = json.dumps(state['closes'])
        before_events = json.dumps(state['events'])
        ndx_success = state['indices']['NDX']['last_success']
        ndx_quote = state['indices']['NDX']['quote_timestamp_utc']
        failed, status = G.mark_fetch_failure(state, 'NDX', 'HTTP 500', dt.datetime(2026, 11, 11, 3, tzinfo=UTC))
        self.assertEqual(status, 'failed')
        self.assertEqual(json.dumps(failed['indices']['SPX']), before_spx)
        self.assertEqual(json.dumps(failed['closes']), before_closes)
        self.assertEqual(json.dumps(failed['events']), before_events)
        self.assertEqual(failed['indices']['NDX']['quote_timestamp_utc'], ndx_quote)
        self.assertEqual(failed['indices']['NDX']['last_success'], ndx_success)
        self.assertEqual(failed['indices']['NDX']['spot'], 20000)
        self.assertTrue(failed['indices']['NDX']['stale'])
        self.assertEqual(failed['indices']['NDX']['status'], 'ok')
        same, status = G.mark_fetch_failure(failed, 'NDX', 'HTTP 500', dt.datetime(2026, 11, 11, 4, tzinfo=UTC))
        self.assertIs(same, failed)
        self.assertEqual(status, 'failure_unchanged')
        spx_fail, _ = G.mark_fetch_failure(failed, 'SPX', '空的', dt.datetime(2026, 11, 11, 4, tzinfo=UTC))
        self.assertEqual(spx_fail['indices']['NDX']['spot'], 20000)
        self.assertEqual(spx_fail['indices']['SPX']['spot'], 100)
        self.assertTrue(spx_fail['indices']['SPX']['stale'])


class RunFiles(unittest.TestCase):
    def _chain(self, index, gamma=0.01):
        return payload(index, 100 if index == 'SPX' else 20000, [
            opt('SPXW' if index == 'SPX' else 'NDXP', dt.date(2026, 11, 16), 'C', 100 if index == 'SPX' else 20000, gamma, 10),
        ])

    def test_failure_keeps_file_and_retry_does_not_rewrite_the_close(self):
        now = dt.datetime(2026, 11, 10, 2, 58, tzinfo=UTC)
        with tempfile.TemporaryDirectory() as tmp:
            js, doc = os.path.join(tmp, 'gex.js'), os.path.join(tmp, 'gex.json')
            calls = {'n': 0}

            def fetch(idx, url):
                calls['n'] += 1
                if idx == 'NDX':
                    raise G.ChainError('HTTP 500')
                return self._chain('SPX'), None

            G.run(now=now, fetch=fetch, json_path=doc, js_path=js)
            first = open(doc, encoding='utf-8').read()
            saved = json.loads(first)
            self.assertEqual(saved['indices']['SPX']['status'], 'ok')
            self.assertTrue(saved['indices']['SPX']['is_daily_close'])
            self.assertEqual(len(saved['closes']['SPX']), 1)
            self.assertEqual(saved['indices']['NDX']['status'], 'unavailable')
            self.assertTrue(saved['indices']['NDX']['stale'])
            self.assertIsNone(saved['indices']['NDX']['spot'])
            self.assertFalse(saved['proxy'])
            self.assertIn('window.GEX=', open(js, encoding='utf-8').read())
            stamp = os.stat(doc).st_mtime_ns

            def fetch_again(idx, url):
                if idx == 'NDX':
                    raise G.ChainError('HTTP 500')
                return self._chain('SPX', gamma=0.5), None

            G.run(now=dt.datetime(2026, 11, 10, 5, tzinfo=UTC), fetch=fetch_again, json_path=doc, js_path=js)
            self.assertEqual(os.stat(doc).st_mtime_ns, stamp)
            self.assertEqual(open(doc, encoding='utf-8').read(), first)

            def both_fail(idx, url):
                raise G.ChainError('超时')

            G.run(now=dt.datetime(2026, 11, 11, 4, tzinfo=UTC), fetch=both_fail, json_path=doc, js_path=js)
            later = json.loads(open(doc, encoding='utf-8').read())
            self.assertEqual(later['closes']['SPX'], saved['closes']['SPX'])
            self.assertEqual(later['indices']['SPX']['spot'], saved['indices']['SPX']['spot'])
            self.assertEqual(later['indices']['SPX']['quote_timestamp_utc'], saved['indices']['SPX']['quote_timestamp_utc'])
            self.assertEqual(later['indices']['SPX']['last_success'], saved['indices']['SPX']['last_success'])
            self.assertTrue(later['indices']['SPX']['stale'])
            self.assertTrue(later['indices']['NDX']['stale'])
            self.assertIsNone(later['indices']['NDX']['windows'])


class PageWiring(unittest.TestCase):
    def test_real_script_order_exports_window_gex(self):
        root = G.ROOT
        html = open(os.path.join(root, 'index.html'), encoding='utf-8').read()
        data_at = html.index('src="data/gex.js"')
        js_at = html.index('src="js/gex.js"')
        app_at = html.index('src="js/app.js"')
        self.assertLess(data_at, js_at)
        self.assertLess(js_at, app_at)
        self.assertIn('href="#/gex"', html)
        js = open(os.path.join(root, 'js', 'gex.js'), encoding='utf-8').read()
        app = open(os.path.join(root, 'js', 'app.js'), encoding='utf-8').read()
        self.assertIn('window.Gex =', js)
        self.assertNotIn('fetch(', js)
        self.assertNotIn('cdn.cboe.com', js)
        self.assertIn("'gex'", app)
        self.assertIn('window.Gex', app)


if __name__ == '__main__':
    unittest.main()
