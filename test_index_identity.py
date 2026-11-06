"""100.NDX 不能标成纳斯达克 100。首页纳指100的日期不能借用标普的收盘日。"""
import json
import unittest

import extra_data as E


class Identity(unittest.TestCase):
    def test_provider_name_wins_over_nasdaq100_label(self):
        # 供应商返回「纳斯达克」时，请求里写的「纳斯达克 100」不能上页面。
        name = E.published_index_name('纳斯达克', '纳斯达克 100', '100.NDX')
        self.assertEqual(name, '纳斯达克')
        self.assertNotIn('100', name)

    def test_missing_provider_name_does_not_invent_nasdaq100(self):
        self.assertIsNone(E.published_index_name(None, '纳斯达克 100', '100.NDX'))
        self.assertIsNone(E.published_index_name('  ', '纳斯达克 100', '100.NDX100'))

    def test_ndx100_keeps_its_own_provider_name(self):
        name = E.published_index_name('纳斯达克100', '别的称呼', '100.NDX100')
        self.assertEqual(name, '纳斯达克100')
        other = E.published_index_name('纳斯达克', '纳斯达克 100', '100.NDX')
        self.assertNotEqual(name, other)

    def test_other_indices_keep_requested_name(self):
        self.assertEqual(E.published_index_name('标普500', '标普 500', '100.SPX'), '标普 500')

    def test_published_world_file_matches_provider(self):
        world = json.load(open('data/world.json'))
        ndx = next(x for x in world['indices'] if x.get('secid') == '100.NDX')
        self.assertEqual(ndx['name'], ndx['provider_name'])
        self.assertNotIn('100', ndx['name'])
        self.assertNotEqual(ndx['name'], '纳斯达克 100')
        ndx100 = next(x for x in world['indices'] if x.get('secid') == '100.NDX100')
        self.assertEqual(ndx100['name'], ndx100['provider_name'])
        self.assertIn('100', ndx100['name'])
        self.assertNotEqual(ndx['id'], ndx100['id'])
        # 两条序列的最近收盘不能是同一个数，否则又把两个代码写成了同一只。
        self.assertNotEqual(ndx['v'][-1], ndx100['v'][-1])


class Banner(unittest.TestCase):
    def test_js_banner_does_not_borrow_spx_date(self):
        import pathlib, subprocess
        script = r'''
const b = require("./js/equity_banner.js").banner;
const lag = b([{name:"标普", date:"2026-11-05"}, {name:"纳指100", date:"2026-11-04"}]);
if (lag.includes("美股收盘 2026-11-05")) process.exit(2);
if (!lag.includes("标普截至 2026-11-05")) process.exit(3);
if (!lag.includes("纳指100截至 2026-11-04")) process.exit(4);
const same = b([{name:"标普", date:"2026-11-05"}, {name:"纳指100", date:"2026-11-05"}]);
if (same !== "美股收盘 2026-11-05") process.exit(5);
console.log(lag);
console.log(same);
'''
        r = subprocess.run(['node', '-e', script], cwd=pathlib.Path(__file__).resolve().parent, capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)


if __name__ == '__main__':
    unittest.main()
