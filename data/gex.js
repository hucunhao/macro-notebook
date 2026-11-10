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
      "last_attempt": "2026-11-10 14:20",
      "last_success": "2026-11-10 14:20",
      "computed_at": "2026-11-10 14:20",
      "quote_timestamp_utc": "2026-11-10 02:58:42",
      "quote_timestamp_zone": "UTC",
      "quote_timestamp_basis": "与 HTTP Last-Modified（GMT）一致，按 UTC",
      "quote_timestamp_checked": true,
      "quote_timestamp_et": "2026-11-09 21:58:42",
      "last_trade_time": "2026-11-09T16:14:59",
      "last_trade_zone": "America/New_York",
      "session_date": "2026-11-09",
      "is_daily_close": true,
      "expected_session": "2026-11-09",
      "chain_behind": false,
      "spot": 7549.9399,
      "security_type": "index",
      "source_symbol": "^SPX",
      "chain_symbol": "_SPX",
      "source_url": "https://cdn.cboe.com/api/global/delayed_quotes/options/_SPX.json",
      "http_status": 200,
      "content_length": 14080417,
      "last_modified": "Tue, 10 Nov 2026 02:58:45 GMT",
      "final_url": "https://cdn-api.cboe.com/api/global/delayed_quotes/options/_SPX.json",
      "delay_note": "来源是 CBOE 公开延迟行情，大约 15 分钟，不是即时成交。",
      "assumption": "做市商多看涨、空看跌",
      "formula": "sign × gamma × open_interest × 100 × spot² × 0.01",
      "windows": {
        "all": {
          "label": "全部到期",
          "dte_max": null,
          "net_gex": -36533010348,
          "call_gex": 242469629145,
          "put_gex": -279002639493,
          "sign": "negative",
          "call_wall": {
            "strike": 8000.0,
            "gex": 32567768669
          },
          "put_wall": {
            "strike": 8000.0,
            "gex": -29806429123
          },
          "contracts_used": 31010,
          "expiries": 54,
          "oi_used": 24593580,
          "strikes_total": 893,
          "strikes_shown": 40,
          "strikes": [
            {
              "strike": 6400.0,
              "call_gex": 80292443,
              "put_gex": -1436126622,
              "net_gex": -1355834179,
              "call_oi": 12168,
              "put_oi": 303620
            },
            {
              "strike": 6500.0,
              "call_gex": 225595203,
              "put_gex": -2291133409,
              "net_gex": -2065538206,
              "call_oi": 29817,
              "put_oi": 321746
            },
            {
              "strike": 6600.0,
              "call_gex": 242735581,
              "put_gex": -1284262979,
              "net_gex": -1041527398,
              "call_oi": 24035,
              "put_oi": 150112
            },
            {
              "strike": 6800.0,
              "call_gex": 737463803,
              "put_gex": -1966879850,
              "net_gex": -1229416047,
              "call_oi": 52782,
              "put_oi": 160496
            },
            {
              "strike": 6900.0,
              "call_gex": 884562113,
              "put_gex": -2319434700,
              "net_gex": -1434872587,
              "call_oi": 56040,
              "put_oi": 166691
            },
            {
              "strike": 7000.0,
              "call_gex": 23561756461,
              "put_gex": -26266670130,
              "net_gex": -2704913669,
              "call_oi": 1314630,
              "put_oi": 1471449
            },
            {
              "strike": 7100.0,
              "call_gex": 737537905,
              "put_gex": -3065374640,
              "net_gex": -2327836734,
              "call_oi": 33525,
              "put_oi": 137879
            },
            {
              "strike": 7150.0,
              "call_gex": 455020912,
              "put_gex": -1750598708,
              "net_gex": -1295577795,
              "call_oi": 18951,
              "put_oi": 72702
            },
            {
              "strike": 7200.0,
              "call_gex": 1506626192,
              "put_gex": -4301191965,
              "net_gex": -2794565774,
              "call_oi": 59889,
              "put_oi": 159315
            },
            {
              "strike": 7250.0,
              "call_gex": 584665334,
              "put_gex": -4109906021,
              "net_gex": -3525240687,
              "call_oi": 20593,
              "put_oi": 132713
            },
            {
              "strike": 7275.0,
              "call_gex": 214109382,
              "put_gex": -1276043350,
              "net_gex": -1061933968,
              "call_oi": 6251,
              "put_oi": 37907
            },
            {
              "strike": 7300.0,
              "call_gex": 1045249602,
              "put_gex": -5772403068,
              "net_gex": -4727153466,
              "call_oi": 33660,
              "put_oi": 165520
            },
            {
              "strike": 7350.0,
              "call_gex": 1194377168,
              "put_gex": -3930658814,
              "net_gex": -2736281645,
              "call_oi": 32645,
              "put_oi": 98733
            },
            {
              "strike": 7400.0,
              "call_gex": 3686139082,
              "put_gex": -8312821541,
              "net_gex": -4626682459,
              "call_oi": 89925,
              "put_oi": 194338
            },
            {
              "strike": 7425.0,
              "call_gex": 737315599,
              "put_gex": -1917767278,
              "net_gex": -1180451679,
              "call_oi": 16486,
              "put_oi": 40052
            },
            {
              "strike": 7450.0,
              "call_gex": 2472330071,
              "put_gex": -5538685138,
              "net_gex": -3066355067,
              "call_oi": 51509,
              "put_oi": 96526
            },
            {
              "strike": 7475.0,
              "call_gex": 1056051404,
              "put_gex": -2916389577,
              "net_gex": -1860338174,
              "call_oi": 21237,
              "put_oi": 47231
            },
            {
              "strike": 7500.0,
              "call_gex": 6029349146,
              "put_gex": -12217071517,
              "net_gex": -6187722371,
              "call_oi": 129058,
              "put_oi": 222600
            },
            {
              "strike": 7510.0,
              "call_gex": 402015131,
              "put_gex": -2065800414,
              "net_gex": -1663785282,
              "call_oi": 4003,
              "put_oi": 13799
            },
            {
              "strike": 7520.0,
              "call_gex": 607933384,
              "put_gex": -2364996073,
              "net_gex": -1757062688,
              "call_oi": 5466,
              "put_oi": 17024
            },
            {
              "strike": 7550.0,
              "call_gex": 3623397429,
              "put_gex": -4719914264,
              "net_gex": -1096516834,
              "call_oi": 53073,
              "put_oi": 77750
            },
            {
              "strike": 7575.0,
              "call_gex": 1002618111,
              "put_gex": -2125703387,
              "net_gex": -1123085276,
              "call_oi": 17752,
              "put_oi": 29029
            },
            {
              "strike": 7580.0,
              "call_gex": 720614132,
              "put_gex": -1797414116,
              "net_gex": -1076799983,
              "call_oi": 5818,
              "put_oi": 14707
            },
            {
              "strike": 7600.0,
              "call_gex": 7235958856,
              "put_gex": -10881113793,
              "net_gex": -3645154937,
              "call_oi": 134876,
              "put_oi": 182961
            },
            {
              "strike": 7700.0,
              "call_gex": 12928308887,
              "put_gex": -11844862518,
              "net_gex": 1083446369,
              "call_oi": 219233,
              "put_oi": 210450
            },
            {
              "strike": 7800.0,
              "call_gex": 7400613656,
              "put_gex": -5270566748,
              "net_gex": 2130046909,
              "call_oi": 165695,
              "put_oi": 123693
            },
            {
              "strike": 7850.0,
              "call_gex": 3988749136,
              "put_gex": -2360977460,
              "net_gex": 1627771676,
              "call_oi": 107409,
              "put_oi": 57007
            },
            {
              "strike": 7900.0,
              "call_gex": 3976761702,
              "put_gex": -1687030532,
              "net_gex": 2289731170,
              "call_oi": 121746,
              "put_oi": 51737
            },
            {
              "strike": 7950.0,
              "call_gex": 2047451601,
              "put_gex": -513977659,
              "net_gex": 1533473942,
              "call_oi": 73388,
              "put_oi": 17655
            },
            {
              "strike": 8000.0,
              "call_gex": 32567768669,
              "put_gex": -29806429123,
              "net_gex": 2761339545,
              "call_oi": 1224780,
              "put_oi": 1107539
            },
            {
              "strike": 8040.0,
              "call_gex": 1537703460,
              "put_gex": -36891431,
              "net_gex": 1500812029,
              "call_oi": 46755,
              "put_oi": 1120
            },
            {
              "strike": 8050.0,
              "call_gex": 2660714634,
              "put_gex": -234686957,
              "net_gex": 2426027678,
              "call_oi": 127704,
              "put_oi": 9521
            },
            {
              "strike": 8100.0,
              "call_gex": 4350971456,
              "put_gex": -546103757,
              "net_gex": 3804867699,
              "call_oi": 218995,
              "put_oi": 23177
            },
            {
              "strike": 8150.0,
              "call_gex": 2550063143,
              "put_gex": -221211780,
              "net_gex": 2328851363,
              "call_oi": 119812,
              "put_oi": 10685
            },
            {
              "strike": 8160.0,
              "call_gex": 1138076695,
              "put_gex": -4873636,
              "net_gex": 1133203059,
              "call_oi": 51124,
              "put_oi": 224
            },
            {
              "strike": 8200.0,
              "call_gex": 3515926627,
              "put_gex": -346586783,
              "net_gex": 3169339844,
              "call_oi": 189411,
              "put_oi": 18848
            },
            {
              "strike": 8250.0,
              "call_gex": 1539949323,
              "put_gex": -102580066,
              "net_gex": 1437369257,
              "call_oi": 88697,
              "put_oi": 5601
            },
            {
              "strike": 8300.0,
              "call_gex": 1716232448,
              "put_gex": -190391019,
              "net_gex": 1525841429,
              "call_oi": 120814,
              "put_oi": 10865
            },
            {
              "strike": 8400.0,
              "call_gex": 1728493490,
              "put_gex": -186566212,
              "net_gex": 1541927278,
              "call_oi": 128964,
              "put_oi": 10158
            },
            {
              "strike": 8500.0,
              "call_gex": 1554684234,
              "put_gex": -217814485,
              "net_gex": 1336869749,
              "call_oi": 152898,
              "put_oi": 13046
            }
          ],
          "flip": 7650.13,
          "flip_status": "ok",
          "flip_reason": null,
          "flip_roots": [
            7650.13
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
          "net_gex": -9747169714,
          "call_gex": 20900038599,
          "put_gex": -30647208313,
          "sign": "negative",
          "call_wall": {
            "strike": 7650.0,
            "gex": 1786925823
          },
          "put_wall": {
            "strike": 7510.0,
            "gex": -1813625369
          },
          "contracts_used": 2892,
          "expiries": 5,
          "oi_used": 1111549,
          "strikes_total": 340,
          "strikes_shown": 40,
          "strikes": [
            {
              "strike": 7200.0,
              "call_gex": 11622625,
              "put_gex": -208802533,
              "net_gex": -197179909,
              "call_oi": 639,
              "put_oi": 10599
            },
            {
              "strike": 7250.0,
              "call_gex": 4588628,
              "put_gex": -148739955,
              "net_gex": -144151327,
              "call_oi": 165,
              "put_oi": 5218
            },
            {
              "strike": 7300.0,
              "call_gex": 9285559,
              "put_gex": -270027944,
              "net_gex": -260742385,
              "call_oi": 243,
              "put_oi": 6647
            },
            {
              "strike": 7320.0,
              "call_gex": 25189004,
              "put_gex": -194649038,
              "net_gex": -169460034,
              "call_oi": 451,
              "put_oi": 3885
            },
            {
              "strike": 7325.0,
              "call_gex": 7262003,
              "put_gex": -189912206,
              "net_gex": -182650203,
              "call_oi": 164,
              "put_oi": 4423
            },
            {
              "strike": 7350.0,
              "call_gex": 150450003,
              "put_gex": -382742893,
              "net_gex": -232292890,
              "call_oi": 2529,
              "put_oi": 7059
            },
            {
              "strike": 7375.0,
              "call_gex": 106575877,
              "put_gex": -305785043,
              "net_gex": -199209165,
              "call_oi": 1592,
              "put_oi": 4835
            },
            {
              "strike": 7380.0,
              "call_gex": 40750438,
              "put_gex": -202013644,
              "net_gex": -161263205,
              "call_oi": 631,
              "put_oi": 3071
            },
            {
              "strike": 7390.0,
              "call_gex": 17744596,
              "put_gex": -217626380,
              "net_gex": -199881784,
              "call_oi": 251,
              "put_oi": 2965
            },
            {
              "strike": 7395.0,
              "call_gex": 23085645,
              "put_gex": -164472395,
              "net_gex": -141386750,
              "call_oi": 309,
              "put_oi": 2213
            },
            {
              "strike": 7400.0,
              "call_gex": 395573951,
              "put_gex": -954126856,
              "net_gex": -558552905,
              "call_oi": 5172,
              "put_oi": 12122
            },
            {
              "strike": 7405.0,
              "call_gex": 33243329,
              "put_gex": -262674739,
              "net_gex": -229431410,
              "call_oi": 432,
              "put_oi": 3234
            },
            {
              "strike": 7410.0,
              "call_gex": 96144586,
              "put_gex": -253970595,
              "net_gex": -157826009,
              "call_oi": 1192,
              "put_oi": 2968
            },
            {
              "strike": 7420.0,
              "call_gex": 56904690,
              "put_gex": -215511621,
              "net_gex": -158606931,
              "call_oi": 653,
              "put_oi": 2457
            },
            {
              "strike": 7425.0,
              "call_gex": 130670451,
              "put_gex": -399934573,
              "net_gex": -269264123,
              "call_oi": 1377,
              "put_oi": 4185
            },
            {
              "strike": 7430.0,
              "call_gex": 108365727,
              "put_gex": -285435474,
              "net_gex": -177069747,
              "call_oi": 1096,
              "put_oi": 2931
            },
            {
              "strike": 7435.0,
              "call_gex": 46045886,
              "put_gex": -313588561,
              "net_gex": -267542675,
              "call_oi": 450,
              "put_oi": 2994
            },
            {
              "strike": 7440.0,
              "call_gex": 51130428,
              "put_gex": -229363008,
              "net_gex": -178232579,
              "call_oi": 494,
              "put_oi": 2206
            },
            {
              "strike": 7450.0,
              "call_gex": 358386112,
              "put_gex": -1321086008,
              "net_gex": -962699896,
              "call_oi": 3112,
              "put_oi": 11766
            },
            {
              "strike": 7460.0,
              "call_gex": 105447246,
              "put_gex": -298249432,
              "net_gex": -192802186,
              "call_oi": 841,
              "put_oi": 2466
            },
            {
              "strike": 7465.0,
              "call_gex": 79608424,
              "put_gex": -230560041,
              "net_gex": -150951617,
              "call_oi": 630,
              "put_oi": 1764
            },
            {
              "strike": 7475.0,
              "call_gex": 287937844,
              "put_gex": -602187624,
              "net_gex": -314249779,
              "call_oi": 1943,
              "put_oi": 4534
            },
            {
              "strike": 7500.0,
              "call_gex": 700777578,
              "put_gex": -1291849891,
              "net_gex": -591072313,
              "call_oi": 4470,
              "put_oi": 8255
            },
            {
              "strike": 7510.0,
              "call_gex": 235684484,
              "put_gex": -1813625369,
              "net_gex": -1577940884,
              "call_oi": 1290,
              "put_oi": 10266
            },
            {
              "strike": 7520.0,
              "call_gex": 406888768,
              "put_gex": -1792301073,
              "net_gex": -1385412305,
              "call_oi": 2411,
              "put_oi": 9306
            },
            {
              "strike": 7525.0,
              "call_gex": 281017851,
              "put_gex": -457278175,
              "net_gex": -176260324,
              "call_oi": 1454,
              "put_oi": 2643
            },
            {
              "strike": 7530.0,
              "call_gex": 182570401,
              "put_gex": -327223342,
              "net_gex": -144652941,
              "call_oi": 975,
              "put_oi": 1785
            },
            {
              "strike": 7550.0,
              "call_gex": 1340700256,
              "put_gex": -816838521,
              "net_gex": 523861735,
              "call_oi": 6589,
              "put_oi": 4452
            },
            {
              "strike": 7570.0,
              "call_gex": 302917863,
              "put_gex": -480118713,
              "net_gex": -177200851,
              "call_oi": 1208,
              "put_oi": 2481
            },
            {
              "strike": 7575.0,
              "call_gex": 266015032,
              "put_gex": -581792454,
              "net_gex": -315777422,
              "call_oi": 1276,
              "put_oi": 3061
            },
            {
              "strike": 7580.0,
              "call_gex": 427660148,
              "put_gex": -707270060,
              "net_gex": -279609912,
              "call_oi": 2006,
              "put_oi": 3399
            },
            {
              "strike": 7590.0,
              "call_gex": 361549701,
              "put_gex": -205325436,
              "net_gex": 156224265,
              "call_oi": 1874,
              "put_oi": 1096
            },
            {
              "strike": 7600.0,
              "call_gex": 1303415514,
              "put_gex": -1044468680,
              "net_gex": 258946834,
              "call_oi": 7394,
              "put_oi": 5488
            },
            {
              "strike": 7625.0,
              "call_gex": 299298262,
              "put_gex": -702356522,
              "net_gex": -403058261,
              "call_oi": 1829,
              "put_oi": 4175
            },
            {
              "strike": 7630.0,
              "call_gex": 446681579,
              "put_gex": -268158292,
              "net_gex": 178523288,
              "call_oi": 2574,
              "put_oi": 1567
            },
            {
              "strike": 7635.0,
              "call_gex": 359110033,
              "put_gex": -168291502,
              "net_gex": 190818531,
              "call_oi": 2238,
              "put_oi": 977
            },
            {
              "strike": 7650.0,
              "call_gex": 1786925823,
              "put_gex": -910611840,
              "net_gex": 876313982,
              "call_oi": 12503,
              "put_oi": 6471
            },
            {
              "strike": 7700.0,
              "call_gex": 871200939,
              "put_gex": -551684213,
              "net_gex": 319516727,
              "call_oi": 9758,
              "put_oi": 6144
            },
            {
              "strike": 7750.0,
              "call_gex": 310709981,
              "put_gex": -166649856,
              "net_gex": 144060125,
              "call_oi": 7063,
              "put_oi": 3913
            },
            {
              "strike": 7850.0,
              "call_gex": 177502959,
              "put_gex": -14689310,
              "net_gex": 162813649,
              "call_oi": 16752,
              "put_oi": 1720
            }
          ],
          "flip": 7628.95,
          "flip_status": "ok",
          "flip_reason": null,
          "flip_roots": [
            7628.95
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
          "net_gex": -37406542653,
          "call_gex": 63423705413,
          "put_gex": -100830248066,
          "sign": "negative",
          "call_wall": {
            "strike": 7700.0,
            "gex": 4840609436
          },
          "put_wall": {
            "strike": 7500.0,
            "gex": -6702064840
          },
          "contracts_used": 12278,
          "expiries": 21,
          "oi_used": 5096138,
          "strikes_total": 608,
          "strikes_shown": 40,
          "strikes": [
            {
              "strike": 6400.0,
              "call_gex": 5859764,
              "put_gex": -806538333,
              "net_gex": -800678569,
              "call_oi": 1029,
              "put_oi": 216860
            },
            {
              "strike": 6500.0,
              "call_gex": 18365913,
              "put_gex": -968730664,
              "net_gex": -950364751,
              "call_oi": 3223,
              "put_oi": 179024
            },
            {
              "strike": 7000.0,
              "call_gex": 1783329022,
              "put_gex": -2834216081,
              "net_gex": -1050887059,
              "call_oi": 106396,
              "put_oi": 167639
            },
            {
              "strike": 7100.0,
              "call_gex": 35751399,
              "put_gex": -1104884668,
              "net_gex": -1069133269,
              "call_oi": 1630,
              "put_oi": 50312
            },
            {
              "strike": 7200.0,
              "call_gex": 152581863,
              "put_gex": -1458140637,
              "net_gex": -1305558774,
              "call_oi": 4762,
              "put_oi": 47202
            },
            {
              "strike": 7250.0,
              "call_gex": 125608709,
              "put_gex": -1070336003,
              "net_gex": -944727294,
              "call_oi": 3198,
              "put_oi": 28315
            },
            {
              "strike": 7275.0,
              "call_gex": 45846381,
              "put_gex": -598157611,
              "net_gex": -552311230,
              "call_oi": 1018,
              "put_oi": 13910
            },
            {
              "strike": 7300.0,
              "call_gex": 270860167,
              "put_gex": -2156985861,
              "net_gex": -1886125694,
              "call_oi": 5400,
              "put_oi": 44903
            },
            {
              "strike": 7325.0,
              "call_gex": 65511930,
              "put_gex": -589989283,
              "net_gex": -524477353,
              "call_oi": 1231,
              "put_oi": 11756
            },
            {
              "strike": 7350.0,
              "call_gex": 332609992,
              "put_gex": -1865439816,
              "net_gex": -1532829824,
              "call_oi": 5495,
              "put_oi": 31966
            },
            {
              "strike": 7375.0,
              "call_gex": 275984610,
              "put_gex": -837518698,
              "net_gex": -561534088,
              "call_oi": 4278,
              "put_oi": 13028
            },
            {
              "strike": 7380.0,
              "call_gex": 114966512,
              "put_gex": -574444949,
              "net_gex": -459478437,
              "call_oi": 1792,
              "put_oi": 8991
            },
            {
              "strike": 7400.0,
              "call_gex": 1359995295,
              "put_gex": -3903657159,
              "net_gex": -2543661864,
              "call_oi": 18535,
              "put_oi": 54396
            },
            {
              "strike": 7425.0,
              "call_gex": 309763754,
              "put_gex": -983243270,
              "net_gex": -673479515,
              "call_oi": 3879,
              "put_oi": 12045
            },
            {
              "strike": 7430.0,
              "call_gex": 209862763,
              "put_gex": -793120158,
              "net_gex": -583257395,
              "call_oi": 2415,
              "put_oi": 9876
            },
            {
              "strike": 7450.0,
              "call_gex": 941426901,
              "put_gex": -3361794321,
              "net_gex": -2420367420,
              "call_oi": 10390,
              "put_oi": 37808
            },
            {
              "strike": 7470.0,
              "call_gex": 152969474,
              "put_gex": -974732932,
              "net_gex": -821763458,
              "call_oi": 1429,
              "put_oi": 10602
            },
            {
              "strike": 7475.0,
              "call_gex": 533249898,
              "put_gex": -2042988376,
              "net_gex": -1509738479,
              "call_oi": 4876,
              "put_oi": 20836
            },
            {
              "strike": 7500.0,
              "call_gex": 2408910099,
              "put_gex": -6702064840,
              "net_gex": -4293154741,
              "call_oi": 22713,
              "put_oi": 66191
            },
            {
              "strike": 7510.0,
              "call_gex": 320713760,
              "put_gex": -1973896746,
              "net_gex": -1653182986,
              "call_oi": 2248,
              "put_oi": 11989
            },
            {
              "strike": 7520.0,
              "call_gex": 514667379,
              "put_gex": -2204223081,
              "net_gex": -1689555702,
              "call_oi": 3554,
              "put_oi": 13788
            },
            {
              "strike": 7525.0,
              "call_gex": 472725607,
              "put_gex": -1008443674,
              "net_gex": -535718067,
              "call_oi": 3444,
              "put_oi": 8410
            },
            {
              "strike": 7530.0,
              "call_gex": 229670816,
              "put_gex": -706215530,
              "net_gex": -476544714,
              "call_oi": 1506,
              "put_oi": 5610
            },
            {
              "strike": 7575.0,
              "call_gex": 453196861,
              "put_gex": -1328353711,
              "net_gex": -875156850,
              "call_oi": 3155,
              "put_oi": 10422
            },
            {
              "strike": 7580.0,
              "call_gex": 622052679,
              "put_gex": -1640591334,
              "net_gex": -1018538656,
              "call_oi": 4024,
              "put_oi": 11662
            },
            {
              "strike": 7600.0,
              "call_gex": 2894814474,
              "put_gex": -5174336659,
              "net_gex": -2279522185,
              "call_oi": 22735,
              "put_oi": 44305
            },
            {
              "strike": 7625.0,
              "call_gex": 808801296,
              "put_gex": -1383941664,
              "net_gex": -575140368,
              "call_oi": 6827,
              "put_oi": 11006
            },
            {
              "strike": 7650.0,
              "call_gex": 3411693515,
              "put_gex": -2859182779,
              "net_gex": 552510736,
              "call_oi": 28725,
              "put_oi": 25692
            },
            {
              "strike": 7700.0,
              "call_gex": 4840609436,
              "put_gex": -3749741459,
              "net_gex": 1090867976,
              "call_oi": 51794,
              "put_oi": 40183
            },
            {
              "strike": 7710.0,
              "call_gex": 799116725,
              "put_gex": -296932696,
              "net_gex": 502184030,
              "call_oi": 9509,
              "put_oi": 3637
            },
            {
              "strike": 7725.0,
              "call_gex": 1286018628,
              "put_gex": -1987571428,
              "net_gex": -701552800,
              "call_oi": 16486,
              "put_oi": 25593
            },
            {
              "strike": 7750.0,
              "call_gex": 2554366763,
              "put_gex": -1732158693,
              "net_gex": 822208071,
              "call_oi": 37420,
              "put_oi": 25113
            },
            {
              "strike": 7800.0,
              "call_gex": 2488045410,
              "put_gex": -1242269906,
              "net_gex": 1245775504,
              "call_oi": 48571,
              "put_oi": 23805
            },
            {
              "strike": 7825.0,
              "call_gex": 864953565,
              "put_gex": -141985267,
              "net_gex": 722968298,
              "call_oi": 21706,
              "put_oi": 3392
            },
            {
              "strike": 7830.0,
              "call_gex": 536384985,
              "put_gex": -56140868,
              "net_gex": 480244117,
              "call_oi": 12854,
              "put_oi": 1551
            },
            {
              "strike": 7850.0,
              "call_gex": 1132610243,
              "put_gex": -225692105,
              "net_gex": 906918137,
              "call_oi": 41865,
              "put_oi": 7559
            },
            {
              "strike": 7900.0,
              "call_gex": 872038863,
              "put_gex": -133053117,
              "net_gex": 738985746,
              "call_oi": 38393,
              "put_oi": 5600
            },
            {
              "strike": 8000.0,
              "call_gex": 1631892891,
              "put_gex": -1081588117,
              "net_gex": 550304774,
              "call_oi": 139443,
              "put_oi": 94557
            },
            {
              "strike": 8050.0,
              "call_gex": 462123311,
              "put_gex": -7033997,
              "net_gex": 455089314,
              "call_oi": 50540,
              "put_oi": 742
            },
            {
              "strike": 8100.0,
              "call_gex": 523496925,
              "put_gex": -2251563,
              "net_gex": 521245362,
              "call_oi": 63845,
              "put_oi": 383
            }
          ],
          "flip": 7669.64,
          "flip_status": "ok",
          "flip_reason": null,
          "flip_roots": [
            7669.64
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
        "options_in_file": 31584,
        "unique_kept": 31584,
        "duplicates": 0,
        "unparsed": 0,
        "expired": 574,
        "invalid_gamma_or_oi": 0,
        "used": 31010,
        "roots": {
          "SPX": 10022,
          "SPXO": 568,
          "SPXW": 20994
        },
        "rejected_roots": {},
        "iv_invalid_for_flip": 542,
        "expiry_min": "2026-11-10",
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
      "last_attempt": "2026-11-10 14:20",
      "last_success": "2026-11-10 14:20",
      "computed_at": "2026-11-10 14:20",
      "quote_timestamp_utc": "2026-11-10 06:12:21",
      "quote_timestamp_zone": "UTC",
      "quote_timestamp_basis": "与 HTTP Last-Modified（GMT）一致，按 UTC",
      "quote_timestamp_checked": true,
      "quote_timestamp_et": "2026-11-10 01:12:21",
      "last_trade_time": "2026-11-09T16:14:59",
      "last_trade_zone": "America/New_York",
      "session_date": "2026-11-09",
      "is_daily_close": true,
      "expected_session": "2026-11-09",
      "chain_behind": false,
      "spot": 27907.625,
      "security_type": "index",
      "source_symbol": "^NDX",
      "chain_symbol": "_NDX",
      "source_url": "https://cdn.cboe.com/api/global/delayed_quotes/options/_NDX.json",
      "http_status": 200,
      "content_length": 8131549,
      "last_modified": "Tue, 10 Nov 2026 06:12:23 GMT",
      "final_url": "https://cdn-api.cboe.com/api/global/delayed_quotes/options/_NDX.json",
      "delay_note": "来源是 CBOE 公开延迟行情，大约 15 分钟，不是即时成交。",
      "assumption": "做市商多看涨、空看跌",
      "formula": "sign × gamma × open_interest × 100 × spot² × 0.01",
      "windows": {
        "all": {
          "label": "全部到期",
          "dte_max": null,
          "net_gex": -1082892925,
          "call_gex": 4979407098,
          "put_gex": -6062300023,
          "sign": "negative",
          "call_wall": {
            "strike": 29000.0,
            "gex": 418935633
          },
          "put_wall": {
            "strike": 28000.0,
            "gex": -658816977
          },
          "contracts_used": 17594,
          "expiries": 43,
          "oi_used": 189384,
          "strikes_total": 719,
          "strikes_shown": 40,
          "strikes": [
            {
              "strike": 25000.0,
              "call_gex": 11994067,
              "put_gex": -244554357,
              "net_gex": -232560290,
              "call_oi": 201,
              "put_oi": 4013
            },
            {
              "strike": 25200.0,
              "call_gex": 1791322,
              "put_gex": -37228338,
              "net_gex": -35437017,
              "call_oi": 24,
              "put_oi": 588
            },
            {
              "strike": 25500.0,
              "call_gex": 8177773,
              "put_gex": -89643970,
              "net_gex": -81466197,
              "call_oi": 115,
              "put_oi": 1288
            },
            {
              "strike": 26000.0,
              "call_gex": 14797875,
              "put_gex": -147745101,
              "net_gex": -132947226,
              "call_oi": 203,
              "put_oi": 2218
            },
            {
              "strike": 26200.0,
              "call_gex": 2180739,
              "put_gex": -39097544,
              "net_gex": -36916804,
              "call_oi": 28,
              "put_oi": 562
            },
            {
              "strike": 26400.0,
              "call_gex": 2258623,
              "put_gex": -34268763,
              "net_gex": -32010140,
              "call_oi": 29,
              "put_oi": 468
            },
            {
              "strike": 26500.0,
              "call_gex": 11293115,
              "put_gex": -136374102,
              "net_gex": -125080987,
              "call_oi": 155,
              "put_oi": 1889
            },
            {
              "strike": 26600.0,
              "call_gex": 4595130,
              "put_gex": -75469163,
              "net_gex": -70874034,
              "call_oi": 48,
              "put_oi": 838
            },
            {
              "strike": 26700.0,
              "call_gex": 50157008,
              "put_gex": -86139210,
              "net_gex": -35982202,
              "call_oi": 462,
              "put_oi": 760
            },
            {
              "strike": 26800.0,
              "call_gex": 35359133,
              "put_gex": -96186188,
              "net_gex": -60827055,
              "call_oi": 448,
              "put_oi": 1073
            },
            {
              "strike": 27000.0,
              "call_gex": 91824709,
              "put_gex": -617460811,
              "net_gex": -525636101,
              "call_oi": 1108,
              "put_oi": 6266
            },
            {
              "strike": 27400.0,
              "call_gex": 11293115,
              "put_gex": -79986409,
              "net_gex": -68693294,
              "call_oi": 99,
              "put_oi": 532
            },
            {
              "strike": 27500.0,
              "call_gex": 99613065,
              "put_gex": -228120928,
              "net_gex": -128507863,
              "call_oi": 687,
              "put_oi": 1486
            },
            {
              "strike": 27600.0,
              "call_gex": 20950676,
              "put_gex": -61450124,
              "net_gex": -40499448,
              "call_oi": 146,
              "put_oi": 491
            },
            {
              "strike": 27800.0,
              "call_gex": 28115963,
              "put_gex": -95173702,
              "net_gex": -67057739,
              "call_oi": 160,
              "put_oi": 643
            },
            {
              "strike": 27975.0,
              "call_gex": 2881691,
              "put_gex": -28816915,
              "net_gex": -25935223,
              "call_oi": 8,
              "put_oi": 56
            },
            {
              "strike": 28000.0,
              "call_gex": 276175080,
              "put_gex": -658816977,
              "net_gex": -382641897,
              "call_oi": 2199,
              "put_oi": 4878
            },
            {
              "strike": 28200.0,
              "call_gex": 65577952,
              "put_gex": -97510209,
              "net_gex": -31932257,
              "call_oi": 363,
              "put_oi": 548
            },
            {
              "strike": 28500.0,
              "call_gex": 97042907,
              "put_gex": -233884311,
              "net_gex": -136841403,
              "call_oi": 610,
              "put_oi": 1551
            },
            {
              "strike": 28700.0,
              "call_gex": 99768832,
              "put_gex": -20405491,
              "net_gex": 79363341,
              "call_oi": 481,
              "put_oi": 113
            },
            {
              "strike": 28800.0,
              "call_gex": 78740272,
              "put_gex": -43536906,
              "net_gex": 35203366,
              "call_oi": 788,
              "put_oi": 265
            },
            {
              "strike": 29000.0,
              "call_gex": 418935633,
              "put_gex": -346270278,
              "net_gex": 72665355,
              "call_oi": 2903,
              "put_oi": 3053
            },
            {
              "strike": 29025.0,
              "call_gex": 28349613,
              "put_gex": -5296082,
              "net_gex": 23053532,
              "call_oi": 184,
              "put_oi": 34
            },
            {
              "strike": 29400.0,
              "call_gex": 85516142,
              "put_gex": -57322295,
              "net_gex": 28193846,
              "call_oi": 574,
              "put_oi": 515
            },
            {
              "strike": 29500.0,
              "call_gex": 130922253,
              "put_gex": -97743859,
              "net_gex": 33178394,
              "call_oi": 1149,
              "put_oi": 1080
            },
            {
              "strike": 29625.0,
              "call_gex": 108413906,
              "put_gex": -623068,
              "net_gex": 107790838,
              "call_oi": 1401,
              "put_oi": 10
            },
            {
              "strike": 29650.0,
              "call_gex": 29206332,
              "put_gex": -6230684,
              "net_gex": 22975648,
              "call_oi": 387,
              "put_oi": 84
            },
            {
              "strike": 29675.0,
              "call_gex": 276642381,
              "put_gex": -3037459,
              "net_gex": 273604923,
              "call_oi": 3557,
              "put_oi": 40
            },
            {
              "strike": 30200.0,
              "call_gex": 22819881,
              "put_gex": -46418598,
              "net_gex": -23598717,
              "call_oi": 537,
              "put_oi": 677
            },
            {
              "strike": 30300.0,
              "call_gex": 18146868,
              "put_gex": -54830022,
              "net_gex": -36683154,
              "call_oi": 362,
              "put_oi": 758
            },
            {
              "strike": 30500.0,
              "call_gex": 198758828,
              "put_gex": -57633829,
              "net_gex": 141124999,
              "call_oi": 2843,
              "put_oi": 782
            },
            {
              "strike": 30600.0,
              "call_gex": 41356167,
              "put_gex": -14252690,
              "net_gex": 27103477,
              "call_oi": 678,
              "put_oi": 204
            },
            {
              "strike": 30900.0,
              "call_gex": 61060706,
              "put_gex": -31231305,
              "net_gex": 29829401,
              "call_oi": 881,
              "put_oi": 465
            },
            {
              "strike": 31000.0,
              "call_gex": 220721990,
              "put_gex": -74612444,
              "net_gex": 146109546,
              "call_oi": 3542,
              "put_oi": 1251
            },
            {
              "strike": 31200.0,
              "call_gex": 38240825,
              "put_gex": -11215232,
              "net_gex": 27025593,
              "call_oi": 673,
              "put_oi": 231
            },
            {
              "strike": 31500.0,
              "call_gex": 151016210,
              "put_gex": -26480408,
              "net_gex": 124535802,
              "call_oi": 2900,
              "put_oi": 648
            },
            {
              "strike": 31600.0,
              "call_gex": 33256277,
              "put_gex": -9735444,
              "net_gex": 23520833,
              "call_oi": 612,
              "put_oi": 200
            },
            {
              "strike": 32000.0,
              "call_gex": 89877621,
              "put_gex": -35203366,
              "net_gex": 54674254,
              "call_oi": 2823,
              "put_oi": 665
            },
            {
              "strike": 32500.0,
              "call_gex": 34969715,
              "put_gex": -3271109,
              "net_gex": 31698606,
              "call_oi": 1361,
              "put_oi": 154
            },
            {
              "strike": 33000.0,
              "call_gex": 47508968,
              "put_gex": -21963162,
              "net_gex": 25545805,
              "call_oi": 2002,
              "put_oi": 383
            }
          ],
          "flip": 28407.28,
          "flip_status": "ok",
          "flip_reason": null,
          "flip_roots": [
            28407.28
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
          "net_gex": -135283732,
          "call_gex": 450322705,
          "put_gex": -585606437,
          "sign": "negative",
          "call_wall": {
            "strike": 28000.0,
            "gex": 29829401
          },
          "put_wall": {
            "strike": 28000.0,
            "gex": -55297323
          },
          "contracts_used": 4936,
          "expiries": 5,
          "oi_used": 11534,
          "strikes_total": 548,
          "strikes_shown": 40,
          "strikes": [
            {
              "strike": 26000.0,
              "call_gex": 233651,
              "put_gex": -5841266,
              "net_gex": -5607616,
              "call_oi": 3,
              "put_oi": 169
            },
            {
              "strike": 26200.0,
              "call_gex": 0,
              "put_gex": -4750897,
              "net_gex": -4750897,
              "call_oi": 0,
              "put_oi": 89
            },
            {
              "strike": 26400.0,
              "call_gex": 0,
              "put_gex": -3894178,
              "net_gex": -3894178,
              "call_oi": 0,
              "put_oi": 59
            },
            {
              "strike": 26500.0,
              "call_gex": 0,
              "put_gex": -7009520,
              "net_gex": -7009520,
              "call_oi": 0,
              "put_oi": 73
            },
            {
              "strike": 26600.0,
              "call_gex": 2102856,
              "put_gex": -12850786,
              "net_gex": -10747930,
              "call_oi": 16,
              "put_oi": 115
            },
            {
              "strike": 26750.0,
              "call_gex": 778836,
              "put_gex": -7165287,
              "net_gex": -6386451,
              "call_oi": 5,
              "put_oi": 48
            },
            {
              "strike": 26800.0,
              "call_gex": 1012486,
              "put_gex": -12461369,
              "net_gex": -11448882,
              "call_oi": 7,
              "put_oi": 89
            },
            {
              "strike": 26900.0,
              "call_gex": 1479788,
              "put_gex": -8411424,
              "net_gex": -6931636,
              "call_oi": 10,
              "put_oi": 70
            },
            {
              "strike": 27000.0,
              "call_gex": 3894178,
              "put_gex": -16355546,
              "net_gex": -12461369,
              "call_oi": 24,
              "put_oi": 101
            },
            {
              "strike": 27100.0,
              "call_gex": 3037459,
              "put_gex": -9423910,
              "net_gex": -6386451,
              "call_oi": 15,
              "put_oi": 42
            },
            {
              "strike": 27200.0,
              "call_gex": 3271109,
              "put_gex": -13318088,
              "net_gex": -10046978,
              "call_oi": 14,
              "put_oi": 57
            },
            {
              "strike": 27250.0,
              "call_gex": 5296082,
              "put_gex": -10124862,
              "net_gex": -4828780,
              "call_oi": 21,
              "put_oi": 43
            },
            {
              "strike": 27300.0,
              "call_gex": 4906664,
              "put_gex": -11215232,
              "net_gex": -6308568,
              "call_oi": 18,
              "put_oi": 46
            },
            {
              "strike": 27400.0,
              "call_gex": 1635555,
              "put_gex": -13162321,
              "net_gex": -11526766,
              "call_oi": 5,
              "put_oi": 41
            },
            {
              "strike": 27450.0,
              "call_gex": 311534,
              "put_gex": -5373965,
              "net_gex": -5062431,
              "call_oi": 1,
              "put_oi": 15
            },
            {
              "strike": 27500.0,
              "call_gex": 11137348,
              "put_gex": -21495861,
              "net_gex": -10358513,
              "call_oi": 33,
              "put_oi": 57
            },
            {
              "strike": 27525.0,
              "call_gex": 778836,
              "put_gex": -8800842,
              "net_gex": -8022006,
              "call_oi": 2,
              "put_oi": 19
            },
            {
              "strike": 27600.0,
              "call_gex": 2648041,
              "put_gex": -13006553,
              "net_gex": -10358513,
              "call_oi": 7,
              "put_oi": 34
            },
            {
              "strike": 27700.0,
              "call_gex": 3037459,
              "put_gex": -15966128,
              "net_gex": -12928670,
              "call_oi": 8,
              "put_oi": 35
            },
            {
              "strike": 27750.0,
              "call_gex": 6542218,
              "put_gex": -778836,
              "net_gex": 5763383,
              "call_oi": 20,
              "put_oi": 2
            },
            {
              "strike": 27775.0,
              "call_gex": 1557671,
              "put_gex": -12383485,
              "net_gex": -10825814,
              "call_oi": 4,
              "put_oi": 23
            },
            {
              "strike": 27800.0,
              "call_gex": 5685499,
              "put_gex": -17835334,
              "net_gex": -12149834,
              "call_oi": 14,
              "put_oi": 39
            },
            {
              "strike": 27950.0,
              "call_gex": 2959575,
              "put_gex": -6308568,
              "net_gex": -3348993,
              "call_oi": 6,
              "put_oi": 13
            },
            {
              "strike": 27975.0,
              "call_gex": 1791322,
              "put_gex": -24922737,
              "net_gex": -23131415,
              "call_oi": 3,
              "put_oi": 36
            },
            {
              "strike": 28000.0,
              "call_gex": 29829401,
              "put_gex": -55297323,
              "net_gex": -25467922,
              "call_oi": 68,
              "put_oi": 108
            },
            {
              "strike": 28150.0,
              "call_gex": 2648041,
              "put_gex": -6386451,
              "net_gex": -3738411,
              "call_oi": 6,
              "put_oi": 14
            },
            {
              "strike": 28200.0,
              "call_gex": 14019040,
              "put_gex": -23910251,
              "net_gex": -9891211,
              "call_oi": 28,
              "put_oi": 51
            },
            {
              "strike": 28225.0,
              "call_gex": 2414390,
              "put_gex": -8956609,
              "net_gex": -6542218,
              "call_oi": 5,
              "put_oi": 17
            },
            {
              "strike": 28250.0,
              "call_gex": 19081471,
              "put_gex": -6074917,
              "net_gex": 13006553,
              "call_oi": 45,
              "put_oi": 13
            },
            {
              "strike": 28500.0,
              "call_gex": 25467922,
              "put_gex": -16744964,
              "net_gex": 8722958,
              "call_oi": 87,
              "put_oi": 55
            },
            {
              "strike": 28700.0,
              "call_gex": 8022006,
              "put_gex": -1401904,
              "net_gex": 6620102,
              "call_oi": 40,
              "put_oi": 8
            },
            {
              "strike": 28725.0,
              "call_gex": 4595130,
              "put_gex": -233651,
              "net_gex": 4361479,
              "call_oi": 22,
              "put_oi": 1
            },
            {
              "strike": 28750.0,
              "call_gex": 4828780,
              "put_gex": -934603,
              "net_gex": 3894178,
              "call_oi": 23,
              "put_oi": 4
            },
            {
              "strike": 28800.0,
              "call_gex": 8645074,
              "put_gex": -5451849,
              "net_gex": 3193226,
              "call_oi": 42,
              "put_oi": 26
            },
            {
              "strike": 28825.0,
              "call_gex": 4127828,
              "put_gex": -467301,
              "net_gex": 3660527,
              "call_oi": 20,
              "put_oi": 4
            },
            {
              "strike": 29000.0,
              "call_gex": 17757450,
              "put_gex": -3426876,
              "net_gex": 14330574,
              "call_oi": 143,
              "put_oi": 33
            },
            {
              "strike": 29025.0,
              "call_gex": 4049945,
              "put_gex": 0,
              "net_gex": 4049945,
              "call_oi": 28,
              "put_oi": 0
            },
            {
              "strike": 29200.0,
              "call_gex": 12850786,
              "put_gex": -1557671,
              "net_gex": 11293115,
              "call_oi": 166,
              "put_oi": 27
            },
            {
              "strike": 29400.0,
              "call_gex": 467301,
              "put_gex": -4750897,
              "net_gex": -4283595,
              "call_oi": 12,
              "put_oi": 69
            },
            {
              "strike": 29450.0,
              "call_gex": 4595130,
              "put_gex": -155767,
              "net_gex": 4439363,
              "call_oi": 61,
              "put_oi": 10
            }
          ],
          "flip": 28127.22,
          "flip_status": "ok",
          "flip_reason": null,
          "flip_roots": [
            28127.22
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
          "net_gex": -583970883,
          "call_gex": 1901215420,
          "put_gex": -2485186303,
          "sign": "negative",
          "call_wall": {
            "strike": 29675.0,
            "gex": 273916457
          },
          "put_wall": {
            "strike": 28000.0,
            "gex": -393000410
          },
          "contracts_used": 12096,
          "expiries": 21,
          "oi_used": 56424,
          "strikes_total": 622,
          "strikes_shown": 40,
          "strikes": [
            {
              "strike": 25000.0,
              "call_gex": 778836,
              "put_gex": -25078504,
              "net_gex": -24299669,
              "call_oi": 11,
              "put_oi": 478
            },
            {
              "strike": 25500.0,
              "call_gex": 1168253,
              "put_gex": -12227718,
              "net_gex": -11059465,
              "call_oi": 15,
              "put_oi": 252
            },
            {
              "strike": 25600.0,
              "call_gex": 545185,
              "put_gex": -14875759,
              "net_gex": -14330574,
              "call_oi": 7,
              "put_oi": 331
            },
            {
              "strike": 25700.0,
              "call_gex": 155767,
              "put_gex": -14019040,
              "net_gex": -13863272,
              "call_oi": 2,
              "put_oi": 183
            },
            {
              "strike": 26000.0,
              "call_gex": 1090370,
              "put_gex": -26480408,
              "net_gex": -25390038,
              "call_oi": 14,
              "put_oi": 434
            },
            {
              "strike": 26200.0,
              "call_gex": 155767,
              "put_gex": -20483375,
              "net_gex": -20327607,
              "call_oi": 2,
              "put_oi": 291
            },
            {
              "strike": 26400.0,
              "call_gex": 77884,
              "put_gex": -14564224,
              "net_gex": -14486341,
              "call_oi": 1,
              "put_oi": 196
            },
            {
              "strike": 26500.0,
              "call_gex": 0,
              "put_gex": -28739031,
              "net_gex": -28739031,
              "call_oi": 0,
              "put_oi": 225
            },
            {
              "strike": 26600.0,
              "call_gex": 2102856,
              "put_gex": -31854373,
              "net_gex": -29751517,
              "call_oi": 16,
              "put_oi": 246
            },
            {
              "strike": 26700.0,
              "call_gex": 28427497,
              "put_gex": -54129070,
              "net_gex": -25701573,
              "call_oi": 183,
              "put_oi": 349
            },
            {
              "strike": 26800.0,
              "call_gex": 1012486,
              "put_gex": -27103477,
              "net_gex": -26090990,
              "call_oi": 7,
              "put_oi": 183
            },
            {
              "strike": 26900.0,
              "call_gex": 2414390,
              "put_gex": -13240204,
              "net_gex": -10825814,
              "call_oi": 16,
              "put_oi": 101
            },
            {
              "strike": 26950.0,
              "call_gex": 778836,
              "put_gex": -11838300,
              "net_gex": -11059465,
              "call_oi": 5,
              "put_oi": 76
            },
            {
              "strike": 27000.0,
              "call_gex": 11994067,
              "put_gex": -265738684,
              "net_gex": -253744617,
              "call_oi": 76,
              "put_oi": 1702
            },
            {
              "strike": 27100.0,
              "call_gex": 5373965,
              "put_gex": -20794909,
              "net_gex": -15420944,
              "call_oi": 30,
              "put_oi": 115
            },
            {
              "strike": 27200.0,
              "call_gex": 71964403,
              "put_gex": -35437017,
              "net_gex": 36527387,
              "call_oi": 455,
              "put_oi": 198
            },
            {
              "strike": 27400.0,
              "call_gex": 5140315,
              "put_gex": -49378173,
              "net_gex": -44237858,
              "call_oi": 24,
              "put_oi": 225
            },
            {
              "strike": 27500.0,
              "call_gex": 78195088,
              "put_gex": -143149971,
              "net_gex": -64954883,
              "call_oi": 447,
              "put_oi": 590
            },
            {
              "strike": 27600.0,
              "call_gex": 13785389,
              "put_gex": -42913838,
              "net_gex": -29128449,
              "call_oi": 62,
              "put_oi": 186
            },
            {
              "strike": 27775.0,
              "call_gex": 1791322,
              "put_gex": -13941156,
              "net_gex": -12149834,
              "call_oi": 5,
              "put_oi": 31
            },
            {
              "strike": 27800.0,
              "call_gex": 18068984,
              "put_gex": -53038700,
              "net_gex": -34969715,
              "call_oi": 80,
              "put_oi": 211
            },
            {
              "strike": 27975.0,
              "call_gex": 2570157,
              "put_gex": -28427497,
              "net_gex": -25857340,
              "call_oi": 6,
              "put_oi": 51
            },
            {
              "strike": 28000.0,
              "call_gex": 84114238,
              "put_gex": -393000410,
              "net_gex": -308886172,
              "call_oi": 309,
              "put_oi": 1997
            },
            {
              "strike": 28200.0,
              "call_gex": 54596371,
              "put_gex": -76637416,
              "net_gex": -22041046,
              "call_oi": 263,
              "put_oi": 345
            },
            {
              "strike": 28225.0,
              "call_gex": 3115342,
              "put_gex": -15732478,
              "net_gex": -12617136,
              "call_oi": 8,
              "put_oi": 46
            },
            {
              "strike": 28325.0,
              "call_gex": 19081471,
              "put_gex": -2570157,
              "net_gex": 16511313,
              "call_oi": 79,
              "put_oi": 8
            },
            {
              "strike": 28425.0,
              "call_gex": 23754484,
              "put_gex": -7243170,
              "net_gex": 16511313,
              "call_oi": 76,
              "put_oi": 30
            },
            {
              "strike": 28600.0,
              "call_gex": 34736065,
              "put_gex": -17601683,
              "net_gex": 17134382,
              "call_oi": 157,
              "put_oi": 81
            },
            {
              "strike": 28700.0,
              "call_gex": 93538148,
              "put_gex": -12305601,
              "net_gex": 81232546,
              "call_oi": 440,
              "put_oi": 61
            },
            {
              "strike": 28900.0,
              "call_gex": 7321054,
              "put_gex": -18692053,
              "net_gex": -11370999,
              "call_oi": 53,
              "put_oi": 120
            },
            {
              "strike": 29100.0,
              "call_gex": 51792563,
              "put_gex": -36683154,
              "net_gex": 15109409,
              "call_oi": 344,
              "put_oi": 240
            },
            {
              "strike": 29200.0,
              "call_gex": 28115963,
              "put_gex": -69316362,
              "net_gex": -41200400,
              "call_oi": 264,
              "put_oi": 462
            },
            {
              "strike": 29375.0,
              "call_gex": 22041046,
              "put_gex": -623068,
              "net_gex": 21417977,
              "call_oi": 148,
              "put_oi": 7
            },
            {
              "strike": 29400.0,
              "call_gex": 74690328,
              "put_gex": -23287182,
              "net_gex": 51403145,
              "call_oi": 490,
              "put_oi": 189
            },
            {
              "strike": 29500.0,
              "call_gex": 53116583,
              "put_gex": -19159354,
              "net_gex": 33957229,
              "call_oi": 440,
              "put_oi": 294
            },
            {
              "strike": 29650.0,
              "call_gex": 24066018,
              "put_gex": -1401904,
              "net_gex": 22664114,
              "call_oi": 321,
              "put_oi": 22
            },
            {
              "strike": 29675.0,
              "call_gex": 273916457,
              "put_gex": -545185,
              "net_gex": 273371272,
              "call_oi": 3522,
              "put_oi": 8
            },
            {
              "strike": 30200.0,
              "call_gex": 778836,
              "put_gex": -27337127,
              "net_gex": -26558292,
              "call_oi": 254,
              "put_oi": 432
            },
            {
              "strike": 30300.0,
              "call_gex": 11760417,
              "put_gex": -545185,
              "net_gex": 11215232,
              "call_oi": 280,
              "put_oi": 61
            },
            {
              "strike": 30600.0,
              "call_gex": 17757450,
              "put_gex": 0,
              "net_gex": 17757450,
              "call_oi": 375,
              "put_oi": 21
            }
          ],
          "flip": 28256.95,
          "flip_status": "ok",
          "flip_reason": null,
          "flip_roots": [
            28256.95
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
        "options_in_file": 18668,
        "unique_kept": 18668,
        "duplicates": 0,
        "unparsed": 0,
        "expired": 1074,
        "invalid_gamma_or_oi": 0,
        "used": 17594,
        "roots": {
          "NDX": 4148,
          "NDXP": 14520
        },
        "rejected_roots": {},
        "iv_invalid_for_flip": 76,
        "expiry_min": "2026-11-10",
        "expiry_max": "2029-12-21",
        "expiries_used": 43,
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
      }
    ]
  },
  "events": []
};
