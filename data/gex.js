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
      "last_attempt": "2026-11-11 10:26",
      "last_success": "2026-11-11 10:26",
      "computed_at": "2026-11-11 10:26",
      "quote_timestamp_utc": "2026-11-11 01:04:47",
      "quote_timestamp_zone": "UTC",
      "quote_timestamp_basis": "与 HTTP Last-Modified（GMT）一致，按 UTC",
      "quote_timestamp_checked": true,
      "quote_timestamp_et": "2026-11-10 20:04:47",
      "last_trade_time": "2026-11-10T16:14:59",
      "last_trade_zone": "America/New_York",
      "session_date": "2026-11-10",
      "is_daily_close": true,
      "expected_session": "2026-11-10",
      "chain_behind": false,
      "spot": 7520.9302,
      "security_type": "index",
      "source_symbol": "^SPX",
      "chain_symbol": "_SPX",
      "source_url": "https://cdn.cboe.com/api/global/delayed_quotes/options/_SPX.json",
      "http_status": 200,
      "content_length": 14008612,
      "last_modified": "Wed, 11 Nov 2026 01:05:01 GMT",
      "final_url": "https://cdn-api.cboe.com/api/global/delayed_quotes/options/_SPX.json",
      "delay_note": "来源是 CBOE 公开延迟行情，大约 15 分钟，不是即时成交。",
      "assumption": "做市商多看涨、空看跌",
      "formula": "sign × gamma × open_interest × 100 × spot² × 0.01",
      "windows": {
        "all": {
          "label": "全部到期",
          "dte_max": null,
          "net_gex": -51137982375,
          "call_gex": 238657972116,
          "put_gex": -289795954491,
          "sign": "negative",
          "call_wall": {
            "strike": 8000.0,
            "gex": 29722805731
          },
          "put_wall": {
            "strike": 8000.0,
            "gex": -27219344972
          },
          "contracts_used": 30854,
          "expiries": 54,
          "oi_used": 24871133,
          "strikes_total": 893,
          "strikes_shown": 40,
          "strikes": [
            {
              "strike": 6200.0,
              "call_gex": 83189250,
              "put_gex": -1060780308,
              "net_gex": -977591058,
              "call_oi": 14990,
              "put_oi": 238528
            },
            {
              "strike": 6500.0,
              "call_gex": 223355811,
              "put_gex": -2275856962,
              "net_gex": -2052501151,
              "call_oi": 29734,
              "put_oi": 320810
            },
            {
              "strike": 6600.0,
              "call_gex": 251660632,
              "put_gex": -1289724681,
              "net_gex": -1038064049,
              "call_oi": 23962,
              "put_oi": 144928
            },
            {
              "strike": 6800.0,
              "call_gex": 752040549,
              "put_gex": -2026707789,
              "net_gex": -1274667240,
              "call_oi": 52719,
              "put_oi": 161525
            },
            {
              "strike": 6900.0,
              "call_gex": 878303582,
              "put_gex": -2340051889,
              "net_gex": -1461748307,
              "call_oi": 56066,
              "put_oi": 170643
            },
            {
              "strike": 7000.0,
              "call_gex": 23659725216,
              "put_gex": -26416079711,
              "net_gex": -2756354495,
              "call_oi": 1318698,
              "put_oi": 1478179
            },
            {
              "strike": 7100.0,
              "call_gex": 738527316,
              "put_gex": -3033751925,
              "net_gex": -2295224609,
              "call_oi": 33660,
              "put_oi": 139539
            },
            {
              "strike": 7150.0,
              "call_gex": 509215274,
              "put_gex": -1948960033,
              "net_gex": -1439744759,
              "call_oi": 19003,
              "put_oi": 75379
            },
            {
              "strike": 7200.0,
              "call_gex": 1489074564,
              "put_gex": -4421514009,
              "net_gex": -2932439444,
              "call_oi": 59779,
              "put_oi": 165441
            },
            {
              "strike": 7250.0,
              "call_gex": 653437502,
              "put_gex": -4784442455,
              "net_gex": -4131004952,
              "call_oi": 20658,
              "put_oi": 140901
            },
            {
              "strike": 7275.0,
              "call_gex": 221732413,
              "put_gex": -1355820172,
              "net_gex": -1134087759,
              "call_oi": 6373,
              "put_oi": 39081
            },
            {
              "strike": 7300.0,
              "call_gex": 1077896693,
              "put_gex": -6202426892,
              "net_gex": -5124530199,
              "call_oi": 33689,
              "put_oi": 169868
            },
            {
              "strike": 7350.0,
              "call_gex": 1210924828,
              "put_gex": -4604935359,
              "net_gex": -3394010532,
              "call_oi": 32739,
              "put_oi": 107049
            },
            {
              "strike": 7375.0,
              "call_gex": 515369480,
              "put_gex": -1539841105,
              "net_gex": -1024471625,
              "call_oi": 11767,
              "put_oi": 32899
            },
            {
              "strike": 7400.0,
              "call_gex": 4169751560,
              "put_gex": -9847487161,
              "net_gex": -5677735601,
              "call_oi": 91164,
              "put_oi": 202460
            },
            {
              "strike": 7425.0,
              "call_gex": 783428129,
              "put_gex": -2144446569,
              "net_gex": -1361018439,
              "call_oi": 16086,
              "put_oi": 39905
            },
            {
              "strike": 7450.0,
              "call_gex": 2666111665,
              "put_gex": -6697704700,
              "net_gex": -4031593035,
              "call_oi": 51437,
              "put_oi": 101101
            },
            {
              "strike": 7470.0,
              "call_gex": 259919033,
              "put_gex": -1363054757,
              "net_gex": -1103135724,
              "call_oi": 3417,
              "put_oi": 13656
            },
            {
              "strike": 7475.0,
              "call_gex": 1052397465,
              "put_gex": -3405549668,
              "net_gex": -2353152202,
              "call_oi": 20730,
              "put_oi": 48301
            },
            {
              "strike": 7500.0,
              "call_gex": 7061187477,
              "put_gex": -14360347005,
              "net_gex": -7299159527,
              "call_oi": 134061,
              "put_oi": 228365
            },
            {
              "strike": 7510.0,
              "call_gex": 594819824,
              "put_gex": -3586301179,
              "net_gex": -2991481356,
              "call_oi": 4464,
              "put_oi": 19937
            },
            {
              "strike": 7520.0,
              "call_gex": 940077554,
              "put_gex": -3930874480,
              "net_gex": -2990796926,
              "call_oi": 6496,
              "put_oi": 22869
            },
            {
              "strike": 7550.0,
              "call_gex": 4643472679,
              "put_gex": -5749662880,
              "net_gex": -1106190201,
              "call_oi": 58638,
              "put_oi": 83458
            },
            {
              "strike": 7580.0,
              "call_gex": 854976428,
              "put_gex": -2043496100,
              "net_gex": -1188519672,
              "call_oi": 6547,
              "put_oi": 15400
            },
            {
              "strike": 7600.0,
              "call_gex": 8286360875,
              "put_gex": -11607918078,
              "net_gex": -3321557203,
              "call_oi": 141737,
              "put_oi": 186682
            },
            {
              "strike": 7700.0,
              "call_gex": 12513310348,
              "put_gex": -11198657740,
              "net_gex": 1314652608,
              "call_oi": 224501,
              "put_oi": 210000
            },
            {
              "strike": 7800.0,
              "call_gex": 6619046258,
              "put_gex": -4792904487,
              "net_gex": 1826141771,
              "call_oi": 167358,
              "put_oi": 122732
            },
            {
              "strike": 7850.0,
              "call_gex": 3428316835,
              "put_gex": -2105892280,
              "net_gex": 1322424555,
              "call_oi": 106309,
              "put_oi": 56610
            },
            {
              "strike": 7900.0,
              "call_gex": 3433073900,
              "put_gex": -1543121840,
              "net_gex": 1889952060,
              "call_oi": 120793,
              "put_oi": 51629
            },
            {
              "strike": 7950.0,
              "call_gex": 1749632775,
              "put_gex": -506002417,
              "net_gex": 1243630359,
              "call_oi": 70246,
              "put_oi": 17886
            },
            {
              "strike": 8000.0,
              "call_gex": 29722805731,
              "put_gex": -27219344972,
              "net_gex": 2503460759,
              "call_oi": 1231648,
              "put_oi": 1112201
            },
            {
              "strike": 8040.0,
              "call_gex": 1275877718,
              "put_gex": -35171738,
              "net_gex": 1240705980,
              "call_oi": 46834,
              "put_oi": 1120
            },
            {
              "strike": 8050.0,
              "call_gex": 2318212378,
              "put_gex": -218802378,
              "net_gex": 2099410000,
              "call_oi": 127324,
              "put_oi": 9457
            },
            {
              "strike": 8100.0,
              "call_gex": 3827124074,
              "put_gex": -491210829,
              "net_gex": 3335913246,
              "call_oi": 216313,
              "put_oi": 23111
            },
            {
              "strike": 8150.0,
              "call_gex": 2171195869,
              "put_gex": -218926819,
              "net_gex": 1952269050,
              "call_oi": 119127,
              "put_oi": 10687
            },
            {
              "strike": 8200.0,
              "call_gex": 3373375842,
              "put_gex": -331710559,
              "net_gex": 3041665283,
              "call_oi": 197944,
              "put_oi": 18874
            },
            {
              "strike": 8250.0,
              "call_gex": 1473864400,
              "put_gex": -100011500,
              "net_gex": 1373852900,
              "call_oi": 89934,
              "put_oi": 5543
            },
            {
              "strike": 8300.0,
              "call_gex": 1694403304,
              "put_gex": -190571090,
              "net_gex": 1503832214,
              "call_oi": 121803,
              "put_oi": 10867
            },
            {
              "strike": 8400.0,
              "call_gex": 1548885751,
              "put_gex": -180842015,
              "net_gex": 1368043737,
              "call_oi": 129133,
              "put_oi": 10190
            },
            {
              "strike": 8500.0,
              "call_gex": 1536006040,
              "put_gex": -214316821,
              "net_gex": 1321689218,
              "call_oi": 153740,
              "put_oi": 13032
            }
          ],
          "flip": 7631.75,
          "flip_status": "ok",
          "flip_reason": null,
          "flip_roots": [
            7631.75
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
          "net_gex": -12026177812,
          "call_gex": 21623571174,
          "put_gex": -33649748986,
          "sign": "negative",
          "call_wall": {
            "strike": 7550.0,
            "gex": 1699392283
          },
          "put_wall": {
            "strike": 7510.0,
            "gex": -2272287749
          },
          "contracts_used": 2824,
          "expiries": 5,
          "oi_used": 1177554,
          "strikes_total": 340,
          "strikes_shown": 40,
          "strikes": [
            {
              "strike": 7200.0,
              "call_gex": 4960697,
              "put_gex": -156988811,
              "net_gex": -152028114,
              "call_oi": 647,
              "put_oi": 10007
            },
            {
              "strike": 7300.0,
              "call_gex": 7952953,
              "put_gex": -290316737,
              "net_gex": -282363784,
              "call_oi": 195,
              "put_oi": 7070
            },
            {
              "strike": 7320.0,
              "call_gex": 24916614,
              "put_gex": -206918199,
              "net_gex": -182001585,
              "call_oi": 450,
              "put_oi": 4690
            },
            {
              "strike": 7325.0,
              "call_gex": 6900856,
              "put_gex": -185073031,
              "net_gex": -178172175,
              "call_oi": 132,
              "put_oi": 3936
            },
            {
              "strike": 7345.0,
              "call_gex": 3597495,
              "put_gex": -198309099,
              "net_gex": -194711603,
              "call_oi": 72,
              "put_oi": 4138
            },
            {
              "strike": 7350.0,
              "call_gex": 141179064,
              "put_gex": -659563426,
              "net_gex": -518384362,
              "call_oi": 2131,
              "put_oi": 11156
            },
            {
              "strike": 7375.0,
              "call_gex": 116805468,
              "put_gex": -305504276,
              "net_gex": -188698809,
              "call_oi": 1720,
              "put_oi": 4562
            },
            {
              "strike": 7380.0,
              "call_gex": 27037779,
              "put_gex": -200243601,
              "net_gex": -173205822,
              "call_oi": 341,
              "put_oi": 2713
            },
            {
              "strike": 7390.0,
              "call_gex": 16154790,
              "put_gex": -235081609,
              "net_gex": -218926819,
              "call_oi": 195,
              "put_oi": 2905
            },
            {
              "strike": 7395.0,
              "call_gex": 22693634,
              "put_gex": -277035418,
              "net_gex": -254341784,
              "call_oi": 249,
              "put_oi": 3361
            },
            {
              "strike": 7400.0,
              "call_gex": 349047544,
              "put_gex": -1241797672,
              "net_gex": -892750128,
              "call_oi": 3933,
              "put_oi": 13191
            },
            {
              "strike": 7405.0,
              "call_gex": 28604613,
              "put_gex": -217422206,
              "net_gex": -188817594,
              "call_oi": 295,
              "put_oi": 2638
            },
            {
              "strike": 7410.0,
              "call_gex": 73805217,
              "put_gex": -250665099,
              "net_gex": -176859882,
              "call_oi": 707,
              "put_oi": 2539
            },
            {
              "strike": 7415.0,
              "call_gex": 46490273,
              "put_gex": -199819368,
              "net_gex": -153329095,
              "call_oi": 427,
              "put_oi": 1883
            },
            {
              "strike": 7425.0,
              "call_gex": 122518471,
              "put_gex": -481905986,
              "net_gex": -359387515,
              "call_oi": 1033,
              "put_oi": 4210
            },
            {
              "strike": 7430.0,
              "call_gex": 99971905,
              "put_gex": -331863282,
              "net_gex": -231891378,
              "call_oi": 854,
              "put_oi": 2852
            },
            {
              "strike": 7435.0,
              "call_gex": 47355708,
              "put_gex": -342271130,
              "net_gex": -294915422,
              "call_oi": 369,
              "put_oi": 2737
            },
            {
              "strike": 7440.0,
              "call_gex": 80672135,
              "put_gex": -401064158,
              "net_gex": -320392024,
              "call_oi": 595,
              "put_oi": 3080
            },
            {
              "strike": 7450.0,
              "call_gex": 358029970,
              "put_gex": -1939445902,
              "net_gex": -1581415933,
              "call_oi": 2421,
              "put_oi": 13440
            },
            {
              "strike": 7455.0,
              "call_gex": 45647464,
              "put_gex": -199078374,
              "net_gex": -153430911,
              "call_oi": 300,
              "put_oi": 1270
            },
            {
              "strike": 7460.0,
              "call_gex": 88031162,
              "put_gex": -374535459,
              "net_gex": -286504297,
              "call_oi": 552,
              "put_oi": 2424
            },
            {
              "strike": 7465.0,
              "call_gex": 92267835,
              "put_gex": -362820974,
              "net_gex": -270553139,
              "call_oi": 561,
              "put_oi": 2214
            },
            {
              "strike": 7470.0,
              "call_gex": 83964182,
              "put_gex": -311828175,
              "net_gex": -227863993,
              "call_oi": 487,
              "put_oi": 1818
            },
            {
              "strike": 7475.0,
              "call_gex": 202376078,
              "put_gex": -841887427,
              "net_gex": -639511349,
              "call_oi": 1084,
              "put_oi": 4925
            },
            {
              "strike": 7480.0,
              "call_gex": 127100187,
              "put_gex": -297455163,
              "net_gex": -170354977,
              "call_oi": 679,
              "put_oi": 1582
            },
            {
              "strike": 7490.0,
              "call_gex": 125120433,
              "put_gex": -294717447,
              "net_gex": -169597014,
              "call_oi": 622,
              "put_oi": 1448
            },
            {
              "strike": 7500.0,
              "call_gex": 1151984732,
              "put_gex": -2089833649,
              "net_gex": -937848917,
              "call_oi": 5738,
              "put_oi": 10186
            },
            {
              "strike": 7510.0,
              "call_gex": 406449088,
              "put_gex": -2272287749,
              "net_gex": -1865838660,
              "call_oi": 1558,
              "put_oi": 7785
            },
            {
              "strike": 7520.0,
              "call_gex": 688846811,
              "put_gex": -2232262786,
              "net_gex": -1543415975,
              "call_oi": 2973,
              "put_oi": 6763
            },
            {
              "strike": 7525.0,
              "call_gex": 417592274,
              "put_gex": -620669750,
              "net_gex": -203077477,
              "call_oi": 1675,
              "put_oi": 2707
            },
            {
              "strike": 7530.0,
              "call_gex": 266831202,
              "put_gex": -505227485,
              "net_gex": -238396283,
              "call_oi": 1094,
              "put_oi": 2037
            },
            {
              "strike": 7550.0,
              "call_gex": 1699392283,
              "put_gex": -1130971061,
              "net_gex": 568421222,
              "call_oi": 6381,
              "put_oi": 5165
            },
            {
              "strike": 7555.0,
              "call_gex": 341439634,
              "put_gex": -183449633,
              "net_gex": 157990001,
              "call_oi": 1393,
              "put_oi": 828
            },
            {
              "strike": 7570.0,
              "call_gex": 393908763,
              "put_gex": -575655808,
              "net_gex": -181747045,
              "call_oi": 1776,
              "put_oi": 2585
            },
            {
              "strike": 7580.0,
              "call_gex": 494022079,
              "put_gex": -846282481,
              "net_gex": -352260402,
              "call_oi": 2089,
              "put_oi": 3648
            },
            {
              "strike": 7590.0,
              "call_gex": 412908742,
              "put_gex": -217263826,
              "net_gex": 195644916,
              "call_oi": 2041,
              "put_oi": 1103
            },
            {
              "strike": 7635.0,
              "call_gex": 313570358,
              "put_gex": -69421477,
              "net_gex": 244148881,
              "call_oi": 2542,
              "put_oi": 758
            },
            {
              "strike": 7640.0,
              "call_gex": 452277558,
              "put_gex": -219707408,
              "net_gex": 232570150,
              "call_oi": 4083,
              "put_oi": 1885
            },
            {
              "strike": 7650.0,
              "call_gex": 1286262940,
              "put_gex": -620873382,
              "net_gex": 665389558,
              "call_oi": 12147,
              "put_oi": 5805
            },
            {
              "strike": 7700.0,
              "call_gex": 539109555,
              "put_gex": -303111602,
              "net_gex": 235997952,
              "call_oi": 10330,
              "put_oi": 6093
            }
          ],
          "flip": 7588.06,
          "flip_status": "ok",
          "flip_reason": null,
          "flip_roots": [
            7588.06
          ],
          "spot_vs_flip": "below",
          "flip_search": {
            "low_ratio": 0.6,
            "high_ratio": 1.4,
            "repricing": "black_scholes_r0_q0"
          }
        },
        "d30": {
          "label": "0–30 个日历日",
          "dte_max": 30,
          "net_gex": -45833254995,
          "call_gex": 61874113089,
          "put_gex": -107707368084,
          "sign": "negative",
          "call_wall": {
            "strike": 7700.0,
            "gex": 4220376690
          },
          "put_wall": {
            "strike": 7500.0,
            "gex": -8491508609
          },
          "contracts_used": 12100,
          "expiries": 21,
          "oi_used": 5178439,
          "strikes_total": 608,
          "strikes_shown": 40,
          "strikes": [
            {
              "strike": 6500.0,
              "call_gex": 18225047,
              "put_gex": -956916773,
              "net_gex": -938691726,
              "call_oi": 3236,
              "put_oi": 178298
            },
            {
              "strike": 7000.0,
              "call_gex": 1703289570,
              "put_gex": -2741975827,
              "net_gex": -1038686257,
              "call_oi": 102454,
              "put_oi": 164066
            },
            {
              "strike": 7100.0,
              "call_gex": 38011271,
              "put_gex": -1057493917,
              "net_gex": -1019482646,
              "call_oi": 1744,
              "put_oi": 51691
            },
            {
              "strike": 7150.0,
              "call_gex": 33372991,
              "put_gex": -521353993,
              "net_gex": -487981002,
              "call_oi": 1518,
              "put_oi": 22026
            },
            {
              "strike": 7200.0,
              "call_gex": 147078730,
              "put_gex": -1371737391,
              "net_gex": -1224658662,
              "call_oi": 4803,
              "put_oi": 44353
            },
            {
              "strike": 7250.0,
              "call_gex": 146054914,
              "put_gex": -1172291349,
              "net_gex": -1026236434,
              "call_oi": 3309,
              "put_oi": 28425
            },
            {
              "strike": 7275.0,
              "call_gex": 49573032,
              "put_gex": -686075156,
              "net_gex": -636502123,
              "call_oi": 1001,
              "put_oi": 15219
            },
            {
              "strike": 7290.0,
              "call_gex": 6849948,
              "put_gex": -446836064,
              "net_gex": -439986116,
              "call_oi": 141,
              "put_oi": 8971
            },
            {
              "strike": 7300.0,
              "call_gex": 299293506,
              "put_gex": -2257993927,
              "net_gex": -1958700421,
              "call_oi": 5400,
              "put_oi": 42907
            },
            {
              "strike": 7325.0,
              "call_gex": 69387539,
              "put_gex": -618384549,
              "net_gex": -548997010,
              "call_oi": 1179,
              "put_oi": 11205
            },
            {
              "strike": 7350.0,
              "call_gex": 337593255,
              "put_gex": -2399563285,
              "net_gex": -2061970030,
              "call_oi": 5077,
              "put_oi": 37573
            },
            {
              "strike": 7375.0,
              "call_gex": 293818073,
              "put_gex": -920342238,
              "net_gex": -626524165,
              "call_oi": 4320,
              "put_oi": 13264
            },
            {
              "strike": 7380.0,
              "call_gex": 99853120,
              "put_gex": -606455119,
              "net_gex": -506601999,
              "call_oi": 1374,
              "put_oi": 8317
            },
            {
              "strike": 7400.0,
              "call_gex": 1511406186,
              "put_gex": -4629003508,
              "net_gex": -3117597322,
              "call_oi": 18027,
              "put_oi": 56017
            },
            {
              "strike": 7425.0,
              "call_gex": 326421788,
              "put_gex": -1187733427,
              "net_gex": -861311639,
              "call_oi": 3447,
              "put_oi": 12681
            },
            {
              "strike": 7430.0,
              "call_gex": 217750280,
              "put_gex": -892150545,
              "net_gex": -674400265,
              "call_oi": 2194,
              "put_oi": 9788
            },
            {
              "strike": 7435.0,
              "call_gex": 80592944,
              "put_gex": -542367664,
              "net_gex": -461774719,
              "call_oi": 745,
              "put_oi": 5033
            },
            {
              "strike": 7440.0,
              "call_gex": 162820600,
              "put_gex": -723192709,
              "net_gex": -560372109,
              "call_oi": 1550,
              "put_oi": 6742
            },
            {
              "strike": 7450.0,
              "call_gex": 1029924433,
              "put_gex": -4328278923,
              "net_gex": -3298354490,
              "call_oi": 9792,
              "put_oi": 40215
            },
            {
              "strike": 7460.0,
              "call_gex": 249364118,
              "put_gex": -740541008,
              "net_gex": -491176890,
              "call_oi": 2208,
              "put_oi": 6340
            },
            {
              "strike": 7470.0,
              "call_gex": 151173992,
              "put_gex": -1227328501,
              "net_gex": -1076154509,
              "call_oi": 1275,
              "put_oi": 10977
            },
            {
              "strike": 7475.0,
              "call_gex": 493722287,
              "put_gex": -2487560508,
              "net_gex": -1993838221,
              "call_oi": 4259,
              "put_oi": 21633
            },
            {
              "strike": 7480.0,
              "call_gex": 184122749,
              "put_gex": -649161234,
              "net_gex": -465038485,
              "call_oi": 1300,
              "put_oi": 5145
            },
            {
              "strike": 7500.0,
              "call_gex": 3185225708,
              "put_gex": -8491508609,
              "net_gex": -5306282901,
              "call_oi": 24567,
              "put_oi": 69305
            },
            {
              "strike": 7510.0,
              "call_gex": 497693108,
              "put_gex": -3476911303,
              "net_gex": -2979218196,
              "call_oi": 2484,
              "put_oi": 17831
            },
            {
              "strike": 7520.0,
              "call_gex": 828815397,
              "put_gex": -3745778823,
              "net_gex": -2916963427,
              "call_oi": 4314,
              "put_oi": 19321
            },
            {
              "strike": 7525.0,
              "call_gex": 661803376,
              "put_gex": -1262969724,
              "net_gex": -601166348,
              "call_oi": 3994,
              "put_oi": 8856
            },
            {
              "strike": 7530.0,
              "call_gex": 339595635,
              "put_gex": -971074840,
              "net_gex": -631479206,
              "call_oi": 1806,
              "put_oi": 6156
            },
            {
              "strike": 7570.0,
              "call_gex": 509243556,
              "put_gex": -939308278,
              "net_gex": -430064722,
              "call_oi": 2868,
              "put_oi": 5956
            },
            {
              "strike": 7575.0,
              "call_gex": 847097008,
              "put_gex": -1430620923,
              "net_gex": -583523915,
              "call_oi": 5211,
              "put_oi": 10367
            },
            {
              "strike": 7580.0,
              "call_gex": 713610701,
              "put_gex": -1830237033,
              "net_gex": -1116626331,
              "call_oi": 4193,
              "put_oi": 11623
            },
            {
              "strike": 7600.0,
              "call_gex": 3491934806,
              "put_gex": -5380970523,
              "net_gex": -1889035717,
              "call_oi": 26960,
              "put_oi": 43533
            },
            {
              "strike": 7700.0,
              "call_gex": 4220376690,
              "put_gex": -3100956078,
              "net_gex": 1119420612,
              "call_oi": 54174,
              "put_oi": 39448
            },
            {
              "strike": 7710.0,
              "call_gex": 712671732,
              "put_gex": -220951824,
              "net_gex": 491719908,
              "call_oi": 10110,
              "put_oi": 3263
            },
            {
              "strike": 7725.0,
              "call_gex": 1062816626,
              "put_gex": -1638206581,
              "net_gex": -575389955,
              "call_oi": 17536,
              "put_oi": 24351
            },
            {
              "strike": 7750.0,
              "call_gex": 2094517181,
              "put_gex": -1316519233,
              "net_gex": 777997948,
              "call_oi": 40544,
              "put_oi": 24487
            },
            {
              "strike": 7800.0,
              "call_gex": 1743552103,
              "put_gex": -821903228,
              "net_gex": 921648875,
              "call_oi": 50020,
              "put_oi": 23439
            },
            {
              "strike": 7825.0,
              "call_gex": 645501518,
              "put_gex": -94326779,
              "net_gex": 551174739,
              "call_oi": 22930,
              "put_oi": 3372
            },
            {
              "strike": 7850.0,
              "call_gex": 835919884,
              "put_gex": -152237402,
              "net_gex": 683682482,
              "call_oi": 41226,
              "put_oi": 7209
            },
            {
              "strike": 7900.0,
              "call_gex": 536739507,
              "put_gex": -71661427,
              "net_gex": 465078080,
              "call_oi": 37609,
              "put_oi": 5486
            }
          ],
          "flip": 7636.16,
          "flip_status": "ok",
          "flip_reason": null,
          "flip_roots": [
            7636.16
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
        "options_in_file": 31428,
        "unique_kept": 31428,
        "duplicates": 0,
        "unparsed": 0,
        "expired": 574,
        "invalid_gamma_or_oi": 0,
        "used": 30854,
        "roots": {
          "SPX": 10022,
          "SPXO": 660,
          "SPXW": 20746
        },
        "rejected_roots": {},
        "iv_invalid_for_flip": 535,
        "expiry_min": "2026-11-11",
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
      "last_attempt": "2026-11-11 10:26",
      "last_success": "2026-11-11 10:26",
      "computed_at": "2026-11-11 10:26",
      "quote_timestamp_utc": "2026-11-11 02:18:09",
      "quote_timestamp_zone": "UTC",
      "quote_timestamp_basis": "与 HTTP Last-Modified（GMT）一致，按 UTC",
      "quote_timestamp_checked": true,
      "quote_timestamp_et": "2026-11-10 21:18:09",
      "last_trade_time": "2026-11-10T16:14:59",
      "last_trade_zone": "America/New_York",
      "session_date": "2026-11-10",
      "is_daily_close": true,
      "expected_session": "2026-11-10",
      "chain_behind": false,
      "spot": 27740.7949,
      "security_type": "index",
      "source_symbol": "^NDX",
      "chain_symbol": "_NDX",
      "source_url": "https://cdn.cboe.com/api/global/delayed_quotes/options/_NDX.json",
      "http_status": 200,
      "content_length": 7679576,
      "last_modified": "Wed, 11 Nov 2026 02:18:11 GMT",
      "final_url": "https://cdn-api.cboe.com/api/global/delayed_quotes/options/_NDX.json",
      "delay_note": "来源是 CBOE 公开延迟行情，大约 15 分钟，不是即时成交。",
      "assumption": "做市商多看涨、空看跌",
      "formula": "sign × gamma × open_interest × 100 × spot² × 0.01",
      "windows": {
        "all": {
          "label": "全部到期",
          "dte_max": null,
          "net_gex": -1338712140,
          "call_gex": 4805465601,
          "put_gex": -6144177741,
          "sign": "negative",
          "call_wall": {
            "strike": 29000.0,
            "gex": 421714333
          },
          "put_wall": {
            "strike": 28000.0,
            "gex": -730766296
          },
          "contracts_used": 16514,
          "expiries": 42,
          "oi_used": 193065,
          "strikes_total": 719,
          "strikes_shown": 40,
          "strikes": [
            {
              "strike": 25000.0,
              "call_gex": 11851096,
              "put_gex": -238714938,
              "net_gex": -226863842,
              "call_oi": 201,
              "put_oi": 3965
            },
            {
              "strike": 25200.0,
              "call_gex": 1769969,
              "put_gex": -39324092,
              "net_gex": -37554123,
              "call_oi": 24,
              "put_oi": 774
            },
            {
              "strike": 25500.0,
              "call_gex": 8388114,
              "put_gex": -87267163,
              "net_gex": -78879049,
              "call_oi": 119,
              "put_oi": 1260
            },
            {
              "strike": 25800.0,
              "call_gex": 1462148,
              "put_gex": -27242130,
              "net_gex": -25779982,
              "call_oi": 19,
              "put_oi": 494
            },
            {
              "strike": 26000.0,
              "call_gex": 14467572,
              "put_gex": -148831299,
              "net_gex": -134363727,
              "call_oi": 201,
              "put_oi": 2238
            },
            {
              "strike": 26200.0,
              "call_gex": 2154745,
              "put_gex": -35014602,
              "net_gex": -32859858,
              "call_oi": 28,
              "put_oi": 491
            },
            {
              "strike": 26400.0,
              "call_gex": 2308655,
              "put_gex": -46019192,
              "net_gex": -43710537,
              "call_oi": 29,
              "put_oi": 486
            },
            {
              "strike": 26500.0,
              "call_gex": 11158500,
              "put_gex": -151678640,
              "net_gex": -140520141,
              "call_oi": 155,
              "put_oi": 2029
            },
            {
              "strike": 26600.0,
              "call_gex": 4155579,
              "put_gex": -74723470,
              "net_gex": -70567891,
              "call_oi": 43,
              "put_oi": 830
            },
            {
              "strike": 26700.0,
              "call_gex": 49636085,
              "put_gex": -79494691,
              "net_gex": -29858606,
              "call_oi": 462,
              "put_oi": 725
            },
            {
              "strike": 26800.0,
              "call_gex": 35014602,
              "put_gex": -93654442,
              "net_gex": -58639840,
              "call_oi": 450,
              "put_oi": 1053
            },
            {
              "strike": 27000.0,
              "call_gex": 90037549,
              "put_gex": -611408827,
              "net_gex": -521371278,
              "call_oi": 1096,
              "put_oi": 6215
            },
            {
              "strike": 27100.0,
              "call_gex": 6925965,
              "put_gex": -32705947,
              "net_gex": -25779982,
              "call_oi": 36,
              "put_oi": 171
            },
            {
              "strike": 27400.0,
              "call_gex": 12081962,
              "put_gex": -85881970,
              "net_gex": -73800008,
              "call_oi": 99,
              "put_oi": 531
            },
            {
              "strike": 27500.0,
              "call_gex": 107968104,
              "put_gex": -228479900,
              "net_gex": -120511796,
              "call_oi": 710,
              "put_oi": 1482
            },
            {
              "strike": 27600.0,
              "call_gex": 25933892,
              "put_gex": -72260905,
              "net_gex": -46327012,
              "call_oi": 153,
              "put_oi": 522
            },
            {
              "strike": 27800.0,
              "call_gex": 42171433,
              "put_gex": -101965600,
              "net_gex": -59794167,
              "call_oi": 184,
              "put_oi": 680
            },
            {
              "strike": 27900.0,
              "call_gex": 24471744,
              "put_gex": -64642343,
              "net_gex": -40170599,
              "call_oi": 98,
              "put_oi": 315
            },
            {
              "strike": 28000.0,
              "call_gex": 281271147,
              "put_gex": -730766296,
              "net_gex": -449495149,
              "call_oi": 2227,
              "put_oi": 4854
            },
            {
              "strike": 28200.0,
              "call_gex": 61102405,
              "put_gex": -91730563,
              "net_gex": -30628158,
              "call_oi": 364,
              "put_oi": 559
            },
            {
              "strike": 28425.0,
              "call_gex": 30243382,
              "put_gex": -7310741,
              "net_gex": 22932641,
              "call_oi": 107,
              "put_oi": 33
            },
            {
              "strike": 28500.0,
              "call_gex": 91730563,
              "put_gex": -228941631,
              "net_gex": -137211068,
              "call_oi": 624,
              "put_oi": 1563
            },
            {
              "strike": 28700.0,
              "call_gex": 96270918,
              "put_gex": -21316582,
              "net_gex": 74954336,
              "call_oi": 479,
              "put_oi": 120
            },
            {
              "strike": 28750.0,
              "call_gex": 32475082,
              "put_gex": -10927634,
              "net_gex": 21547448,
              "call_oi": 336,
              "put_oi": 75
            },
            {
              "strike": 28800.0,
              "call_gex": 73415232,
              "put_gex": -37477168,
              "net_gex": 35938064,
              "call_oi": 808,
              "put_oi": 271
            },
            {
              "strike": 29000.0,
              "call_gex": 421714333,
              "put_gex": -341988776,
              "net_gex": 79725556,
              "call_oi": 3001,
              "put_oi": 3070
            },
            {
              "strike": 29025.0,
              "call_gex": 35091558,
              "put_gex": -4617310,
              "net_gex": 30474247,
              "call_oi": 242,
              "put_oi": 34
            },
            {
              "strike": 29400.0,
              "call_gex": 69721384,
              "put_gex": -43556626,
              "net_gex": 26164758,
              "call_oi": 606,
              "put_oi": 513
            },
            {
              "strike": 29625.0,
              "call_gex": 107352462,
              "put_gex": -615641,
              "net_gex": 106736821,
              "call_oi": 1411,
              "put_oi": 9
            },
            {
              "strike": 29650.0,
              "call_gex": 28396458,
              "put_gex": -5925548,
              "net_gex": 22470910,
              "call_oi": 377,
              "put_oi": 84
            },
            {
              "strike": 29675.0,
              "call_gex": 276653837,
              "put_gex": -3001252,
              "net_gex": 273652585,
              "call_oi": 3601,
              "put_oi": 40
            },
            {
              "strike": 30200.0,
              "call_gex": 22316999,
              "put_gex": -45326595,
              "net_gex": -23009596,
              "call_oi": 387,
              "put_oi": 673
            },
            {
              "strike": 30300.0,
              "call_gex": 7310741,
              "put_gex": -53791664,
              "net_gex": -46480923,
              "call_oi": 355,
              "put_oi": 750
            },
            {
              "strike": 30500.0,
              "call_gex": 193850074,
              "put_gex": -56792916,
              "net_gex": 137057158,
              "call_oi": 2843,
              "put_oi": 782
            },
            {
              "strike": 30900.0,
              "call_gex": 60332853,
              "put_gex": -30859023,
              "net_gex": 29473830,
              "call_oi": 890,
              "put_oi": 465
            },
            {
              "strike": 31000.0,
              "call_gex": 218706594,
              "put_gex": -73492188,
              "net_gex": 145214406,
              "call_oi": 3550,
              "put_oi": 1254
            },
            {
              "strike": 31500.0,
              "call_gex": 130669879,
              "put_gex": -26087803,
              "net_gex": 104582076,
              "call_oi": 2840,
              "put_oi": 648
            },
            {
              "strike": 31600.0,
              "call_gex": 29935561,
              "put_gex": -9542441,
              "net_gex": 20393120,
              "call_oi": 608,
              "put_oi": 200
            },
            {
              "strike": 32000.0,
              "call_gex": 90191459,
              "put_gex": -34783737,
              "net_gex": 55407723,
              "call_oi": 2788,
              "put_oi": 665
            },
            {
              "strike": 32500.0,
              "call_gex": 34014185,
              "put_gex": -3155162,
              "net_gex": 30859023,
              "call_oi": 1364,
              "put_oi": 154
            }
          ],
          "flip": 28258.15,
          "flip_status": "ok",
          "flip_reason": null,
          "flip_roots": [
            28258.15
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
          "net_gex": -76878215,
          "call_gex": 500439472,
          "put_gex": -577317687,
          "sign": "negative",
          "call_wall": {
            "strike": 28000.0,
            "gex": 31166844
          },
          "put_wall": {
            "strike": 28000.0,
            "gex": -31166844
          },
          "contracts_used": 4392,
          "expiries": 5,
          "oi_used": 12157,
          "strikes_total": 548,
          "strikes_shown": 41,
          "strikes": [
            {
              "strike": 25800.0,
              "call_gex": 0,
              "put_gex": -7002920,
              "net_gex": -7002920,
              "call_oi": 0,
              "put_oi": 220
            },
            {
              "strike": 26000.0,
              "call_gex": 230866,
              "put_gex": -7233786,
              "net_gex": -7002920,
              "call_oi": 3,
              "put_oi": 161
            },
            {
              "strike": 26200.0,
              "call_gex": 0,
              "put_gex": -5309907,
              "net_gex": -5309907,
              "call_oi": 0,
              "put_oi": 73
            },
            {
              "strike": 26400.0,
              "call_gex": 0,
              "put_gex": -6772055,
              "net_gex": -6772055,
              "call_oi": 0,
              "put_oi": 77
            },
            {
              "strike": 26500.0,
              "call_gex": 0,
              "put_gex": -12620648,
              "net_gex": -12620648,
              "call_oi": 0,
              "put_oi": 84
            },
            {
              "strike": 26600.0,
              "call_gex": 1693014,
              "put_gex": -12851513,
              "net_gex": -11158500,
              "call_oi": 11,
              "put_oi": 112
            },
            {
              "strike": 26750.0,
              "call_gex": 769552,
              "put_gex": -6079458,
              "net_gex": -5309907,
              "call_oi": 5,
              "put_oi": 50
            },
            {
              "strike": 26800.0,
              "call_gex": 1077372,
              "put_gex": -11004589,
              "net_gex": -9927217,
              "call_oi": 9,
              "put_oi": 79
            },
            {
              "strike": 26900.0,
              "call_gex": 2000834,
              "put_gex": -9388531,
              "net_gex": -7387696,
              "call_oi": 9,
              "put_oi": 45
            },
            {
              "strike": 26950.0,
              "call_gex": 769552,
              "put_gex": -4540355,
              "net_gex": -3770803,
              "call_oi": 4,
              "put_oi": 25
            },
            {
              "strike": 27000.0,
              "call_gex": 4001669,
              "put_gex": -21701358,
              "net_gex": -17699689,
              "call_oi": 18,
              "put_oi": 98
            },
            {
              "strike": 27100.0,
              "call_gex": 2308655,
              "put_gex": -10465903,
              "net_gex": -8157248,
              "call_oi": 9,
              "put_oi": 39
            },
            {
              "strike": 27200.0,
              "call_gex": 2154745,
              "put_gex": -17699689,
              "net_gex": -15544944,
              "call_oi": 7,
              "put_oi": 58
            },
            {
              "strike": 27300.0,
              "call_gex": 4694265,
              "put_gex": -8618979,
              "net_gex": -3924714,
              "call_oi": 14,
              "put_oi": 27
            },
            {
              "strike": 27400.0,
              "call_gex": 2462565,
              "put_gex": -17161003,
              "net_gex": -14698438,
              "call_oi": 6,
              "put_oi": 39
            },
            {
              "strike": 27430.0,
              "call_gex": 538686,
              "put_gex": -4232534,
              "net_gex": -3693848,
              "call_oi": 1,
              "put_oi": 9
            },
            {
              "strike": 27475.0,
              "call_gex": 1308238,
              "put_gex": -5002086,
              "net_gex": -3693848,
              "call_oi": 3,
              "put_oi": 11
            },
            {
              "strike": 27500.0,
              "call_gex": 17391868,
              "put_gex": -24394789,
              "net_gex": -7002920,
              "call_oi": 39,
              "put_oi": 52
            },
            {
              "strike": 27600.0,
              "call_gex": 7695517,
              "put_gex": -20393120,
              "net_gex": -12697603,
              "call_oi": 14,
              "put_oi": 44
            },
            {
              "strike": 27680.0,
              "call_gex": 0,
              "put_gex": -6156414,
              "net_gex": -6156414,
              "call_oi": 0,
              "put_oi": 8
            },
            {
              "strike": 27725.0,
              "call_gex": 0,
              "put_gex": -5232952,
              "net_gex": -5232952,
              "call_oi": 0,
              "put_oi": 12
            },
            {
              "strike": 27780.0,
              "call_gex": 2000834,
              "put_gex": -9080710,
              "net_gex": -7079876,
              "call_oi": 4,
              "put_oi": 13
            },
            {
              "strike": 27850.0,
              "call_gex": 11774141,
              "put_gex": -4694265,
              "net_gex": 7079876,
              "call_oi": 19,
              "put_oi": 11
            },
            {
              "strike": 27860.0,
              "call_gex": 4617310,
              "put_gex": 0,
              "net_gex": 4617310,
              "call_oi": 6,
              "put_oi": 0
            },
            {
              "strike": 27890.0,
              "call_gex": 0,
              "put_gex": -6156414,
              "net_gex": -6156414,
              "call_oi": 0,
              "put_oi": 8
            },
            {
              "strike": 27900.0,
              "call_gex": 8465069,
              "put_gex": -4694265,
              "net_gex": 3770803,
              "call_oi": 18,
              "put_oi": 11
            },
            {
              "strike": 27950.0,
              "call_gex": 3078207,
              "put_gex": -17314913,
              "net_gex": -14236706,
              "call_oi": 7,
              "put_oi": 40
            },
            {
              "strike": 28000.0,
              "call_gex": 31166844,
              "put_gex": -31166844,
              "net_gex": 0,
              "call_oi": 71,
              "put_oi": 72
            },
            {
              "strike": 28025.0,
              "call_gex": 5617727,
              "put_gex": -384776,
              "net_gex": 5232952,
              "call_oi": 14,
              "put_oi": 1
            },
            {
              "strike": 28200.0,
              "call_gex": 7233786,
              "put_gex": -13313244,
              "net_gex": -6079458,
              "call_oi": 19,
              "put_oi": 35
            },
            {
              "strike": 28250.0,
              "call_gex": 17776644,
              "put_gex": -3155162,
              "net_gex": 14621482,
              "call_oi": 47,
              "put_oi": 9
            },
            {
              "strike": 28425.0,
              "call_gex": 27472996,
              "put_gex": -307821,
              "net_gex": 27165175,
              "call_oi": 91,
              "put_oi": 1
            },
            {
              "strike": 28450.0,
              "call_gex": 6079458,
              "put_gex": -846507,
              "net_gex": 5232952,
              "call_oi": 22,
              "put_oi": 3
            },
            {
              "strike": 28500.0,
              "call_gex": 17007093,
              "put_gex": -11928051,
              "net_gex": 5079041,
              "call_oi": 77,
              "put_oi": 53
            },
            {
              "strike": 28550.0,
              "call_gex": 5079041,
              "put_gex": -846507,
              "net_gex": 4232534,
              "call_oi": 24,
              "put_oi": 5
            },
            {
              "strike": 28600.0,
              "call_gex": 6387279,
              "put_gex": -2308655,
              "net_gex": 4078624,
              "call_oi": 31,
              "put_oi": 11
            },
            {
              "strike": 28650.0,
              "call_gex": 4463400,
              "put_gex": -538686,
              "net_gex": 3924714,
              "call_oi": 29,
              "put_oi": 4
            },
            {
              "strike": 28675.0,
              "call_gex": 4848176,
              "put_gex": -923462,
              "net_gex": 3924714,
              "call_oi": 29,
              "put_oi": 9
            },
            {
              "strike": 28700.0,
              "call_gex": 5848593,
              "put_gex": -769552,
              "net_gex": 5079041,
              "call_oi": 39,
              "put_oi": 5
            },
            {
              "strike": 28825.0,
              "call_gex": 4463400,
              "put_gex": -153910,
              "net_gex": 4309490,
              "call_oi": 34,
              "put_oi": 1
            },
            {
              "strike": 29000.0,
              "call_gex": 7156831,
              "put_gex": -3001252,
              "net_gex": 4155579,
              "call_oi": 106,
              "put_oi": 38
            }
          ],
          "flip": 27807.33,
          "flip_status": "ok",
          "flip_reason": null,
          "flip_roots": [
            27807.33
          ],
          "spot_vs_flip": "below",
          "flip_search": {
            "low_ratio": 0.6,
            "high_ratio": 1.4,
            "repricing": "black_scholes_r0_q0"
          }
        },
        "d30": {
          "label": "0–30 个日历日",
          "dte_max": 30,
          "net_gex": -749851178,
          "call_gex": 1837535553,
          "put_gex": -2587386731,
          "sign": "negative",
          "call_wall": {
            "strike": 29675.0,
            "gex": 273960406
          },
          "put_wall": {
            "strike": 28000.0,
            "gex": -465578780
          },
          "contracts_used": 11262,
          "expiries": 21,
          "oi_used": 58958,
          "strikes_total": 622,
          "strikes_shown": 40,
          "strikes": [
            {
              "strike": 25000.0,
              "call_gex": 769552,
              "put_gex": -26318668,
              "net_gex": -25549116,
              "call_oi": 11,
              "put_oi": 484
            },
            {
              "strike": 25500.0,
              "call_gex": 1154328,
              "put_gex": -11697186,
              "net_gex": -10542858,
              "call_oi": 15,
              "put_oi": 242
            },
            {
              "strike": 25600.0,
              "call_gex": 538686,
              "put_gex": -16237541,
              "net_gex": -15698855,
              "call_oi": 7,
              "put_oi": 376
            },
            {
              "strike": 25700.0,
              "call_gex": 153910,
              "put_gex": -12466738,
              "net_gex": -12312827,
              "call_oi": 3,
              "put_oi": 186
            },
            {
              "strike": 25800.0,
              "call_gex": 76955,
              "put_gex": -10619813,
              "net_gex": -10542858,
              "call_oi": 1,
              "put_oi": 267
            },
            {
              "strike": 26000.0,
              "call_gex": 923462,
              "put_gex": -27626906,
              "net_gex": -26703444,
              "call_oi": 12,
              "put_oi": 426
            },
            {
              "strike": 26200.0,
              "call_gex": 153910,
              "put_gex": -16468406,
              "net_gex": -16314496,
              "call_oi": 2,
              "put_oi": 218
            },
            {
              "strike": 26350.0,
              "call_gex": 0,
              "put_gex": -10773724,
              "net_gex": -10773724,
              "call_oi": 0,
              "put_oi": 70
            },
            {
              "strike": 26375.0,
              "call_gex": 0,
              "put_gex": -10773724,
              "net_gex": -10773724,
              "call_oi": 0,
              "put_oi": 70
            },
            {
              "strike": 26400.0,
              "call_gex": 153910,
              "put_gex": -26318668,
              "net_gex": -26164758,
              "call_oi": 1,
              "put_oi": 211
            },
            {
              "strike": 26500.0,
              "call_gex": 0,
              "put_gex": -36091975,
              "net_gex": -36091975,
              "call_oi": 0,
              "put_oi": 245
            },
            {
              "strike": 26600.0,
              "call_gex": 1693014,
              "put_gex": -31089889,
              "net_gex": -29396875,
              "call_oi": 11,
              "put_oi": 233
            },
            {
              "strike": 26700.0,
              "call_gex": 28242547,
              "put_gex": -47558295,
              "net_gex": -19315748,
              "call_oi": 184,
              "put_oi": 310
            },
            {
              "strike": 26800.0,
              "call_gex": 1077372,
              "put_gex": -25779982,
              "net_gex": -24702610,
              "call_oi": 9,
              "put_oi": 175
            },
            {
              "strike": 26900.0,
              "call_gex": 3078207,
              "put_gex": -14159751,
              "net_gex": -11081545,
              "call_oi": 16,
              "put_oi": 76
            },
            {
              "strike": 26950.0,
              "call_gex": 769552,
              "put_gex": -12081962,
              "net_gex": -11312410,
              "call_oi": 4,
              "put_oi": 74
            },
            {
              "strike": 27000.0,
              "call_gex": 11235455,
              "put_gex": -266880530,
              "net_gex": -255645075,
              "call_oi": 65,
              "put_oi": 1690
            },
            {
              "strike": 27100.0,
              "call_gex": 5925548,
              "put_gex": -27088220,
              "net_gex": -21162672,
              "call_oi": 28,
              "put_oi": 120
            },
            {
              "strike": 27200.0,
              "call_gex": 73569143,
              "put_gex": -50405636,
              "net_gex": 23163506,
              "call_oi": 449,
              "put_oi": 219
            },
            {
              "strike": 27400.0,
              "call_gex": 6002503,
              "put_gex": -55330767,
              "net_gex": -49328264,
              "call_oi": 24,
              "put_oi": 222
            },
            {
              "strike": 27500.0,
              "call_gex": 86651522,
              "put_gex": -145522227,
              "net_gex": -58870705,
              "call_oi": 468,
              "put_oi": 585
            },
            {
              "strike": 27600.0,
              "call_gex": 18700106,
              "put_gex": -51329099,
              "net_gex": -32628992,
              "call_oi": 68,
              "put_oi": 200
            },
            {
              "strike": 27800.0,
              "call_gex": 31782485,
              "put_gex": -53945574,
              "net_gex": -22163089,
              "call_oi": 102,
              "put_oi": 208
            },
            {
              "strike": 27850.0,
              "call_gex": 25703027,
              "put_gex": -9234620,
              "net_gex": 16468406,
              "call_oi": 79,
              "put_oi": 34
            },
            {
              "strike": 27900.0,
              "call_gex": 21162672,
              "put_gex": -52483426,
              "net_gex": -31320754,
              "call_oi": 76,
              "put_oi": 218
            },
            {
              "strike": 27950.0,
              "call_gex": 6618145,
              "put_gex": -24702610,
              "net_gex": -18084465,
              "call_oi": 22,
              "put_oi": 74
            },
            {
              "strike": 28000.0,
              "call_gex": 90653190,
              "put_gex": -465578780,
              "net_gex": -374925589,
              "call_oi": 331,
              "put_oi": 1956
            },
            {
              "strike": 28200.0,
              "call_gex": 49636085,
              "put_gex": -67412729,
              "net_gex": -17776644,
              "call_oi": 260,
              "put_oi": 332
            },
            {
              "strike": 28425.0,
              "call_gex": 28396458,
              "put_gex": -6541189,
              "net_gex": 21855268,
              "call_oi": 95,
              "put_oi": 28
            },
            {
              "strike": 28600.0,
              "call_gex": 37015437,
              "put_gex": -16237541,
              "net_gex": 20777896,
              "call_oi": 175,
              "put_oi": 79
            },
            {
              "strike": 28700.0,
              "call_gex": 90422325,
              "put_gex": -12851513,
              "net_gex": 77570812,
              "call_oi": 440,
              "put_oi": 65
            },
            {
              "strike": 29000.0,
              "call_gex": 35938064,
              "put_gex": -49482174,
              "net_gex": -13544110,
              "call_oi": 293,
              "put_oi": 340
            },
            {
              "strike": 29100.0,
              "call_gex": 51252143,
              "put_gex": -34475916,
              "net_gex": 16776227,
              "call_oi": 353,
              "put_oi": 234
            },
            {
              "strike": 29200.0,
              "call_gex": 16391451,
              "put_gex": -66797088,
              "net_gex": -50405636,
              "call_oi": 280,
              "put_oi": 451
            },
            {
              "strike": 29375.0,
              "call_gex": 10696769,
              "put_gex": -230866,
              "net_gex": 10465903,
              "call_oi": 150,
              "put_oi": 7
            },
            {
              "strike": 29400.0,
              "call_gex": 58178109,
              "put_gex": -10235038,
              "net_gex": 47943071,
              "call_oi": 513,
              "put_oi": 189
            },
            {
              "strike": 29500.0,
              "call_gex": 32398127,
              "put_gex": -13236289,
              "net_gex": 19161837,
              "call_oi": 482,
              "put_oi": 222
            },
            {
              "strike": 29650.0,
              "call_gex": 23317417,
              "put_gex": -1154328,
              "net_gex": 22163089,
              "call_oi": 311,
              "put_oi": 22
            },
            {
              "strike": 29675.0,
              "call_gex": 273960406,
              "put_gex": -538686,
              "net_gex": 273421720,
              "call_oi": 3566,
              "put_oi": 8
            },
            {
              "strike": 30200.0,
              "call_gex": 769552,
              "put_gex": -26626489,
              "net_gex": -25856937,
              "call_oi": 107,
              "put_oi": 430
            }
          ],
          "flip": 28083.99,
          "flip_status": "ok",
          "flip_reason": null,
          "flip_roots": [
            28083.99
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
        "options_in_file": 17594,
        "unique_kept": 17594,
        "duplicates": 0,
        "unparsed": 0,
        "expired": 1080,
        "invalid_gamma_or_oi": 0,
        "used": 16514,
        "roots": {
          "NDX": 4148,
          "NDXP": 13446
        },
        "rejected_roots": {},
        "iv_invalid_for_flip": 417,
        "expiry_min": "2026-11-11",
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
      }
    ]
  },
  "events": []
};
