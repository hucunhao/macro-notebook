window.GEX={
  "version": 1,
  "kind": "index_option_gex",
  "advice": false,
  "proxy": false,
  "formula": "sign × gamma × open_interest × 100 × spot² × 0.01",
  "assumption": "做市商多看涨、空看跌",
  "method": {
    "formula": "sign × gamma × open_interest × 100 × spot² × 0.01",
    "sign": "看涨 +1，看跌 −1",
    "assumption": "做市商多看涨、空看跌",
    "spot_gex": "当前净敞口用链上给出的 gamma，不改写。",
    "t": "到期日减行情所属交易日，按日历日。时间 = 日历日 / 365。利率和股息都按 0。",
    "expired": "每日收盘快照里，到期日早于交易日、或到期日就是当天的合约，视为已到期，不计入。盘中同一天到期的合约仍计入，剩余时间按到美东 16:00，最少按 15 分钟。",
    "windows": "三列都含当天（若未到期）：全部到期、0–7 个日历日、0–30 个日历日。按日历日，不是交易日。",
    "flip": "翻转点不用当前 gamma 平移。隐含波动率有效的合约，按 Black-Scholes 在现货的 60%–140% 上重算 gamma，再套同一条公式。取离现货最近的根。没有根、有多根、或整段接近 0，都写明，不编一个价。",
    "iv": "隐含波动率须为有限正数且不超过 300%。否则不参与翻转点，链上 gamma 仍可计入当前敞口。不填一个替代波动率。",
    "walls": "看涨墙是该列里看涨 GEX 合计最大的行权价；看跌墙是看跌 GEX 合计最负的行权价。打平时取更低的行权价。没有正的看涨或负的看跌就空着。",
    "roots": "标普指数期权只收 SPX、SPXW、SPXO。纳指指数期权只收 NDX、NDXP。SPY 和 QQQ 不是指数，不代入，也不做代理。",
    "close": "美东 16:00 及之后，且成交时间的日期就是这个交易日，才追加每日收盘。America/New_York 自带夏令时。同一交易日再次抓到，不改已记下的收盘和当时的切换记录。不补造更早的日子。",
    "oi": "链上没有未平仓的截止日期。未平仓通常比成交价晚一个交易日。本站不编这个日期。",
    "delay": "来源是 CBOE 公开延迟行情，大约 15 分钟，不是即时成交。",
    "model": "美元金额换一套模型可能差很多。本站只保证自己这套算法前后一致。负伽马只表示在上述假设下，做市商对冲可能放大波动，不表示涨跌方向。不构成投资建议。",
    "duplicate": "同一合约代码出现两次时只留最后一条，不重复加总。",
    "timestamp": "文件里的 timestamp 无时区。能对上 HTTP Last-Modified（GMT）时按 UTC。成交时间无时区时按美东，因为它对着现金收盘。"
  },
  "indices": {
    "SPX": {
      "id": "SPX",
      "name": "标普 500",
      "status": "ok",
      "stale": false,
      "stale_reason": null,
      "proxy": false,
      "not_proxy": "SPY",
      "last_attempt": "2026-11-12 11:37",
      "last_success": "2026-11-12 11:37",
      "computed_at": "2026-11-12 11:37",
      "quote_timestamp_utc": "2026-11-12 03:18:52",
      "quote_timestamp_zone": "UTC",
      "quote_timestamp_basis": "与 HTTP Last-Modified（GMT）一致，按 UTC",
      "quote_timestamp_checked": true,
      "quote_timestamp_et": "2026-11-11 22:18:52",
      "last_trade_time": "2026-11-11T16:14:59",
      "last_trade_zone": "America/New_York",
      "session_date": "2026-11-11",
      "is_daily_close": true,
      "expected_session": "2026-11-11",
      "chain_behind": false,
      "spot": 7619.3799,
      "security_type": "index",
      "source_symbol": "^SPX",
      "chain_symbol": "_SPX",
      "source_url": "https://cdn.cboe.com/api/global/delayed_quotes/options/_SPX.json",
      "http_status": 200,
      "content_length": 13919295,
      "last_modified": "Thu, 12 Nov 2026 03:18:54 GMT",
      "final_url": "https://cdn-api.cboe.com/api/global/delayed_quotes/options/_SPX.json",
      "delay_note": "来源是 CBOE 公开延迟行情，大约 15 分钟，不是即时成交。",
      "assumption": "做市商多看涨、空看跌",
      "formula": "sign × gamma × open_interest × 100 × spot² × 0.01",
      "windows": {
        "all": {
          "label": "全部到期",
          "dte_max": null,
          "net_gex": -8096174976,
          "call_gex": 281210654172,
          "put_gex": -289306829148,
          "sign": "negative",
          "call_wall": {
            "strike": 8000.0,
            "gex": 34884511221
          },
          "put_wall": {
            "strike": 8000.0,
            "gex": -31516499737
          },
          "contracts_used": 30656,
          "expiries": 54,
          "oi_used": 25038607,
          "strikes_total": 893,
          "strikes_shown": 40,
          "strikes": [
            {
              "strike": 6200.0,
              "call_gex": 85375610,
              "put_gex": -1066579737,
              "net_gex": -981204127,
              "call_oi": 14989,
              "put_oi": 234784
            },
            {
              "strike": 6500.0,
              "call_gex": 197456496,
              "put_gex": -1612447210,
              "net_gex": -1414990714,
              "call_oi": 29729,
              "put_oi": 316727
            },
            {
              "strike": 6800.0,
              "call_gex": 571173626,
              "put_gex": -1661155314,
              "net_gex": -1089981687,
              "call_oi": 52814,
              "put_oi": 163831
            },
            {
              "strike": 6900.0,
              "call_gex": 880025960,
              "put_gex": -2221902271,
              "net_gex": -1341876310,
              "call_oi": 56173,
              "put_oi": 169161
            },
            {
              "strike": 7000.0,
              "call_gex": 22945452686,
              "put_gex": -25535789086,
              "net_gex": -2590336400,
              "call_oi": 1318187,
              "put_oi": 1484345
            },
            {
              "strike": 7100.0,
              "call_gex": 660218309,
              "put_gex": -2637169328,
              "net_gex": -1976951020,
              "call_oi": 33752,
              "put_oi": 140001
            },
            {
              "strike": 7150.0,
              "call_gex": 443499180,
              "put_gex": -1647936201,
              "net_gex": -1204437021,
              "call_oi": 18605,
              "put_oi": 77306
            },
            {
              "strike": 7200.0,
              "call_gex": 1344930001,
              "put_gex": -3849228965,
              "net_gex": -2504298964,
              "call_oi": 59173,
              "put_oi": 166941
            },
            {
              "strike": 7250.0,
              "call_gex": 556456696,
              "put_gex": -4063817477,
              "net_gex": -3507360780,
              "call_oi": 20612,
              "put_oi": 138479
            },
            {
              "strike": 7300.0,
              "call_gex": 1005029879,
              "put_gex": -5686691356,
              "net_gex": -4681661477,
              "call_oi": 33752,
              "put_oi": 172811
            },
            {
              "strike": 7350.0,
              "call_gex": 1098986010,
              "put_gex": -3854105581,
              "net_gex": -2755119571,
              "call_oi": 32680,
              "put_oi": 104660
            },
            {
              "strike": 7400.0,
              "call_gex": 3644672348,
              "put_gex": -8518960150,
              "net_gex": -4874287802,
              "call_oi": 90923,
              "put_oi": 205246
            },
            {
              "strike": 7425.0,
              "call_gex": 703260249,
              "put_gex": -1800789079,
              "net_gex": -1097528831,
              "call_oi": 16057,
              "put_oi": 38992
            },
            {
              "strike": 7450.0,
              "call_gex": 2308137094,
              "put_gex": -5300167304,
              "net_gex": -2992030211,
              "call_oi": 50768,
              "put_oi": 98521
            },
            {
              "strike": 7475.0,
              "call_gex": 929604888,
              "put_gex": -2884373111,
              "net_gex": -1954768223,
              "call_oi": 20612,
              "put_oi": 47909
            },
            {
              "strike": 7500.0,
              "call_gex": 7003522761,
              "put_gex": -13396290031,
              "net_gex": -6392767270,
              "call_oi": 141707,
              "put_oi": 232722
            },
            {
              "strike": 7510.0,
              "call_gex": 435830121,
              "put_gex": -1718490382,
              "net_gex": -1282660261,
              "call_oi": 5270,
              "put_oi": 15752
            },
            {
              "strike": 7520.0,
              "call_gex": 760183127,
              "put_gex": -2072027612,
              "net_gex": -1311844485,
              "call_oi": 8699,
              "put_oi": 20469
            },
            {
              "strike": 7550.0,
              "call_gex": 4618219028,
              "put_gex": -6204756314,
              "net_gex": -1586537286,
              "call_oi": 62240,
              "put_oi": 86992
            },
            {
              "strike": 7600.0,
              "call_gex": 10029654449,
              "put_gex": -13488173600,
              "net_gex": -3458519151,
              "call_oi": 145423,
              "put_oi": 189513
            },
            {
              "strike": 7650.0,
              "call_gex": 8904148938,
              "put_gex": -7950706688,
              "net_gex": 953442250,
              "call_oi": 100140,
              "put_oi": 102531
            },
            {
              "strike": 7700.0,
              "call_gex": 16487054295,
              "put_gex": -13597160158,
              "net_gex": 2889894137,
              "call_oi": 230190,
              "put_oi": 209196
            },
            {
              "strike": 7750.0,
              "call_gex": 7855159851,
              "put_gex": -6218712724,
              "net_gex": 1636447127,
              "call_oi": 123666,
              "put_oi": 102366
            },
            {
              "strike": 7775.0,
              "call_gex": 2965382989,
              "put_gex": -1975093262,
              "net_gex": 990289727,
              "call_oi": 49454,
              "put_oi": 32972
            },
            {
              "strike": 7800.0,
              "call_gex": 8354798168,
              "put_gex": -5781953724,
              "net_gex": 2572844444,
              "call_oi": 167648,
              "put_oi": 122832
            },
            {
              "strike": 7825.0,
              "call_gex": 2707473873,
              "put_gex": -1438944187,
              "net_gex": 1268529686,
              "call_oi": 57314,
              "put_oi": 32321
            },
            {
              "strike": 7850.0,
              "call_gex": 4381436109,
              "put_gex": -2601128815,
              "net_gex": 1780307293,
              "call_oi": 103241,
              "put_oi": 55827
            },
            {
              "strike": 7900.0,
              "call_gex": 4553586452,
              "put_gex": -1856365083,
              "net_gex": 2697221369,
              "call_oi": 125176,
              "put_oi": 51846
            },
            {
              "strike": 7950.0,
              "call_gex": 2099911404,
              "put_gex": -565815154,
              "net_gex": 1534096250,
              "call_oi": 70244,
              "put_oi": 17904
            },
            {
              "strike": 8000.0,
              "call_gex": 34884511221,
              "put_gex": -31516499737,
              "net_gex": 3368011484,
              "call_oi": 1241167,
              "put_oi": 1112911
            },
            {
              "strike": 8040.0,
              "call_gex": 1571681025,
              "put_gex": -42339475,
              "net_gex": 1529341549,
              "call_oi": 46829,
              "put_oi": 1120
            },
            {
              "strike": 8050.0,
              "call_gex": 2981911233,
              "put_gex": -253624660,
              "net_gex": 2728286573,
              "call_oi": 126364,
              "put_oi": 9454
            },
            {
              "strike": 8100.0,
              "call_gex": 4700657057,
              "put_gex": -596166282,
              "net_gex": 4104490775,
              "call_oi": 216622,
              "put_oi": 23079
            },
            {
              "strike": 8150.0,
              "call_gex": 2632884873,
              "put_gex": -228510089,
              "net_gex": 2404374784,
              "call_oi": 119310,
              "put_oi": 10622
            },
            {
              "strike": 8160.0,
              "call_gex": 1167682433,
              "put_gex": -5062392,
              "net_gex": 1162620041,
              "call_oi": 51336,
              "put_oi": 224
            },
            {
              "strike": 8200.0,
              "call_gex": 3802616645,
              "put_gex": -347186018,
              "net_gex": 3455430628,
              "call_oi": 200213,
              "put_oi": 18894
            },
            {
              "strike": 8250.0,
              "call_gex": 1755912603,
              "put_gex": -107186854,
              "net_gex": 1648725749,
              "call_oi": 87668,
              "put_oi": 5557
            },
            {
              "strike": 8300.0,
              "call_gex": 1780794955,
              "put_gex": -196016733,
              "net_gex": 1584778221,
              "call_oi": 121244,
              "put_oi": 10905
            },
            {
              "strike": 8400.0,
              "call_gex": 1833590126,
              "put_gex": -192957238,
              "net_gex": 1640632889,
              "call_oi": 130206,
              "put_oi": 10186
            },
            {
              "strike": 8500.0,
              "call_gex": 1655210487,
              "put_gex": -240155912,
              "net_gex": 1415054575,
              "call_oi": 153449,
              "put_oi": 13090
            }
          ],
          "flip": 7634.43,
          "flip_status": "ok",
          "flip_reason": null,
          "flip_roots": [
            7634.43
          ],
          "spot_vs_flip": "below",
          "flip_search": {
            "low_ratio": 0.6,
            "high_ratio": 1.4,
            "repricing": "black_scholes_r0_q0"
          }
        },
        "d7": {
          "label": "0–7 个日历日",
          "dte_max": 7,
          "net_gex": 4048223917,
          "call_gex": 32605122939,
          "put_gex": -28556899022,
          "sign": "positive",
          "call_wall": {
            "strike": 7650.0,
            "gex": 3122920901
          },
          "put_wall": {
            "strike": 7600.0,
            "gex": -2221826799
          },
          "contracts_used": 3234,
          "expiries": 5,
          "oi_used": 1171032,
          "strikes_total": 350,
          "strikes_shown": 40,
          "strikes": [
            {
              "strike": 7300.0,
              "call_gex": 3419437,
              "put_gex": -175883277,
              "net_gex": -172463840,
              "call_oi": 185,
              "put_oi": 7794
            },
            {
              "strike": 7350.0,
              "call_gex": 62461321,
              "put_gex": -323946621,
              "net_gex": -261485301,
              "call_oi": 2087,
              "put_oi": 9745
            },
            {
              "strike": 7400.0,
              "call_gex": 122130198,
              "put_gex": -563342013,
              "net_gex": -441211815,
              "call_oi": 2545,
              "put_oi": 12654
            },
            {
              "strike": 7440.0,
              "call_gex": 29567386,
              "put_gex": -220045677,
              "net_gex": -190478291,
              "call_oi": 424,
              "put_oi": 2914
            },
            {
              "strike": 7450.0,
              "call_gex": 154745469,
              "put_gex": -941320377,
              "net_gex": -786574907,
              "call_oi": 1948,
              "put_oi": 11390
            },
            {
              "strike": 7475.0,
              "call_gex": 109102668,
              "put_gex": -497647032,
              "net_gex": -388544364,
              "call_oi": 1082,
              "put_oi": 4805
            },
            {
              "strike": 7500.0,
              "call_gex": 730998904,
              "put_gex": -1207554572,
              "net_gex": -476555669,
              "call_oi": 5445,
              "put_oi": 9002
            },
            {
              "strike": 7510.0,
              "call_gex": 168132941,
              "put_gex": -1317742867,
              "net_gex": -1149609927,
              "call_oi": 1158,
              "put_oi": 10338
            },
            {
              "strike": 7520.0,
              "call_gex": 311104866,
              "put_gex": -1318578859,
              "net_gex": -1007473992,
              "call_oi": 1904,
              "put_oi": 10023
            },
            {
              "strike": 7525.0,
              "call_gex": 246559373,
              "put_gex": -421972405,
              "net_gex": -175413032,
              "call_oi": 1429,
              "put_oi": 2532
            },
            {
              "strike": 7575.0,
              "call_gex": 1152263038,
              "put_gex": -732316751,
              "net_gex": 419946287,
              "call_oi": 4838,
              "put_oi": 3453
            },
            {
              "strike": 7580.0,
              "call_gex": 553089509,
              "put_gex": -1114120936,
              "net_gex": -561031426,
              "call_oi": 2132,
              "put_oi": 6256
            },
            {
              "strike": 7600.0,
              "call_gex": 1892777148,
              "put_gex": -2221826799,
              "net_gex": -329049651,
              "call_oi": 6786,
              "put_oi": 9641
            },
            {
              "strike": 7610.0,
              "call_gex": 677437407,
              "put_gex": -479353917,
              "net_gex": 198083490,
              "call_oi": 2376,
              "put_oi": 1729
            },
            {
              "strike": 7615.0,
              "call_gex": 375127865,
              "put_gex": -156823837,
              "net_gex": 218304029,
              "call_oi": 1367,
              "put_oi": 576
            },
            {
              "strike": 7620.0,
              "call_gex": 635875868,
              "put_gex": -343040894,
              "net_gex": 292834974,
              "call_oi": 2281,
              "put_oi": 1349
            },
            {
              "strike": 7625.0,
              "call_gex": 1043560949,
              "put_gex": -855817046,
              "net_gex": 187743903,
              "call_oi": 3998,
              "put_oi": 3289
            },
            {
              "strike": 7630.0,
              "call_gex": 885076741,
              "put_gex": -278460568,
              "net_gex": 606616173,
              "call_oi": 3569,
              "put_oi": 1101
            },
            {
              "strike": 7635.0,
              "call_gex": 753982858,
              "put_gex": -105439400,
              "net_gex": 648543458,
              "call_oi": 2770,
              "put_oi": 410
            },
            {
              "strike": 7640.0,
              "call_gex": 1039915098,
              "put_gex": -429560186,
              "net_gex": 610354912,
              "call_oi": 3987,
              "put_oi": 1749
            },
            {
              "strike": 7645.0,
              "call_gex": 746325411,
              "put_gex": -105509066,
              "net_gex": 640816344,
              "call_oi": 3017,
              "put_oi": 447
            },
            {
              "strike": 7650.0,
              "call_gex": 3122920901,
              "put_gex": -1292326410,
              "net_gex": 1830594491,
              "call_oi": 13281,
              "put_oi": 5571
            },
            {
              "strike": 7655.0,
              "call_gex": 336962541,
              "put_gex": -71291479,
              "net_gex": 265671062,
              "call_oi": 1566,
              "put_oi": 329
            },
            {
              "strike": 7660.0,
              "call_gex": 650093525,
              "put_gex": -285189137,
              "net_gex": 364904389,
              "call_oi": 3072,
              "put_oi": 1356
            },
            {
              "strike": 7665.0,
              "call_gex": 384886902,
              "put_gex": -53451193,
              "net_gex": 331435710,
              "call_oi": 1865,
              "put_oi": 261
            },
            {
              "strike": 7670.0,
              "call_gex": 634238718,
              "put_gex": -250791579,
              "net_gex": 383447140,
              "call_oi": 3411,
              "put_oi": 1311
            },
            {
              "strike": 7675.0,
              "call_gex": 770609796,
              "put_gex": -534738340,
              "net_gex": 235871457,
              "call_oi": 4242,
              "put_oi": 2885
            },
            {
              "strike": 7680.0,
              "call_gex": 487348084,
              "put_gex": -165294054,
              "net_gex": 322054030,
              "call_oi": 2878,
              "put_oi": 979
            },
            {
              "strike": 7685.0,
              "call_gex": 501890849,
              "put_gex": -81474317,
              "net_gex": 420416532,
              "call_oi": 3200,
              "put_oi": 506
            },
            {
              "strike": 7690.0,
              "call_gex": 603208348,
              "put_gex": -165450802,
              "net_gex": 437757545,
              "call_oi": 3990,
              "put_oi": 1099
            },
            {
              "strike": 7700.0,
              "call_gex": 1567268848,
              "put_gex": -715759479,
              "net_gex": 851509369,
              "call_oi": 11992,
              "put_oi": 5516
            },
            {
              "strike": 7710.0,
              "call_gex": 329920476,
              "put_gex": -101091085,
              "net_gex": 228829391,
              "call_oi": 2826,
              "put_oi": 841
            },
            {
              "strike": 7720.0,
              "call_gex": 300840751,
              "put_gex": -131366741,
              "net_gex": 169474010,
              "call_oi": 2938,
              "put_oi": 1167
            },
            {
              "strike": 7725.0,
              "call_gex": 602500077,
              "put_gex": -342622899,
              "net_gex": 259877178,
              "call_oi": 6357,
              "put_oi": 3330
            },
            {
              "strike": 7730.0,
              "call_gex": 381142358,
              "put_gex": -73346624,
              "net_gex": 307795734,
              "call_oi": 4496,
              "put_oi": 933
            },
            {
              "strike": 7740.0,
              "call_gex": 281189151,
              "put_gex": -100435064,
              "net_gex": 180754087,
              "call_oi": 3852,
              "put_oi": 1580
            },
            {
              "strike": 7750.0,
              "call_gex": 866191466,
              "put_gex": -156086539,
              "net_gex": 710104927,
              "call_oi": 12975,
              "put_oi": 3014
            },
            {
              "strike": 7775.0,
              "call_gex": 244573894,
              "put_gex": -68417759,
              "net_gex": 176156135,
              "call_oi": 5948,
              "put_oi": 1692
            },
            {
              "strike": 7800.0,
              "call_gex": 287871275,
              "put_gex": -117294221,
              "net_gex": 170577054,
              "call_oi": 10478,
              "put_oi": 3971
            },
            {
              "strike": 7850.0,
              "call_gex": 195743875,
              "put_gex": -9695177,
              "net_gex": 186048698,
              "call_oi": 14780,
              "put_oi": 757
            }
          ],
          "flip": 7585.13,
          "flip_status": "ok",
          "flip_reason": null,
          "flip_roots": [
            7585.13
          ],
          "spot_vs_flip": "above",
          "flip_search": {
            "low_ratio": 0.6,
            "high_ratio": 1.4,
            "repricing": "black_scholes_r0_q0"
          }
        },
        "d30": {
          "label": "0–30 个日历日",
          "dte_max": 30,
          "net_gex": -14418864116,
          "call_gex": 85514982078,
          "put_gex": -99933846193,
          "sign": "negative",
          "call_wall": {
            "strike": 7700.0,
            "gex": 7458818707
          },
          "put_wall": {
            "strike": 7500.0,
            "gex": -7353054199
          },
          "contracts_used": 11932,
          "expiries": 21,
          "oi_used": 5372804,
          "strikes_total": 608,
          "strikes_shown": 40,
          "strikes": [
            {
              "strike": 6500.0,
              "call_gex": 92888,
              "put_gex": -475493263,
              "net_gex": -475400375,
              "call_oi": 3233,
              "put_oi": 174566
            },
            {
              "strike": 7000.0,
              "call_gex": 1154382043,
              "put_gex": -1859262025,
              "net_gex": -704879982,
              "call_oi": 102097,
              "put_oi": 160152
            },
            {
              "strike": 7100.0,
              "call_gex": 28986837,
              "put_gex": -837640041,
              "net_gex": -808653205,
              "call_oi": 1710,
              "put_oi": 50441
            },
            {
              "strike": 7200.0,
              "call_gex": 100109956,
              "put_gex": -995021206,
              "net_gex": -894911250,
              "call_oi": 4318,
              "put_oi": 45221
            },
            {
              "strike": 7250.0,
              "call_gex": 96469911,
              "put_gex": -845297489,
              "net_gex": -748827579,
              "call_oi": 3306,
              "put_oi": 29631
            },
            {
              "strike": 7300.0,
              "call_gex": 219203880,
              "put_gex": -1798002442,
              "net_gex": -1578798561,
              "call_oi": 5460,
              "put_oi": 46197
            },
            {
              "strike": 7350.0,
              "call_gex": 212788808,
              "put_gex": -1641457269,
              "net_gex": -1428668461,
              "call_oi": 4976,
              "put_oi": 35073
            },
            {
              "strike": 7375.0,
              "call_gex": 202246030,
              "put_gex": -692380751,
              "net_gex": -490134721,
              "call_oi": 3990,
              "put_oi": 13148
            },
            {
              "strike": 7400.0,
              "call_gex": 1058196602,
              "put_gex": -3473909518,
              "net_gex": -2415712916,
              "call_oi": 16216,
              "put_oi": 56156
            },
            {
              "strike": 7425.0,
              "call_gex": 238925147,
              "put_gex": -830731502,
              "net_gex": -591806355,
              "call_oi": 3485,
              "put_oi": 11868
            },
            {
              "strike": 7430.0,
              "call_gex": 122954579,
              "put_gex": -596410113,
              "net_gex": -473455534,
              "call_oi": 1701,
              "put_oi": 8464
            },
            {
              "strike": 7450.0,
              "call_gex": 716734802,
              "put_gex": -2992552705,
              "net_gex": -2275817903,
              "call_oi": 8952,
              "put_oi": 37316
            },
            {
              "strike": 7470.0,
              "call_gex": 139627960,
              "put_gex": -1017662636,
              "net_gex": -878034676,
              "call_oi": 1628,
              "put_oi": 11037
            },
            {
              "strike": 7475.0,
              "call_gex": 376933374,
              "put_gex": -2005781108,
              "net_gex": -1628847734,
              "call_oi": 4237,
              "put_oi": 21856
            },
            {
              "strike": 7500.0,
              "call_gex": 2937452752,
              "put_gex": -7353054199,
              "net_gex": -4415601447,
              "call_oi": 27547,
              "put_oi": 69884
            },
            {
              "strike": 7510.0,
              "call_gex": 289479397,
              "put_gex": -1562386427,
              "net_gex": -1272907030,
              "call_oi": 2476,
              "put_oi": 12858
            },
            {
              "strike": 7520.0,
              "call_gex": 470308956,
              "put_gex": -1722472952,
              "net_gex": -1252163996,
              "call_oi": 3473,
              "put_oi": 14161
            },
            {
              "strike": 7525.0,
              "call_gex": 588276614,
              "put_gex": -1131943805,
              "net_gex": -543667191,
              "call_oi": 4799,
              "put_oi": 9427
            },
            {
              "strike": 7550.0,
              "call_gex": 2905319337,
              "put_gex": -3635424195,
              "net_gex": -730104857,
              "call_oi": 20490,
              "put_oi": 27304
            },
            {
              "strike": 7580.0,
              "call_gex": 779794089,
              "put_gex": -1576238338,
              "net_gex": -796444249,
              "call_oi": 4190,
              "put_oi": 10242
            },
            {
              "strike": 7600.0,
              "call_gex": 4775379583,
              "put_gex": -6596685282,
              "net_gex": -1821305699,
              "call_oi": 28895,
              "put_oi": 43172
            },
            {
              "strike": 7630.0,
              "call_gex": 1304099954,
              "put_gex": -683927950,
              "net_gex": 620172004,
              "call_oi": 6968,
              "put_oi": 4201
            },
            {
              "strike": 7635.0,
              "call_gex": 891555674,
              "put_gex": -283987399,
              "net_gex": 607568274,
              "call_oi": 3832,
              "put_oi": 1783
            },
            {
              "strike": 7645.0,
              "call_gex": 815526911,
              "put_gex": -193682924,
              "net_gex": 621843987,
              "call_oi": 3556,
              "put_oi": 1102
            },
            {
              "strike": 7650.0,
              "call_gex": 5361972604,
              "put_gex": -3700619904,
              "net_gex": 1661352700,
              "call_oi": 31373,
              "put_oi": 24299
            },
            {
              "strike": 7685.0,
              "call_gex": 728148406,
              "put_gex": -194745330,
              "net_gex": 533403076,
              "call_oi": 5133,
              "put_oi": 1404
            },
            {
              "strike": 7690.0,
              "call_gex": 867538341,
              "put_gex": -377351370,
              "net_gex": 490186971,
              "call_oi": 6434,
              "put_oi": 2897
            },
            {
              "strike": 7700.0,
              "call_gex": 7458818707,
              "put_gex": -4747913786,
              "net_gex": 2710904921,
              "call_oi": 60192,
              "put_oi": 38635
            },
            {
              "strike": 7710.0,
              "call_gex": 1198283197,
              "put_gex": -353142456,
              "net_gex": 845140741,
              "call_oi": 10653,
              "put_oi": 3064
            },
            {
              "strike": 7725.0,
              "call_gex": 1819476968,
              "put_gex": -2518847535,
              "net_gex": -699370567,
              "call_oi": 17818,
              "put_oi": 23714
            },
            {
              "strike": 7740.0,
              "call_gex": 1473417216,
              "put_gex": -609501504,
              "net_gex": 863915712,
              "call_oi": 15537,
              "put_oi": 6702
            },
            {
              "strike": 7750.0,
              "call_gex": 3653757948,
              "put_gex": -2185641149,
              "net_gex": 1468116799,
              "call_oi": 41925,
              "put_oi": 23983
            },
            {
              "strike": 7760.0,
              "call_gex": 821988427,
              "put_gex": -274269001,
              "net_gex": 547719426,
              "call_oi": 9961,
              "put_oi": 3114
            },
            {
              "strike": 7775.0,
              "call_gex": 1594276011,
              "put_gex": -869245156,
              "net_gex": 725030855,
              "call_oi": 22621,
              "put_oi": 11189
            },
            {
              "strike": 7800.0,
              "call_gex": 3017916913,
              "put_gex": -1395919663,
              "net_gex": 1621997250,
              "call_oi": 50859,
              "put_oi": 23311
            },
            {
              "strike": 7825.0,
              "call_gex": 1090434516,
              "put_gex": -152365216,
              "net_gex": 938069300,
              "call_oi": 23646,
              "put_oi": 3380
            },
            {
              "strike": 7830.0,
              "call_gex": 615185084,
              "put_gex": -59320548,
              "net_gex": 555864536,
              "call_oi": 13035,
              "put_oi": 1216
            },
            {
              "strike": 7850.0,
              "call_gex": 1230817191,
              "put_gex": -226077587,
              "net_gex": 1004739604,
              "call_oi": 38129,
              "put_oi": 6369
            },
            {
              "strike": 7900.0,
              "call_gex": 968995171,
              "put_gex": -140452341,
              "net_gex": 828542831,
              "call_oi": 38185,
              "put_oi": 5471
            },
            {
              "strike": 8050.0,
              "call_gex": 484213116,
              "put_gex": -7163981,
              "net_gex": 477049136,
              "call_oi": 48552,
              "put_oi": 741
            }
          ],
          "flip": 7637.98,
          "flip_status": "ok",
          "flip_reason": null,
          "flip_roots": [
            7637.98
          ],
          "spot_vs_flip": "below",
          "flip_search": {
            "low_ratio": 0.6,
            "high_ratio": 1.4,
            "repricing": "black_scholes_r0_q0"
          }
        }
      },
      "warnings": [],
      "coverage": {
        "options_in_file": 31230,
        "unique_kept": 31230,
        "duplicates": 0,
        "unparsed": 0,
        "expired": 574,
        "invalid_gamma_or_oi": 0,
        "used": 30656,
        "roots": {
          "SPX": 10022,
          "SPXO": 660,
          "SPXW": 20548
        },
        "rejected_roots": {},
        "iv_invalid_for_flip": 587,
        "expiry_min": "2026-11-12",
        "expiry_max": "2031-12-19",
        "expiries_used": 54,
        "keep_zero_dte": false
      }
    },
    "NDX": {
      "id": "NDX",
      "name": "纳斯达克 100",
      "status": "ok",
      "stale": false,
      "stale_reason": null,
      "proxy": false,
      "not_proxy": "QQQ",
      "last_attempt": "2026-11-12 11:37",
      "last_success": "2026-11-12 11:37",
      "computed_at": "2026-11-12 11:37",
      "quote_timestamp_utc": "2026-11-12 03:34:47",
      "quote_timestamp_zone": "UTC",
      "quote_timestamp_basis": "与 HTTP Last-Modified（GMT）一致，按 UTC",
      "quote_timestamp_checked": true,
      "quote_timestamp_et": "2026-11-11 22:34:47",
      "last_trade_time": "2026-11-11T16:14:59",
      "last_trade_zone": "America/New_York",
      "session_date": "2026-11-11",
      "is_daily_close": true,
      "expected_session": "2026-11-11",
      "chain_behind": false,
      "spot": 28374.252,
      "security_type": "index",
      "source_symbol": "^NDX",
      "chain_symbol": "_NDX",
      "source_url": "https://cdn.cboe.com/api/global/delayed_quotes/options/_NDX.json",
      "http_status": 200,
      "content_length": 7545071,
      "last_modified": "Thu, 12 Nov 2026 03:34:49 GMT",
      "final_url": "https://cdn-api.cboe.com/api/global/delayed_quotes/options/_NDX.json",
      "delay_note": "来源是 CBOE 公开延迟行情，大约 15 分钟，不是即时成交。",
      "assumption": "做市商多看涨、空看跌",
      "formula": "sign × gamma × open_interest × 100 × spot² × 0.01",
      "windows": {
        "all": {
          "label": "全部到期",
          "dte_max": null,
          "net_gex": 517597618,
          "call_gex": 7084219875,
          "put_gex": -6566622257,
          "sign": "positive",
          "call_wall": {
            "strike": 29675.0,
            "gex": 578543550
          },
          "put_wall": {
            "strike": 28000.0,
            "gex": -653820229
          },
          "contracts_used": 16174,
          "expiries": 42,
          "oi_used": 196016,
          "strikes_total": 673,
          "strikes_shown": 40,
          "strikes": [
            {
              "strike": 25000.0,
              "call_gex": 10949335,
              "put_gex": -210372154,
              "net_gex": -199422818,
              "call_oi": 202,
              "put_oi": 4239
            },
            {
              "strike": 25200.0,
              "call_gex": 1610196,
              "put_gex": -35907379,
              "net_gex": -34297182,
              "call_oi": 24,
              "put_oi": 677
            },
            {
              "strike": 25500.0,
              "call_gex": 7245884,
              "put_gex": -44441419,
              "net_gex": -37195536,
              "call_oi": 119,
              "put_oi": 1256
            },
            {
              "strike": 26000.0,
              "call_gex": 14894316,
              "put_gex": -151438967,
              "net_gex": -136544651,
              "call_oi": 202,
              "put_oi": 2274
            },
            {
              "strike": 26200.0,
              "call_gex": 2254275,
              "put_gex": -152405085,
              "net_gex": -150150810,
              "call_oi": 28,
              "put_oi": 1993
            },
            {
              "strike": 26400.0,
              "call_gex": 2334785,
              "put_gex": -37598085,
              "net_gex": -35263300,
              "call_oi": 29,
              "put_oi": 565
            },
            {
              "strike": 26500.0,
              "call_gex": 11915453,
              "put_gex": -134129356,
              "net_gex": -122213903,
              "call_oi": 158,
              "put_oi": 2019
            },
            {
              "strike": 26600.0,
              "call_gex": 2576314,
              "put_gex": -56115343,
              "net_gex": -53539029,
              "call_oi": 43,
              "put_oi": 770
            },
            {
              "strike": 26800.0,
              "call_gex": 35907379,
              "put_gex": -83569191,
              "net_gex": -47661812,
              "call_oi": 447,
              "put_oi": 1049
            },
            {
              "strike": 27000.0,
              "call_gex": 85581936,
              "put_gex": -552699898,
              "net_gex": -467117962,
              "call_oi": 1024,
              "put_oi": 5361
            },
            {
              "strike": 27400.0,
              "call_gex": 10627296,
              "put_gex": -59979814,
              "net_gex": -49352518,
              "call_oi": 104,
              "put_oi": 533
            },
            {
              "strike": 27500.0,
              "call_gex": 74632601,
              "put_gex": -194350700,
              "net_gex": -119718099,
              "call_oi": 566,
              "put_oi": 1605
            },
            {
              "strike": 27600.0,
              "call_gex": 19402866,
              "put_gex": -66179070,
              "net_gex": -46776204,
              "call_oi": 155,
              "put_oi": 551
            },
            {
              "strike": 27800.0,
              "call_gex": 38805732,
              "put_gex": -100073703,
              "net_gex": -61267971,
              "call_oi": 214,
              "put_oi": 700
            },
            {
              "strike": 28000.0,
              "call_gex": 374290142,
              "put_gex": -653820229,
              "net_gex": -279530087,
              "call_oi": 2521,
              "put_oi": 4865
            },
            {
              "strike": 28200.0,
              "call_gex": 74713111,
              "put_gex": -107802646,
              "net_gex": -33089535,
              "call_oi": 384,
              "put_oi": 564
            },
            {
              "strike": 28425.0,
              "call_gex": 44602439,
              "put_gex": -8131492,
              "net_gex": 36470947,
              "call_oi": 114,
              "put_oi": 33
            },
            {
              "strike": 28500.0,
              "call_gex": 152163555,
              "put_gex": -268580752,
              "net_gex": -116417196,
              "call_oi": 693,
              "put_oi": 1582
            },
            {
              "strike": 28700.0,
              "call_gex": 153612732,
              "put_gex": -28419966,
              "net_gex": 125192766,
              "call_oi": 498,
              "put_oi": 125
            },
            {
              "strike": 28750.0,
              "call_gex": 56034833,
              "put_gex": -15135846,
              "net_gex": 40898987,
              "call_oi": 358,
              "put_oi": 77
            },
            {
              "strike": 28800.0,
              "call_gex": 130667434,
              "put_gex": -54827186,
              "net_gex": 75840248,
              "call_oi": 962,
              "put_oi": 265
            },
            {
              "strike": 28925.0,
              "call_gex": 38242163,
              "put_gex": -5796707,
              "net_gex": 32445457,
              "call_oi": 159,
              "put_oi": 20
            },
            {
              "strike": 29000.0,
              "call_gex": 497470163,
              "put_gex": -388862419,
              "net_gex": 108607744,
              "call_oi": 3129,
              "put_oi": 3082
            },
            {
              "strike": 29025.0,
              "call_gex": 50157616,
              "put_gex": -7728942,
              "net_gex": 42428674,
              "call_oi": 246,
              "put_oi": 34
            },
            {
              "strike": 29100.0,
              "call_gex": 118590961,
              "put_gex": -69479973,
              "net_gex": 49110989,
              "call_oi": 622,
              "put_oi": 326
            },
            {
              "strike": 29375.0,
              "call_gex": 41945615,
              "put_gex": -1851726,
              "net_gex": 40093889,
              "call_oi": 186,
              "put_oi": 11
            },
            {
              "strike": 29400.0,
              "call_gex": 95404134,
              "put_gex": -62395109,
              "net_gex": 33009025,
              "call_oi": 620,
              "put_oi": 509
            },
            {
              "strike": 29500.0,
              "call_gex": 168023989,
              "put_gex": -114645980,
              "net_gex": 53378009,
              "call_oi": 1278,
              "put_oi": 1003
            },
            {
              "strike": 29625.0,
              "call_gex": 225991058,
              "put_gex": -1288157,
              "net_gex": 224702901,
              "call_oi": 1410,
              "put_oi": 9
            },
            {
              "strike": 29650.0,
              "call_gex": 59255226,
              "put_gex": -12640041,
              "net_gex": 46615184,
              "call_oi": 377,
              "put_oi": 82
            },
            {
              "strike": 29675.0,
              "call_gex": 578543550,
              "put_gex": -6279766,
              "net_gex": 572263784,
              "call_oi": 3597,
              "put_oi": 40
            },
            {
              "strike": 30300.0,
              "call_gex": 25038553,
              "put_gex": -59174716,
              "net_gex": -34136163,
              "call_oi": 353,
              "put_oi": 750
            },
            {
              "strike": 30500.0,
              "call_gex": 228084313,
              "put_gex": -59738285,
              "net_gex": 168346029,
              "call_oi": 2991,
              "put_oi": 782
            },
            {
              "strike": 30900.0,
              "call_gex": 63602756,
              "put_gex": -32686986,
              "net_gex": 30915770,
              "call_oi": 889,
              "put_oi": 468
            },
            {
              "strike": 31000.0,
              "call_gex": 230499608,
              "put_gex": -79463190,
              "net_gex": 151036418,
              "call_oi": 3394,
              "put_oi": 1109
            },
            {
              "strike": 31500.0,
              "call_gex": 195155798,
              "put_gex": -46132126,
              "net_gex": 149023672,
              "call_oi": 2845,
              "put_oi": 648
            },
            {
              "strike": 31600.0,
              "call_gex": 43716831,
              "put_gex": -12881571,
              "net_gex": 30835260,
              "call_oi": 610,
              "put_oi": 200
            },
            {
              "strike": 32000.0,
              "call_gex": 112955274,
              "put_gex": -39771850,
              "net_gex": 73183424,
              "call_oi": 2788,
              "put_oi": 665
            },
            {
              "strike": 32500.0,
              "call_gex": 36229418,
              "put_gex": -3381412,
              "net_gex": 32848006,
              "call_oi": 1379,
              "put_oi": 154
            },
            {
              "strike": 34000.0,
              "call_gex": 35585339,
              "put_gex": -2012745,
              "net_gex": 33572594,
              "call_oi": 1220,
              "put_oi": 38
            }
          ],
          "flip": 28338.52,
          "flip_status": "ok",
          "flip_reason": null,
          "flip_roots": [
            28338.52
          ],
          "spot_vs_flip": "above",
          "flip_search": {
            "low_ratio": 0.6,
            "high_ratio": 1.4,
            "repricing": "black_scholes_r0_q0"
          }
        },
        "d7": {
          "label": "0–7 个日历日",
          "dte_max": 7,
          "net_gex": 536195386,
          "call_gex": 1045419982,
          "put_gex": -509224597,
          "sign": "positive",
          "call_wall": {
            "strike": 28000.0,
            "gex": 103294096
          },
          "put_wall": {
            "strike": 28500.0,
            "gex": -32284437
          },
          "contracts_used": 4182,
          "expiries": 5,
          "oi_used": 12691,
          "strikes_total": 502,
          "strikes_shown": 40,
          "strikes": [
            {
              "strike": 27000.0,
              "call_gex": 1207647,
              "put_gex": -16746042,
              "net_gex": -15538395,
              "call_oi": 15,
              "put_oi": 205
            },
            {
              "strike": 27600.0,
              "call_gex": 2254275,
              "put_gex": -11110355,
              "net_gex": -8856080,
              "call_oi": 11,
              "put_oi": 52
            },
            {
              "strike": 27750.0,
              "call_gex": 8856080,
              "put_gex": -24474985,
              "net_gex": -15618905,
              "call_oi": 30,
              "put_oi": 97
            },
            {
              "strike": 27775.0,
              "call_gex": 2012745,
              "put_gex": -22945298,
              "net_gex": -20932553,
              "call_oi": 7,
              "put_oi": 92
            },
            {
              "strike": 27880.0,
              "call_gex": 23347847,
              "put_gex": 0,
              "net_gex": 23347847,
              "call_oi": 65,
              "put_oi": 0
            },
            {
              "strike": 27890.0,
              "call_gex": 26568240,
              "put_gex": -805098,
              "net_gex": 25763142,
              "call_oi": 66,
              "put_oi": 2
            },
            {
              "strike": 27950.0,
              "call_gex": 4106001,
              "put_gex": -14491767,
              "net_gex": -10385766,
              "call_oi": 11,
              "put_oi": 35
            },
            {
              "strike": 28000.0,
              "call_gex": 103294096,
              "put_gex": -24877534,
              "net_gex": 78416562,
              "call_oi": 304,
              "put_oi": 63
            },
            {
              "strike": 28025.0,
              "call_gex": 6843335,
              "put_gex": -402549,
              "net_gex": 6440785,
              "call_oi": 16,
              "put_oi": 1
            },
            {
              "strike": 28170.0,
              "call_gex": 0,
              "put_gex": -6521295,
              "net_gex": -6521295,
              "call_oi": 0,
              "put_oi": 9
            },
            {
              "strike": 28200.0,
              "call_gex": 14733297,
              "put_gex": -22623259,
              "net_gex": -7889962,
              "call_oi": 29,
              "put_oi": 43
            },
            {
              "strike": 28250.0,
              "call_gex": 29305574,
              "put_gex": -4830589,
              "net_gex": 24474985,
              "call_oi": 48,
              "put_oi": 8
            },
            {
              "strike": 28280.0,
              "call_gex": 9983217,
              "put_gex": 0,
              "net_gex": 9983217,
              "call_oi": 13,
              "put_oi": 0
            },
            {
              "strike": 28310.0,
              "call_gex": 11271374,
              "put_gex": 0,
              "net_gex": 11271374,
              "call_oi": 14,
              "put_oi": 0
            },
            {
              "strike": 28325.0,
              "call_gex": 8292511,
              "put_gex": -644079,
              "net_gex": 7648433,
              "call_oi": 13,
              "put_oi": 2
            },
            {
              "strike": 28400.0,
              "call_gex": 27292828,
              "put_gex": -15538395,
              "net_gex": 11754433,
              "call_oi": 43,
              "put_oi": 29
            },
            {
              "strike": 28425.0,
              "call_gex": 39610830,
              "put_gex": -563569,
              "net_gex": 39047262,
              "call_oi": 92,
              "put_oi": 1
            },
            {
              "strike": 28450.0,
              "call_gex": 15940944,
              "put_gex": -1851726,
              "net_gex": 14089218,
              "call_oi": 28,
              "put_oi": 3
            },
            {
              "strike": 28500.0,
              "call_gex": 58852677,
              "put_gex": -32284437,
              "net_gex": 26568240,
              "call_oi": 99,
              "put_oi": 58
            },
            {
              "strike": 28550.0,
              "call_gex": 16343493,
              "put_gex": -1610196,
              "net_gex": 14733297,
              "call_oi": 31,
              "put_oi": 3
            },
            {
              "strike": 28600.0,
              "call_gex": 25682632,
              "put_gex": -6601805,
              "net_gex": 19080827,
              "call_oi": 46,
              "put_oi": 12
            },
            {
              "strike": 28625.0,
              "call_gex": 12398512,
              "put_gex": -1610196,
              "net_gex": 10788316,
              "call_oi": 20,
              "put_oi": 3
            },
            {
              "strike": 28650.0,
              "call_gex": 16665532,
              "put_gex": -2012745,
              "net_gex": 14652787,
              "call_oi": 28,
              "put_oi": 3
            },
            {
              "strike": 28675.0,
              "call_gex": 17309611,
              "put_gex": -1690706,
              "net_gex": 15618905,
              "call_oi": 31,
              "put_oi": 3
            },
            {
              "strike": 28700.0,
              "call_gex": 24636004,
              "put_gex": -2978863,
              "net_gex": 21657141,
              "call_oi": 48,
              "put_oi": 6
            },
            {
              "strike": 28725.0,
              "call_gex": 12962081,
              "put_gex": -483059,
              "net_gex": 12479022,
              "call_oi": 26,
              "put_oi": 1
            },
            {
              "strike": 28750.0,
              "call_gex": 14974826,
              "put_gex": -2495804,
              "net_gex": 12479022,
              "call_oi": 31,
              "put_oi": 6
            },
            {
              "strike": 28775.0,
              "call_gex": 10707806,
              "put_gex": -966118,
              "net_gex": 9741688,
              "call_oi": 23,
              "put_oi": 2
            },
            {
              "strike": 28800.0,
              "call_gex": 23830906,
              "put_gex": -10144237,
              "net_gex": 13686669,
              "call_oi": 53,
              "put_oi": 22
            },
            {
              "strike": 28825.0,
              "call_gex": 16585022,
              "put_gex": -483059,
              "net_gex": 16101964,
              "call_oi": 38,
              "put_oi": 1
            },
            {
              "strike": 28850.0,
              "call_gex": 10627296,
              "put_gex": -1529687,
              "net_gex": 9097609,
              "call_oi": 30,
              "put_oi": 4
            },
            {
              "strike": 28875.0,
              "call_gex": 9902708,
              "put_gex": -644079,
              "net_gex": 9258629,
              "call_oi": 26,
              "put_oi": 2
            },
            {
              "strike": 28900.0,
              "call_gex": 13364630,
              "put_gex": -7004354,
              "net_gex": 6360276,
              "call_oi": 38,
              "put_oi": 18
            },
            {
              "strike": 28950.0,
              "call_gex": 9500158,
              "put_gex": -1288157,
              "net_gex": 8212001,
              "call_oi": 34,
              "put_oi": 4
            },
            {
              "strike": 28975.0,
              "call_gex": 7728942,
              "put_gex": 0,
              "net_gex": 7728942,
              "call_oi": 26,
              "put_oi": 0
            },
            {
              "strike": 29000.0,
              "call_gex": 33492084,
              "put_gex": -9017100,
              "net_gex": 24474985,
              "call_oi": 107,
              "put_oi": 32
            },
            {
              "strike": 29025.0,
              "call_gex": 10466276,
              "put_gex": -2576314,
              "net_gex": 7889962,
              "call_oi": 33,
              "put_oi": 8
            },
            {
              "strike": 29050.0,
              "call_gex": 7970472,
              "put_gex": -1449177,
              "net_gex": 6521295,
              "call_oi": 31,
              "put_oi": 6
            },
            {
              "strike": 29175.0,
              "call_gex": 9983217,
              "put_gex": -885608,
              "net_gex": 9097609,
              "call_oi": 46,
              "put_oi": 4
            },
            {
              "strike": 29500.0,
              "call_gex": 12237492,
              "put_gex": -3381412,
              "net_gex": 8856080,
              "call_oi": 104,
              "put_oi": 42
            }
          ],
          "flip": 27871.22,
          "flip_status": "ok",
          "flip_reason": null,
          "flip_roots": [
            27871.22
          ],
          "spot_vs_flip": "above",
          "flip_search": {
            "low_ratio": 0.6,
            "high_ratio": 1.4,
            "repricing": "black_scholes_r0_q0"
          }
        },
        "d30": {
          "label": "0–30 个日历日",
          "dte_max": 30,
          "net_gex": 651807484,
          "call_gex": 3308228917,
          "put_gex": -2656421434,
          "sign": "positive",
          "call_wall": {
            "strike": 29675.0,
            "gex": 572907862
          },
          "put_wall": {
            "strike": 28000.0,
            "gex": -377027476
          },
          "contracts_used": 10928,
          "expiries": 21,
          "oi_used": 60505,
          "strikes_total": 576,
          "strikes_shown": 40,
          "strikes": [
            {
              "strike": 26000.0,
              "call_gex": 724588,
              "put_gex": -22381729,
              "net_gex": -21657141,
              "call_oi": 12,
              "put_oi": 392
            },
            {
              "strike": 27000.0,
              "call_gex": 8856080,
              "put_gex": -271157066,
              "net_gex": -262300986,
              "call_oi": 64,
              "put_oi": 1802
            },
            {
              "strike": 27300.0,
              "call_gex": 9258629,
              "put_gex": -23830906,
              "net_gex": -14572277,
              "call_oi": 58,
              "put_oi": 150
            },
            {
              "strike": 27400.0,
              "call_gex": 4589060,
              "put_gex": -35263300,
              "net_gex": -30674241,
              "call_oi": 29,
              "put_oi": 225
            },
            {
              "strike": 27500.0,
              "call_gex": 52492401,
              "put_gex": -100476252,
              "net_gex": -47983851,
              "call_oi": 326,
              "put_oi": 619
            },
            {
              "strike": 27600.0,
              "call_gex": 11432394,
              "put_gex": -42992243,
              "net_gex": -31559849,
              "call_oi": 67,
              "put_oi": 220
            },
            {
              "strike": 27775.0,
              "call_gex": 3059373,
              "put_gex": -24072435,
              "net_gex": -21013062,
              "call_oi": 12,
              "put_oi": 98
            },
            {
              "strike": 27800.0,
              "call_gex": 24394475,
              "put_gex": -46937224,
              "net_gex": -22542749,
              "call_oi": 109,
              "put_oi": 208
            },
            {
              "strike": 27880.0,
              "call_gex": 23347847,
              "put_gex": 0,
              "net_gex": 23347847,
              "call_oi": 65,
              "put_oi": 0
            },
            {
              "strike": 27890.0,
              "call_gex": 26568240,
              "put_gex": -805098,
              "net_gex": 25763142,
              "call_oi": 66,
              "put_oi": 2
            },
            {
              "strike": 27950.0,
              "call_gex": 6279766,
              "put_gex": -22945298,
              "net_gex": -16665532,
              "call_oi": 21,
              "put_oi": 73
            },
            {
              "strike": 28000.0,
              "call_gex": 166977362,
              "put_gex": -377027476,
              "net_gex": -210050114,
              "call_oi": 576,
              "put_oi": 1973
            },
            {
              "strike": 28200.0,
              "call_gex": 61992560,
              "put_gex": -82522563,
              "net_gex": -20530004,
              "call_oi": 275,
              "put_oi": 338
            },
            {
              "strike": 28250.0,
              "call_gex": 40576948,
              "put_gex": -21898670,
              "net_gex": 18678278,
              "call_oi": 90,
              "put_oi": 66
            },
            {
              "strike": 28325.0,
              "call_gex": 17873180,
              "put_gex": -1610196,
              "net_gex": 16262983,
              "call_oi": 43,
              "put_oi": 5
            },
            {
              "strike": 28425.0,
              "call_gex": 42670203,
              "put_gex": -7326393,
              "net_gex": 35343810,
              "call_oi": 102,
              "put_oi": 28
            },
            {
              "strike": 28450.0,
              "call_gex": 23911416,
              "put_gex": -9178119,
              "net_gex": 14733297,
              "call_oi": 55,
              "put_oi": 31
            },
            {
              "strike": 28500.0,
              "call_gex": 93391388,
              "put_gex": -73102914,
              "net_gex": 20288474,
              "call_oi": 231,
              "put_oi": 206
            },
            {
              "strike": 28550.0,
              "call_gex": 32203927,
              "put_gex": -15940944,
              "net_gex": 16262983,
              "call_oi": 90,
              "put_oi": 54
            },
            {
              "strike": 28600.0,
              "call_gex": 69882522,
              "put_gex": -26487730,
              "net_gex": 43394792,
              "call_oi": 201,
              "put_oi": 86
            },
            {
              "strike": 28650.0,
              "call_gex": 25843651,
              "put_gex": -9258629,
              "net_gex": 16585022,
              "call_oi": 63,
              "put_oi": 34
            },
            {
              "strike": 28675.0,
              "call_gex": 17309611,
              "put_gex": -2978863,
              "net_gex": 14330748,
              "call_oi": 31,
              "put_oi": 7
            },
            {
              "strike": 28700.0,
              "call_gex": 146527868,
              "put_gex": -19724905,
              "net_gex": 126802963,
              "call_oi": 453,
              "put_oi": 71
            },
            {
              "strike": 28750.0,
              "call_gex": 31881888,
              "put_gex": -7406903,
              "net_gex": 24474985,
              "call_oi": 87,
              "put_oi": 25
            },
            {
              "strike": 28800.0,
              "call_gex": 54263617,
              "put_gex": -30352201,
              "net_gex": 23911416,
              "call_oi": 155,
              "put_oi": 89
            },
            {
              "strike": 28825.0,
              "call_gex": 17551140,
              "put_gex": -2656824,
              "net_gex": 14894316,
              "call_oi": 41,
              "put_oi": 8
            },
            {
              "strike": 28925.0,
              "call_gex": 36954006,
              "put_gex": -5394158,
              "net_gex": 31559849,
              "call_oi": 151,
              "put_oi": 17
            },
            {
              "strike": 29025.0,
              "call_gex": 26648750,
              "put_gex": -5474668,
              "net_gex": 21174082,
              "call_oi": 100,
              "put_oi": 20
            },
            {
              "strike": 29100.0,
              "call_gex": 108446724,
              "put_gex": -52653421,
              "net_gex": 55793304,
              "call_oi": 557,
              "put_oi": 220
            },
            {
              "strike": 29200.0,
              "call_gex": 35987888,
              "put_gex": -104501743,
              "net_gex": -68513855,
              "call_oi": 157,
              "put_oi": 450
            },
            {
              "strike": 29375.0,
              "call_gex": 40898987,
              "put_gex": -885608,
              "net_gex": 40013379,
              "call_oi": 179,
              "put_oi": 5
            },
            {
              "strike": 29400.0,
              "call_gex": 80429308,
              "put_gex": -26085181,
              "net_gex": 54344127,
              "call_oi": 506,
              "put_oi": 194
            },
            {
              "strike": 29500.0,
              "call_gex": 85018367,
              "put_gex": -31398829,
              "net_gex": 53619539,
              "call_oi": 556,
              "put_oi": 216
            },
            {
              "strike": 29600.0,
              "call_gex": 31640358,
              "put_gex": -9983217,
              "net_gex": 21657141,
              "call_oi": 205,
              "put_oi": 66
            },
            {
              "strike": 29650.0,
              "call_gex": 49030479,
              "put_gex": -2656824,
              "net_gex": 46373655,
              "call_oi": 311,
              "put_oi": 20
            },
            {
              "strike": 29675.0,
              "call_gex": 572907862,
              "put_gex": -1127137,
              "net_gex": 571780725,
              "call_oi": 3562,
              "put_oi": 8
            },
            {
              "strike": 29700.0,
              "call_gex": 24555494,
              "put_gex": -10224747,
              "net_gex": 14330748,
              "call_oi": 177,
              "put_oi": 66
            },
            {
              "strike": 30200.0,
              "call_gex": 6199256,
              "put_gex": -31398829,
              "net_gex": -25199573,
              "call_oi": 100,
              "put_oi": 414
            },
            {
              "strike": 30300.0,
              "call_gex": 18275729,
              "put_gex": -2898353,
              "net_gex": 15377375,
              "call_oi": 269,
              "put_oi": 51
            },
            {
              "strike": 30600.0,
              "call_gex": 19966435,
              "put_gex": -161020,
              "net_gex": 19805415,
              "call_oi": 376,
              "put_oi": 16
            }
          ],
          "flip": 28176.95,
          "flip_status": "ok",
          "flip_reason": null,
          "flip_roots": [
            28176.95
          ],
          "spot_vs_flip": "above",
          "flip_search": {
            "low_ratio": 0.6,
            "high_ratio": 1.4,
            "repricing": "black_scholes_r0_q0"
          }
        }
      },
      "warnings": [],
      "coverage": {
        "options_in_file": 17258,
        "unique_kept": 17258,
        "duplicates": 0,
        "unparsed": 0,
        "expired": 1084,
        "invalid_gamma_or_oi": 0,
        "used": 16174,
        "roots": {
          "NDX": 4148,
          "NDXP": 13110
        },
        "rejected_roots": {},
        "iv_invalid_for_flip": 64,
        "expiry_min": "2026-11-12",
        "expiry_max": "2029-12-21",
        "expiries_used": 42,
        "keep_zero_dte": false
      }
    }
  },
  "closes": {
    "SPX": [
      {
        "session_date": "2026-11-09",
        "recorded_at": "2026-11-10 14:20",
        "quote_timestamp_utc": "2026-11-10 02:58:42",
        "spot": 7549.9399,
        "net_gex": -36533010348,
        "sign": "negative",
        "flip": 7650.13,
        "flip_status": "ok",
        "spot_vs_flip": "below",
        "call_wall": 8000.0,
        "put_wall": 8000.0,
        "net_gex_d7": -9747169714,
        "net_gex_d30": -37406542653
      },
      {
        "session_date": "2026-11-10",
        "recorded_at": "2026-11-11 10:26",
        "quote_timestamp_utc": "2026-11-11 01:04:47",
        "spot": 7520.9302,
        "net_gex": -51137982375,
        "sign": "negative",
        "flip": 7631.75,
        "flip_status": "ok",
        "spot_vs_flip": "below",
        "call_wall": 8000.0,
        "put_wall": 8000.0,
        "net_gex_d7": -12026177812,
        "net_gex_d30": -45833254995
      },
      {
        "session_date": "2026-11-11",
        "recorded_at": "2026-11-12 11:37",
        "quote_timestamp_utc": "2026-11-12 03:18:52",
        "spot": 7619.3799,
        "net_gex": -8096174976,
        "sign": "negative",
        "flip": 7634.43,
        "flip_status": "ok",
        "spot_vs_flip": "below",
        "call_wall": 8000.0,
        "put_wall": 8000.0,
        "net_gex_d7": 4048223917,
        "net_gex_d30": -14418864116
      }
    ],
    "NDX": [
      {
        "session_date": "2026-11-09",
        "recorded_at": "2026-11-10 14:20",
        "quote_timestamp_utc": "2026-11-10 06:12:21",
        "spot": 27907.625,
        "net_gex": -1082892925,
        "sign": "negative",
        "flip": 28407.28,
        "flip_status": "ok",
        "spot_vs_flip": "below",
        "call_wall": 29000.0,
        "put_wall": 28000.0,
        "net_gex_d7": -135283732,
        "net_gex_d30": -583970883
      },
      {
        "session_date": "2026-11-10",
        "recorded_at": "2026-11-11 10:26",
        "quote_timestamp_utc": "2026-11-11 02:18:09",
        "spot": 27740.7949,
        "net_gex": -1338712140,
        "sign": "negative",
        "flip": 28258.15,
        "flip_status": "ok",
        "spot_vs_flip": "below",
        "call_wall": 29000.0,
        "put_wall": 28000.0,
        "net_gex_d7": -76878215,
        "net_gex_d30": -749851178
      },
      {
        "session_date": "2026-11-11",
        "recorded_at": "2026-11-12 11:37",
        "quote_timestamp_utc": "2026-11-12 03:34:47",
        "spot": 28374.252,
        "net_gex": 517597618,
        "sign": "positive",
        "flip": 28338.52,
        "flip_status": "ok",
        "spot_vs_flip": "above",
        "call_wall": 29675.0,
        "put_wall": 28000.0,
        "net_gex_d7": 536195386,
        "net_gex_d30": 651807484
      }
    ]
  },
  "events": [
    {
      "type": "sign_switch",
      "symbol": "NDX",
      "scope": "all",
      "prior_date": "2026-11-10",
      "current_date": "2026-11-11",
      "prior_sign": "negative",
      "current_sign": "positive",
      "prior_net_gex": -1338712140,
      "current_net_gex": 517597618,
      "prior_spot": 27740.7949,
      "current_spot": 28374.252
    },
    {
      "type": "flip_cross",
      "symbol": "NDX",
      "scope": "all",
      "prior_date": "2026-11-10",
      "current_date": "2026-11-11",
      "prior_spot": 27740.7949,
      "current_spot": 28374.252,
      "prior_flip": 28258.15,
      "current_flip": 28338.52,
      "prior_relation": "below",
      "current_relation": "above"
    }
  ]
};
