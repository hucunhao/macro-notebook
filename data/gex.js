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
      "last_attempt": "2026-11-17 13:05",
      "last_success": "2026-11-17 13:05",
      "computed_at": "2026-11-17 13:05",
      "quote_timestamp_utc": "2026-11-17 04:58:11",
      "quote_timestamp_zone": "UTC",
      "quote_timestamp_basis": "与 HTTP Last-Modified（GMT）一致，按 UTC",
      "quote_timestamp_checked": true,
      "quote_timestamp_et": "2026-11-16 23:58:11",
      "last_trade_time": "2026-11-16T16:14:59",
      "last_trade_zone": "America/New_York",
      "session_date": "2026-11-16",
      "is_daily_close": true,
      "expected_session": "2026-11-16",
      "chain_behind": false,
      "spot": 7416.5898,
      "security_type": "index",
      "source_symbol": "^SPX",
      "chain_symbol": "_SPX",
      "source_url": "https://cdn.cboe.com/api/global/delayed_quotes/options/_SPX.json",
      "http_status": 200,
      "content_length": 13578073,
      "last_modified": "Tue, 17 Nov 2026 04:58:14 GMT",
      "final_url": "https://cdn-api.cboe.com/api/global/delayed_quotes/options/_SPX.json",
      "delay_note": "来源是 CBOE 公开延迟行情，大约 15 分钟，不是即时成交。",
      "assumption": "做市商多看涨、空看跌",
      "formula": "sign × gamma × open_interest × 100 × spot² × 0.01",
      "windows": {
        "all": {
          "label": "全部到期",
          "dte_max": null,
          "net_gex": -91188941338,
          "call_gex": 189871856947,
          "put_gex": -281060798286,
          "sign": "negative",
          "call_wall": {
            "strike": 7000.0,
            "gex": 26766209394
          },
          "put_wall": {
            "strike": 7000.0,
            "gex": -30263720455
          },
          "contracts_used": 29918,
          "expiries": 54,
          "oi_used": 25160061,
          "strikes_total": 893,
          "strikes_shown": 40,
          "strikes": [
            {
              "strike": 6100.0,
              "call_gex": 42183951,
              "put_gex": -1151722531,
              "net_gex": -1109538579,
              "call_oi": 7730,
              "put_oi": 238597
            },
            {
              "strike": 6200.0,
              "call_gex": 81007048,
              "put_gex": -1420590902,
              "net_gex": -1339583854,
              "call_oi": 14996,
              "put_oi": 291375
            },
            {
              "strike": 6400.0,
              "call_gex": 104373514,
              "put_gex": -1329297769,
              "net_gex": -1224924255,
              "call_oi": 12065,
              "put_oi": 251224
            },
            {
              "strike": 6500.0,
              "call_gex": 281723228,
              "put_gex": -2361146150,
              "net_gex": -2079422923,
              "call_oi": 29420,
              "put_oi": 319995
            },
            {
              "strike": 6600.0,
              "call_gex": 240699899,
              "put_gex": -1305232729,
              "net_gex": -1064532830,
              "call_oi": 23583,
              "put_oi": 141285
            },
            {
              "strike": 6700.0,
              "call_gex": 425662416,
              "put_gex": -1483853077,
              "net_gex": -1058190661,
              "call_oi": 30136,
              "put_oi": 114671
            },
            {
              "strike": 6800.0,
              "call_gex": 738733452,
              "put_gex": -2182168264,
              "net_gex": -1443434813,
              "call_oi": 52736,
              "put_oi": 169579
            },
            {
              "strike": 6900.0,
              "call_gex": 1071925611,
              "put_gex": -2729586028,
              "net_gex": -1657660418,
              "call_oi": 55842,
              "put_oi": 161930
            },
            {
              "strike": 7000.0,
              "call_gex": 26766209394,
              "put_gex": -30263720455,
              "net_gex": -3497511060,
              "call_oi": 1332472,
              "put_oi": 1504950
            },
            {
              "strike": 7050.0,
              "call_gex": 308868592,
              "put_gex": -1309820213,
              "net_gex": -1000951621,
              "call_oi": 12626,
              "put_oi": 52643
            },
            {
              "strike": 7100.0,
              "call_gex": 847919973,
              "put_gex": -3897034719,
              "net_gex": -3049114745,
              "call_oi": 34464,
              "put_oi": 139606
            },
            {
              "strike": 7150.0,
              "call_gex": 541922684,
              "put_gex": -2512659638,
              "net_gex": -1970736954,
              "call_oi": 17979,
              "put_oi": 75625
            },
            {
              "strike": 7200.0,
              "call_gex": 1693282177,
              "put_gex": -5565278253,
              "net_gex": -3871996076,
              "call_oi": 58618,
              "put_oi": 165390
            },
            {
              "strike": 7250.0,
              "call_gex": 757264907,
              "put_gex": -5752396998,
              "net_gex": -4995132091,
              "call_oi": 20223,
              "put_oi": 139598
            },
            {
              "strike": 7275.0,
              "call_gex": 281888245,
              "put_gex": -1842369909,
              "net_gex": -1560481663,
              "call_oi": 7118,
              "put_oi": 41384
            },
            {
              "strike": 7300.0,
              "call_gex": 1342048114,
              "put_gex": -8582082589,
              "net_gex": -7240034475,
              "call_oi": 33016,
              "put_oi": 178108
            },
            {
              "strike": 7325.0,
              "call_gex": 610047373,
              "put_gex": -2118119506,
              "net_gex": -1508072133,
              "call_oi": 13353,
              "put_oi": 40106
            },
            {
              "strike": 7350.0,
              "call_gex": 1261272091,
              "put_gex": -6261899261,
              "net_gex": -5000627171,
              "call_oi": 30492,
              "put_oi": 107935
            },
            {
              "strike": 7375.0,
              "call_gex": 510107327,
              "put_gex": -1872524090,
              "net_gex": -1362416763,
              "call_oi": 10136,
              "put_oi": 30782
            },
            {
              "strike": 7400.0,
              "call_gex": 4533935925,
              "put_gex": -10871127131,
              "net_gex": -6337191206,
              "call_oi": 90282,
              "put_oi": 200928
            },
            {
              "strike": 7425.0,
              "call_gex": 767319968,
              "put_gex": -2235144354,
              "net_gex": -1467824386,
              "call_oi": 14949,
              "put_oi": 37962
            },
            {
              "strike": 7450.0,
              "call_gex": 2611301547,
              "put_gex": -6220573400,
              "net_gex": -3609271854,
              "call_oi": 50750,
              "put_oi": 97444
            },
            {
              "strike": 7470.0,
              "call_gex": 223356569,
              "put_gex": -1424996867,
              "net_gex": -1201640298,
              "call_oi": 3228,
              "put_oi": 13342
            },
            {
              "strike": 7475.0,
              "call_gex": 954664237,
              "put_gex": -3492896074,
              "net_gex": -2538231836,
              "call_oi": 20313,
              "put_oi": 49198
            },
            {
              "strike": 7500.0,
              "call_gex": 6780719508,
              "put_gex": -14116975636,
              "net_gex": -7336256128,
              "call_oi": 137873,
              "put_oi": 236413
            },
            {
              "strike": 7510.0,
              "call_gex": 300887250,
              "put_gex": -1659283089,
              "net_gex": -1358395839,
              "call_oi": 4265,
              "put_oi": 14722
            },
            {
              "strike": 7520.0,
              "call_gex": 531075540,
              "put_gex": -2109571604,
              "net_gex": -1578496064,
              "call_oi": 7706,
              "put_oi": 21222
            },
            {
              "strike": 7550.0,
              "call_gex": 3430480987,
              "put_gex": -5920489235,
              "net_gex": -2490008248,
              "call_oi": 62518,
              "put_oi": 99820
            },
            {
              "strike": 7600.0,
              "call_gex": 7293247090,
              "put_gex": -9640707796,
              "net_gex": -2347460706,
              "call_oi": 158243,
              "put_oi": 199525
            },
            {
              "strike": 7800.0,
              "call_gex": 4515272456,
              "put_gex": -3310221798,
              "net_gex": 1205050658,
              "call_oi": 177063,
              "put_oi": 119268
            },
            {
              "strike": 7850.0,
              "call_gex": 2640845164,
              "put_gex": -1576944901,
              "net_gex": 1063900264,
              "call_oi": 106278,
              "put_oi": 55045
            },
            {
              "strike": 7900.0,
              "call_gex": 2337768683,
              "put_gex": -1121155805,
              "net_gex": 1216612878,
              "call_oi": 127982,
              "put_oi": 51466
            },
            {
              "strike": 8000.0,
              "call_gex": 21942007840,
              "put_gex": -20122179310,
              "net_gex": 1819828530,
              "call_oi": 1256312,
              "put_oi": 1128974
            },
            {
              "strike": 8050.0,
              "call_gex": 1402526996,
              "put_gex": -187371772,
              "net_gex": 1215155224,
              "call_oi": 127225,
              "put_oi": 9649
            },
            {
              "strike": 8100.0,
              "call_gex": 2315243807,
              "put_gex": -343164711,
              "net_gex": 1972079096,
              "call_oi": 214626,
              "put_oi": 22792
            },
            {
              "strike": 8150.0,
              "call_gex": 1515343900,
              "put_gex": -197844877,
              "net_gex": 1317499024,
              "call_oi": 115796,
              "put_oi": 10422
            },
            {
              "strike": 8200.0,
              "call_gex": 2586273906,
              "put_gex": -284677039,
              "net_gex": 2301596867,
              "call_oi": 198469,
              "put_oi": 18451
            },
            {
              "strike": 8250.0,
              "call_gex": 1298626532,
              "put_gex": -95435070,
              "net_gex": 1203191462,
              "call_oi": 87507,
              "put_oi": 5484
            },
            {
              "strike": 8300.0,
              "call_gex": 1397961514,
              "put_gex": -177377217,
              "net_gex": 1220584297,
              "call_oi": 114984,
              "put_oi": 10960
            },
            {
              "strike": 8400.0,
              "call_gex": 1132531006,
              "put_gex": -139764248,
              "net_gex": 992766758,
              "call_oi": 133550,
              "put_oi": 10205
            }
          ],
          "flip": 7624.05,
          "flip_status": "ok",
          "flip_reason": null,
          "flip_roots": [
            7624.05
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
          "net_gex": -48908091825,
          "call_gex": 21189445929,
          "put_gex": -70097537755,
          "sign": "negative",
          "call_wall": {
            "strike": 7500.0,
            "gex": 2244599852
          },
          "put_wall": {
            "strike": 7500.0,
            "gex": -6812155325
          },
          "contracts_used": 4568,
          "expiries": 5,
          "oi_used": 3331518,
          "strikes_total": 556,
          "strikes_shown": 40,
          "strikes": [
            {
              "strike": 7000.0,
              "call_gex": 1435458971,
              "put_gex": -2028355534,
              "net_gex": -592896563,
              "call_oi": 86914,
              "put_oi": 122595
            },
            {
              "strike": 7100.0,
              "call_gex": 49274199,
              "put_gex": -1195996703,
              "net_gex": -1146722503,
              "call_oi": 1487,
              "put_oi": 37529
            },
            {
              "strike": 7150.0,
              "call_gex": 43399580,
              "put_gex": -462763831,
              "net_gex": -419364252,
              "call_oi": 988,
              "put_oi": 11085
            },
            {
              "strike": 7200.0,
              "call_gex": 217597461,
              "put_gex": -1489480171,
              "net_gex": -1271882710,
              "call_oi": 3961,
              "put_oi": 28228
            },
            {
              "strike": 7250.0,
              "call_gex": 214258609,
              "put_gex": -1213807582,
              "net_gex": -999548973,
              "call_oi": 2809,
              "put_oi": 16195
            },
            {
              "strike": 7275.0,
              "call_gex": 22519376,
              "put_gex": -769036149,
              "net_gex": -746516773,
              "call_oi": 273,
              "put_oi": 9411
            },
            {
              "strike": 7290.0,
              "call_gex": 7568799,
              "put_gex": -484051078,
              "net_gex": -476482279,
              "call_oi": 86,
              "put_oi": 5427
            },
            {
              "strike": 7295.0,
              "call_gex": 2794295,
              "put_gex": -397878985,
              "net_gex": -395084690,
              "call_oi": 31,
              "put_oi": 4387
            },
            {
              "strike": 7300.0,
              "call_gex": 414980289,
              "put_gex": -2810989118,
              "net_gex": -2396008829,
              "call_oi": 4475,
              "put_oi": 30322
            },
            {
              "strike": 7325.0,
              "call_gex": 57921112,
              "put_gex": -818310349,
              "net_gex": -760389237,
              "call_oi": 585,
              "put_oi": 7747
            },
            {
              "strike": 7340.0,
              "call_gex": 13624938,
              "put_gex": -693865217,
              "net_gex": -680240280,
              "call_oi": 125,
              "put_oi": 6023
            },
            {
              "strike": 7345.0,
              "call_gex": 4158439,
              "put_gex": -438858309,
              "net_gex": -434699870,
              "call_oi": 37,
              "put_oi": 3404
            },
            {
              "strike": 7350.0,
              "call_gex": 266668139,
              "put_gex": -2992601782,
              "net_gex": -2725933643,
              "call_oi": 2396,
              "put_oi": 25539
            },
            {
              "strike": 7360.0,
              "call_gex": 19428050,
              "put_gex": -467967380,
              "net_gex": -448539330,
              "call_oi": 161,
              "put_oi": 3753
            },
            {
              "strike": 7370.0,
              "call_gex": 27480900,
              "put_gex": -526884097,
              "net_gex": -499403197,
              "call_oi": 240,
              "put_oi": 3600
            },
            {
              "strike": 7375.0,
              "call_gex": 198565453,
              "put_gex": -930406677,
              "net_gex": -731841225,
              "call_oi": 1595,
              "put_oi": 7336
            },
            {
              "strike": 7380.0,
              "call_gex": 34252114,
              "put_gex": -585597293,
              "net_gex": -551345178,
              "call_oi": 275,
              "put_oi": 4107
            },
            {
              "strike": 7390.0,
              "call_gex": 40055227,
              "put_gex": -567368369,
              "net_gex": -527313143,
              "call_oi": 309,
              "put_oi": 4144
            },
            {
              "strike": 7400.0,
              "call_gex": 1487736487,
              "put_gex": -3932871000,
              "net_gex": -2445134513,
              "call_oi": 11759,
              "put_oi": 30488
            },
            {
              "strike": 7410.0,
              "call_gex": 48916662,
              "put_gex": -422252056,
              "net_gex": -373335395,
              "call_oi": 348,
              "put_oi": 2905
            },
            {
              "strike": 7420.0,
              "call_gex": 68746254,
              "put_gex": -461245671,
              "net_gex": -392499417,
              "call_oi": 505,
              "put_oi": 2828
            },
            {
              "strike": 7425.0,
              "call_gex": 198169411,
              "put_gex": -889201829,
              "net_gex": -691032418,
              "call_oi": 1355,
              "put_oi": 6108
            },
            {
              "strike": 7430.0,
              "call_gex": 125484741,
              "put_gex": -494656197,
              "net_gex": -369171455,
              "call_oi": 854,
              "put_oi": 3366
            },
            {
              "strike": 7440.0,
              "call_gex": 67002570,
              "put_gex": -548473875,
              "net_gex": -481471305,
              "call_oi": 522,
              "put_oi": 3985
            },
            {
              "strike": 7445.0,
              "call_gex": 43328072,
              "put_gex": -756247300,
              "net_gex": -712919228,
              "call_oi": 307,
              "put_oi": 4122
            },
            {
              "strike": 7450.0,
              "call_gex": 739151496,
              "put_gex": -2637522814,
              "net_gex": -1898371318,
              "call_oi": 5394,
              "put_oi": 18051
            },
            {
              "strike": 7470.0,
              "call_gex": 67349107,
              "put_gex": -1135193287,
              "net_gex": -1067844180,
              "call_oi": 501,
              "put_oi": 8845
            },
            {
              "strike": 7475.0,
              "call_gex": 253664767,
              "put_gex": -2181398183,
              "net_gex": -1927733416,
              "call_oi": 1955,
              "put_oi": 16831
            },
            {
              "strike": 7480.0,
              "call_gex": 57794599,
              "put_gex": -419958314,
              "net_gex": -362163716,
              "call_oi": 402,
              "put_oi": 3088
            },
            {
              "strike": 7485.0,
              "call_gex": 48311598,
              "put_gex": -499177674,
              "net_gex": -450866076,
              "call_oi": 310,
              "put_oi": 3870
            },
            {
              "strike": 7490.0,
              "call_gex": 118223975,
              "put_gex": -511564981,
              "net_gex": -393341006,
              "call_oi": 791,
              "put_oi": 3712
            },
            {
              "strike": 7500.0,
              "call_gex": 2244599852,
              "put_gex": -6812155325,
              "net_gex": -4567555473,
              "call_oi": 18345,
              "put_oi": 55819
            },
            {
              "strike": 7505.0,
              "call_gex": 75159931,
              "put_gex": -454193927,
              "net_gex": -379033996,
              "call_oi": 550,
              "put_oi": 3612
            },
            {
              "strike": 7510.0,
              "call_gex": 90693570,
              "put_gex": -1357664262,
              "net_gex": -1266970692,
              "call_oi": 718,
              "put_oi": 10096
            },
            {
              "strike": 7520.0,
              "call_gex": 138323096,
              "put_gex": -1466685766,
              "net_gex": -1328362670,
              "call_oi": 1185,
              "put_oi": 11382
            },
            {
              "strike": 7525.0,
              "call_gex": 304611143,
              "put_gex": -693942225,
              "net_gex": -389331083,
              "call_oi": 2648,
              "put_oi": 6019
            },
            {
              "strike": 7530.0,
              "call_gex": 77976228,
              "put_gex": -443566806,
              "net_gex": -365590577,
              "call_oi": 700,
              "put_oi": 4004
            },
            {
              "strike": 7550.0,
              "call_gex": 1218934123,
              "put_gex": -2298841076,
              "net_gex": -1079906953,
              "call_oi": 11941,
              "put_oi": 22835
            },
            {
              "strike": 7580.0,
              "call_gex": 132365967,
              "put_gex": -586383876,
              "net_gex": -454017908,
              "call_oi": 1713,
              "put_oi": 8187
            },
            {
              "strike": 7600.0,
              "call_gex": 1656637310,
              "put_gex": -2497659555,
              "net_gex": -841022245,
              "call_oi": 22368,
              "put_oi": 34702
            }
          ],
          "flip": 7623.57,
          "flip_status": "ok",
          "flip_reason": null,
          "flip_roots": [
            7623.57
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
          "net_gex": -66729515858,
          "call_gex": 33329705480,
          "put_gex": -100059221338,
          "sign": "negative",
          "call_wall": {
            "strike": 7500.0,
            "gex": 2607660163
          },
          "put_wall": {
            "strike": 7500.0,
            "gex": -7841022392
          },
          "contracts_used": 11298,
          "expiries": 21,
          "oi_used": 5059540,
          "strikes_total": 608,
          "strikes_shown": 40,
          "strikes": [
            {
              "strike": 6500.0,
              "call_gex": 165017,
              "put_gex": -815109011,
              "net_gex": -814943994,
              "call_oi": 3230,
              "put_oi": 176006
            },
            {
              "strike": 7000.0,
              "call_gex": 1707132638,
              "put_gex": -2969119804,
              "net_gex": -1261987166,
              "call_oi": 96792,
              "put_oi": 156801
            },
            {
              "strike": 7100.0,
              "call_gex": 54406241,
              "put_gex": -1596543469,
              "net_gex": -1542137228,
              "call_oi": 1621,
              "put_oi": 48122
            },
            {
              "strike": 7150.0,
              "call_gex": 46226878,
              "put_gex": -811451125,
              "net_gex": -765224247,
              "call_oi": 1055,
              "put_oi": 19127
            },
            {
              "strike": 7200.0,
              "call_gex": 228912155,
              "put_gex": -2078020275,
              "net_gex": -1849108120,
              "call_oi": 4183,
              "put_oi": 39751
            },
            {
              "strike": 7225.0,
              "call_gex": 51578943,
              "put_gex": -551559701,
              "net_gex": -499980758,
              "call_oi": 800,
              "put_oi": 9978
            },
            {
              "strike": 7250.0,
              "call_gex": 233395128,
              "put_gex": -1951094381,
              "net_gex": -1717699253,
              "call_oi": 3136,
              "put_oi": 28911
            },
            {
              "strike": 7275.0,
              "call_gex": 69653850,
              "put_gex": -1055913421,
              "net_gex": -986259571,
              "call_oi": 940,
              "put_oi": 14095
            },
            {
              "strike": 7290.0,
              "call_gex": 9367488,
              "put_gex": -584134138,
              "net_gex": -574766650,
              "call_oi": 114,
              "put_oi": 7001
            },
            {
              "strike": 7295.0,
              "call_gex": 3547874,
              "put_gex": -573578525,
              "net_gex": -570030650,
              "call_oi": 42,
              "put_oi": 6854
            },
            {
              "strike": 7300.0,
              "call_gex": 458121341,
              "put_gex": -3890967578,
              "net_gex": -3432846237,
              "call_oi": 5157,
              "put_oi": 46463
            },
            {
              "strike": 7325.0,
              "call_gex": 89780474,
              "put_gex": -1253527273,
              "net_gex": -1163746800,
              "call_oi": 1067,
              "put_oi": 14009
            },
            {
              "strike": 7340.0,
              "call_gex": 35236718,
              "put_gex": -798134220,
              "net_gex": -762897502,
              "call_oi": 488,
              "put_oi": 7477
            },
            {
              "strike": 7345.0,
              "call_gex": 4543479,
              "put_gex": -481949856,
              "net_gex": -477406376,
              "call_oi": 42,
              "put_oi": 3954
            },
            {
              "strike": 7350.0,
              "call_gex": 304583640,
              "put_gex": -3894427443,
              "net_gex": -3589843804,
              "call_oi": 2922,
              "put_oi": 38287
            },
            {
              "strike": 7360.0,
              "call_gex": 27838438,
              "put_gex": -717765239,
              "net_gex": -689926802,
              "call_oi": 278,
              "put_oi": 7022
            },
            {
              "strike": 7370.0,
              "call_gex": 38322544,
              "put_gex": -677577999,
              "net_gex": -639255455,
              "call_oi": 379,
              "put_oi": 5472
            },
            {
              "strike": 7375.0,
              "call_gex": 277625295,
              "put_gex": -1248164207,
              "net_gex": -970538912,
              "call_oi": 2620,
              "put_oi": 11588
            },
            {
              "strike": 7380.0,
              "call_gex": 100033556,
              "put_gex": -878041152,
              "net_gex": -778007596,
              "call_oi": 1044,
              "put_oi": 7891
            },
            {
              "strike": 7390.0,
              "call_gex": 111249239,
              "put_gex": -723766372,
              "net_gex": -612517133,
              "call_oi": 1145,
              "put_oi": 6050
            },
            {
              "strike": 7400.0,
              "call_gex": 1654310564,
              "put_gex": -5250887078,
              "net_gex": -3596576514,
              "call_oi": 13840,
              "put_oi": 47013
            },
            {
              "strike": 7410.0,
              "call_gex": 77943225,
              "put_gex": -632687762,
              "net_gex": -554744537,
              "call_oi": 705,
              "put_oi": 5334
            },
            {
              "strike": 7420.0,
              "call_gex": 113014925,
              "put_gex": -659437084,
              "net_gex": -546422159,
              "call_oi": 1056,
              "put_oi": 5320
            },
            {
              "strike": 7425.0,
              "call_gex": 286794763,
              "put_gex": -1219176149,
              "net_gex": -932381386,
              "call_oi": 2462,
              "put_oi": 10315
            },
            {
              "strike": 7430.0,
              "call_gex": 172250676,
              "put_gex": -972959168,
              "net_gex": -800708491,
              "call_oi": 1423,
              "put_oi": 9112
            },
            {
              "strike": 7440.0,
              "call_gex": 103383409,
              "put_gex": -707028106,
              "net_gex": -603644697,
              "call_oi": 981,
              "put_oi": 5875
            },
            {
              "strike": 7445.0,
              "call_gex": 54780280,
              "put_gex": -840895732,
              "net_gex": -786115452,
              "call_oi": 437,
              "put_oi": 5086
            },
            {
              "strike": 7450.0,
              "call_gex": 911902725,
              "put_gex": -3603584253,
              "net_gex": -2691681529,
              "call_oi": 7508,
              "put_oi": 29630
            },
            {
              "strike": 7460.0,
              "call_gex": 269132399,
              "put_gex": -749778617,
              "net_gex": -480646218,
              "call_oi": 1987,
              "put_oi": 6406
            },
            {
              "strike": 7470.0,
              "call_gex": 121590330,
              "put_gex": -1295348186,
              "net_gex": -1173757856,
              "call_oi": 1181,
              "put_oi": 10711
            },
            {
              "strike": 7475.0,
              "call_gex": 411168387,
              "put_gex": -2556906307,
              "net_gex": -2145737920,
              "call_oi": 3892,
              "put_oi": 21467
            },
            {
              "strike": 7485.0,
              "call_gex": 150666398,
              "put_gex": -782430063,
              "net_gex": -631763664,
              "call_oi": 1499,
              "put_oi": 6916
            },
            {
              "strike": 7500.0,
              "call_gex": 2607660163,
              "put_gex": -7841022392,
              "net_gex": -5233362229,
              "call_oi": 22729,
              "put_oi": 68258
            },
            {
              "strike": 7510.0,
              "call_gex": 157223090,
              "put_gex": -1494568208,
              "net_gex": -1337345118,
              "call_oi": 1531,
              "put_oi": 11721
            },
            {
              "strike": 7520.0,
              "call_gex": 202844904,
              "put_gex": -1720438542,
              "net_gex": -1517593638,
              "call_oi": 1976,
              "put_oi": 14346
            },
            {
              "strike": 7525.0,
              "call_gex": 409193678,
              "put_gex": -1032436944,
              "net_gex": -623243265,
              "call_oi": 4045,
              "put_oi": 10207
            },
            {
              "strike": 7530.0,
              "call_gex": 132387970,
              "put_gex": -703634248,
              "net_gex": -571246278,
              "call_oi": 1374,
              "put_oi": 7098
            },
            {
              "strike": 7550.0,
              "call_gex": 1568352994,
              "put_gex": -3093839965,
              "net_gex": -1525486971,
              "call_oi": 16298,
              "put_oi": 32881
            },
            {
              "strike": 7600.0,
              "call_gex": 2437906750,
              "put_gex": -3480349250,
              "net_gex": -1042442499,
              "call_oi": 32987,
              "put_oi": 48018
            },
            {
              "strike": 7700.0,
              "call_gex": 1543611383,
              "put_gex": -881049969,
              "net_gex": 662561414,
              "call_oi": 55540,
              "put_oi": 32860
            }
          ],
          "flip": 7626.64,
          "flip_status": "ok",
          "flip_reason": null,
          "flip_roots": [
            7626.64
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
        "options_in_file": 30424,
        "unique_kept": 30424,
        "duplicates": 0,
        "unparsed": 0,
        "expired": 506,
        "invalid_gamma_or_oi": 0,
        "used": 29918,
        "roots": {
          "SPX": 10022,
          "SPXO": 674,
          "SPXW": 19728
        },
        "rejected_roots": {},
        "iv_invalid_for_flip": 664,
        "expiry_min": "2026-11-17",
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
      "last_attempt": "2026-11-17 13:05",
      "last_success": "2026-11-17 13:05",
      "computed_at": "2026-11-17 13:05",
      "quote_timestamp_utc": "2026-11-17 04:08:13",
      "quote_timestamp_zone": "UTC",
      "quote_timestamp_basis": "与 HTTP Last-Modified（GMT）一致，按 UTC",
      "quote_timestamp_checked": true,
      "quote_timestamp_et": "2026-11-16 23:08:13",
      "last_trade_time": "2026-11-16T16:14:59",
      "last_trade_zone": "America/New_York",
      "session_date": "2026-11-16",
      "is_daily_close": true,
      "expected_session": "2026-11-16",
      "chain_behind": false,
      "spot": 27197.1523,
      "security_type": "index",
      "source_symbol": "^NDX",
      "chain_symbol": "_NDX",
      "source_url": "https://cdn.cboe.com/api/global/delayed_quotes/options/_NDX.json",
      "http_status": 200,
      "content_length": 7121381,
      "last_modified": "Tue, 17 Nov 2026 04:08:15 GMT",
      "final_url": "https://cdn-api.cboe.com/api/global/delayed_quotes/options/_NDX.json",
      "delay_note": "来源是 CBOE 公开延迟行情，大约 15 分钟，不是即时成交。",
      "assumption": "做市商多看涨、空看跌",
      "formula": "sign × gamma × open_interest × 100 × spot² × 0.01",
      "windows": {
        "all": {
          "label": "全部到期",
          "dte_max": null,
          "net_gex": -3290415169,
          "call_gex": 3556997676,
          "put_gex": -6847412845,
          "sign": "negative",
          "call_wall": {
            "strike": 28000.0,
            "gex": 328937961
          },
          "put_wall": {
            "strike": 27000.0,
            "gex": -1004492357
          },
          "contracts_used": 15310,
          "expiries": 42,
          "oi_used": 207498,
          "strikes_total": 655,
          "strikes_shown": 40,
          "strikes": [
            {
              "strike": 24000.0,
              "call_gex": 3772394,
              "put_gex": -264585358,
              "net_gex": -260812964,
              "call_oi": 78,
              "put_oi": 5029
            },
            {
              "strike": 24400.0,
              "call_gex": 73969,
              "put_gex": -18861970,
              "net_gex": -18788001,
              "call_oi": 6,
              "put_oi": 339
            },
            {
              "strike": 24500.0,
              "call_gex": 7100977,
              "put_gex": -33285829,
              "net_gex": -26184852,
              "call_oi": 111,
              "put_oi": 745
            },
            {
              "strike": 25000.0,
              "call_gex": 12870521,
              "put_gex": -274127296,
              "net_gex": -261256775,
              "call_oi": 200,
              "put_oi": 4433
            },
            {
              "strike": 25200.0,
              "call_gex": 1701276,
              "put_gex": -52221768,
              "net_gex": -50520492,
              "call_oi": 23,
              "put_oi": 738
            },
            {
              "strike": 25400.0,
              "call_gex": 887622,
              "put_gex": -24039766,
              "net_gex": -23152143,
              "call_oi": 13,
              "put_oi": 363
            },
            {
              "strike": 25500.0,
              "call_gex": 8062568,
              "put_gex": -91942857,
              "net_gex": -83880290,
              "call_oi": 119,
              "put_oi": 1285
            },
            {
              "strike": 25600.0,
              "call_gex": 7766693,
              "put_gex": -38241719,
              "net_gex": -30475026,
              "call_oi": 105,
              "put_oi": 527
            },
            {
              "strike": 25800.0,
              "call_gex": 1479370,
              "put_gex": -44455074,
              "net_gex": -42975704,
              "call_oi": 19,
              "put_oi": 472
            },
            {
              "strike": 25900.0,
              "call_gex": 221906,
              "put_gex": -34173451,
              "net_gex": -33951546,
              "call_oi": 2,
              "put_oi": 298
            },
            {
              "strike": 26000.0,
              "call_gex": 14423859,
              "put_gex": -282707643,
              "net_gex": -268283783,
              "call_oi": 199,
              "put_oi": 3795
            },
            {
              "strike": 26200.0,
              "call_gex": 2219055,
              "put_gex": -153410688,
              "net_gex": -151191633,
              "call_oi": 28,
              "put_oi": 1938
            },
            {
              "strike": 26400.0,
              "call_gex": 2293024,
              "put_gex": -52739547,
              "net_gex": -50446523,
              "call_oi": 29,
              "put_oi": 488
            },
            {
              "strike": 26500.0,
              "call_gex": 11169245,
              "put_gex": -159698012,
              "net_gex": -148528767,
              "call_oi": 158,
              "put_oi": 2015
            },
            {
              "strike": 26600.0,
              "call_gex": 2810803,
              "put_gex": -70122147,
              "net_gex": -67311343,
              "call_oi": 32,
              "put_oi": 655
            },
            {
              "strike": 26700.0,
              "call_gex": 61319894,
              "put_gex": -102224480,
              "net_gex": -40904586,
              "call_oi": 462,
              "put_oi": 741
            },
            {
              "strike": 26800.0,
              "call_gex": 35800759,
              "put_gex": -138764923,
              "net_gex": -102964165,
              "call_oi": 442,
              "put_oi": 1138
            },
            {
              "strike": 27000.0,
              "call_gex": 103555913,
              "put_gex": -1004492357,
              "net_gex": -900936444,
              "call_oi": 982,
              "put_oi": 6936
            },
            {
              "strike": 27025.0,
              "call_gex": 0,
              "put_gex": -19897529,
              "net_gex": -19897529,
              "call_oi": 0,
              "put_oi": 88
            },
            {
              "strike": 27100.0,
              "call_gex": 8358442,
              "put_gex": -54070980,
              "net_gex": -45712539,
              "call_oi": 45,
              "put_oi": 249
            },
            {
              "strike": 27200.0,
              "call_gex": 53479232,
              "put_gex": -109177520,
              "net_gex": -55698288,
              "call_oi": 348,
              "put_oi": 638
            },
            {
              "strike": 27300.0,
              "call_gex": 16125135,
              "put_gex": -50964303,
              "net_gex": -34839168,
              "call_oi": 78,
              "put_oi": 219
            },
            {
              "strike": 27400.0,
              "call_gex": 13610206,
              "put_gex": -84915849,
              "net_gex": -71305643,
              "call_oi": 107,
              "put_oi": 520
            },
            {
              "strike": 27500.0,
              "call_gex": 56585910,
              "put_gex": -262884082,
              "net_gex": -206298173,
              "call_oi": 395,
              "put_oi": 1542
            },
            {
              "strike": 27600.0,
              "call_gex": 24039766,
              "put_gex": -76039628,
              "net_gex": -51999862,
              "call_oi": 157,
              "put_oi": 543
            },
            {
              "strike": 27650.0,
              "call_gex": 9172095,
              "put_gex": -36910286,
              "net_gex": -27738191,
              "call_oi": 52,
              "put_oi": 137
            },
            {
              "strike": 27750.0,
              "call_gex": 19305781,
              "put_gex": -39869027,
              "net_gex": -20563246,
              "call_oi": 89,
              "put_oi": 150
            },
            {
              "strike": 27775.0,
              "call_gex": 12204804,
              "put_gex": -38093782,
              "net_gex": -25888978,
              "call_oi": 76,
              "put_oi": 165
            },
            {
              "strike": 27800.0,
              "call_gex": 57547500,
              "put_gex": -89279991,
              "net_gex": -31732490,
              "call_oi": 330,
              "put_oi": 715
            },
            {
              "strike": 28000.0,
              "call_gex": 328937961,
              "put_gex": -640493322,
              "net_gex": -311555361,
              "call_oi": 2629,
              "put_oi": 5156
            },
            {
              "strike": 28500.0,
              "call_gex": 86839030,
              "put_gex": -207703574,
              "net_gex": -120864544,
              "call_oi": 694,
              "put_oi": 1577
            },
            {
              "strike": 28800.0,
              "call_gex": 103925756,
              "put_gex": -31214711,
              "net_gex": 72711045,
              "call_oi": 1115,
              "put_oi": 292
            },
            {
              "strike": 29100.0,
              "call_gex": 45416665,
              "put_gex": -24705482,
              "net_gex": 20711183,
              "call_oi": 636,
              "put_oi": 339
            },
            {
              "strike": 29625.0,
              "call_gex": 104147661,
              "put_gex": -147937,
              "net_gex": 103999724,
              "call_oi": 1422,
              "put_oi": 8
            },
            {
              "strike": 30100.0,
              "call_gex": 28477876,
              "put_gex": -1923181,
              "net_gex": 26554695,
              "call_oi": 532,
              "put_oi": 71
            },
            {
              "strike": 30300.0,
              "call_gex": 8062568,
              "put_gex": -51703988,
              "net_gex": -43641421,
              "call_oi": 352,
              "put_oi": 747
            },
            {
              "strike": 30500.0,
              "call_gex": 200972440,
              "put_gex": -55328445,
              "net_gex": 145643995,
              "call_oi": 3031,
              "put_oi": 782
            },
            {
              "strike": 31000.0,
              "call_gex": 102668291,
              "put_gex": -37649971,
              "net_gex": 65018320,
              "call_oi": 3594,
              "put_oi": 1080
            },
            {
              "strike": 31500.0,
              "call_gex": 54810665,
              "put_gex": -21081025,
              "net_gex": 33729640,
              "call_oi": 2696,
              "put_oi": 646
            },
            {
              "strike": 32000.0,
              "call_gex": 86395219,
              "put_gex": -33285829,
              "net_gex": 53109390,
              "call_oi": 2893,
              "put_oi": 672
            }
          ],
          "flip": 28274.92,
          "flip_status": "ok",
          "flip_reason": null,
          "flip_roots": [
            28274.92
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
          "net_gex": -1148065233,
          "call_gex": 683690932,
          "put_gex": -1831756165,
          "sign": "negative",
          "call_wall": {
            "strike": 28000.0,
            "gex": 107254339
          },
          "put_wall": {
            "strike": 27500.0,
            "gex": -166059303
          },
          "contracts_used": 4492,
          "expiries": 5,
          "oi_used": 43176,
          "strikes_total": 549,
          "strikes_shown": 40,
          "strikes": [
            {
              "strike": 25000.0,
              "call_gex": 739685,
              "put_gex": -29661372,
              "net_gex": -28921687,
              "call_oi": 10,
              "put_oi": 653
            },
            {
              "strike": 25100.0,
              "call_gex": 0,
              "put_gex": -9985749,
              "net_gex": -9985749,
              "call_oi": 0,
              "put_oi": 136
            },
            {
              "strike": 25200.0,
              "call_gex": 221906,
              "put_gex": -11982899,
              "net_gex": -11760993,
              "call_oi": 3,
              "put_oi": 175
            },
            {
              "strike": 25300.0,
              "call_gex": 0,
              "put_gex": -7396851,
              "net_gex": -7396851,
              "call_oi": 0,
              "put_oi": 100
            },
            {
              "strike": 25400.0,
              "call_gex": 0,
              "put_gex": -14571796,
              "net_gex": -14571796,
              "call_oi": 0,
              "put_oi": 206
            },
            {
              "strike": 25500.0,
              "call_gex": 1109528,
              "put_gex": -13610206,
              "net_gex": -12500678,
              "call_oi": 15,
              "put_oi": 192
            },
            {
              "strike": 25600.0,
              "call_gex": 517780,
              "put_gex": -19379749,
              "net_gex": -18861970,
              "call_oi": 7,
              "put_oi": 262
            },
            {
              "strike": 25700.0,
              "call_gex": 147937,
              "put_gex": -12944489,
              "net_gex": -12796552,
              "call_oi": 2,
              "put_oi": 178
            },
            {
              "strike": 25800.0,
              "call_gex": 147937,
              "put_gex": -23226112,
              "net_gex": -23078175,
              "call_oi": 1,
              "put_oi": 177
            },
            {
              "strike": 25900.0,
              "call_gex": 147937,
              "put_gex": -26628663,
              "net_gex": -26480726,
              "call_oi": 1,
              "put_oi": 199
            },
            {
              "strike": 25975.0,
              "call_gex": 0,
              "put_gex": -13906080,
              "net_gex": -13906080,
              "call_oi": 0,
              "put_oi": 95
            },
            {
              "strike": 26000.0,
              "call_gex": 1331433,
              "put_gex": -31066774,
              "net_gex": -29735341,
              "call_oi": 9,
              "put_oi": 214
            },
            {
              "strike": 26200.0,
              "call_gex": 295874,
              "put_gex": -16421009,
              "net_gex": -16125135,
              "call_oi": 2,
              "put_oi": 111
            },
            {
              "strike": 26250.0,
              "call_gex": 0,
              "put_gex": -7544788,
              "net_gex": -7544788,
              "call_oi": 0,
              "put_oi": 51
            },
            {
              "strike": 26300.0,
              "call_gex": 0,
              "put_gex": -9024158,
              "net_gex": -9024158,
              "call_oi": 0,
              "put_oi": 56
            },
            {
              "strike": 26350.0,
              "call_gex": 0,
              "put_gex": -7988599,
              "net_gex": -7988599,
              "call_oi": 0,
              "put_oi": 54
            },
            {
              "strike": 26375.0,
              "call_gex": 0,
              "put_gex": -7766693,
              "net_gex": -7766693,
              "call_oi": 0,
              "put_oi": 52
            },
            {
              "strike": 26400.0,
              "call_gex": 221906,
              "put_gex": -20785151,
              "net_gex": -20563246,
              "call_oi": 1,
              "put_oi": 97
            },
            {
              "strike": 26500.0,
              "call_gex": 0,
              "put_gex": -38611562,
              "net_gex": -38611562,
              "call_oi": 0,
              "put_oi": 176
            },
            {
              "strike": 26600.0,
              "call_gex": 0,
              "put_gex": -23448017,
              "net_gex": -23448017,
              "call_oi": 0,
              "put_oi": 101
            },
            {
              "strike": 26700.0,
              "call_gex": 40608712,
              "put_gex": -66275784,
              "net_gex": -25667073,
              "call_oi": 183,
              "put_oi": 297
            },
            {
              "strike": 26800.0,
              "call_gex": 0,
              "put_gex": -26776600,
              "net_gex": -26776600,
              "call_oi": 0,
              "put_oi": 102
            },
            {
              "strike": 26850.0,
              "call_gex": 665717,
              "put_gex": -8358442,
              "net_gex": -7692725,
              "call_oi": 3,
              "put_oi": 27
            },
            {
              "strike": 26900.0,
              "call_gex": 739685,
              "put_gex": -12796552,
              "net_gex": -12056867,
              "call_oi": 3,
              "put_oi": 42
            },
            {
              "strike": 27000.0,
              "call_gex": 5473670,
              "put_gex": -142537317,
              "net_gex": -137063648,
              "call_oi": 22,
              "put_oi": 410
            },
            {
              "strike": 27025.0,
              "call_gex": 0,
              "put_gex": -18714033,
              "net_gex": -18714033,
              "call_oi": 0,
              "put_oi": 81
            },
            {
              "strike": 27100.0,
              "call_gex": 3994300,
              "put_gex": -44676980,
              "net_gex": -40682680,
              "call_oi": 14,
              "put_oi": 175
            },
            {
              "strike": 27200.0,
              "call_gex": 13018458,
              "put_gex": -47857626,
              "net_gex": -34839168,
              "call_oi": 44,
              "put_oi": 153
            },
            {
              "strike": 27250.0,
              "call_gex": 5325733,
              "put_gex": -12352741,
              "net_gex": -7027008,
              "call_oi": 18,
              "put_oi": 36
            },
            {
              "strike": 27300.0,
              "call_gex": 9246064,
              "put_gex": -38685530,
              "net_gex": -29439467,
              "call_oi": 32,
              "put_oi": 127
            },
            {
              "strike": 27400.0,
              "call_gex": 3846362,
              "put_gex": -41644271,
              "net_gex": -37797908,
              "call_oi": 11,
              "put_oi": 140
            },
            {
              "strike": 27500.0,
              "call_gex": 8136536,
              "put_gex": -166059303,
              "net_gex": -157922767,
              "call_oi": 27,
              "put_oi": 559
            },
            {
              "strike": 27600.0,
              "call_gex": 9172095,
              "put_gex": -35578853,
              "net_gex": -26406758,
              "call_oi": 31,
              "put_oi": 117
            },
            {
              "strike": 27650.0,
              "call_gex": 3328583,
              "put_gex": -32694081,
              "net_gex": -29365498,
              "call_oi": 12,
              "put_oi": 111
            },
            {
              "strike": 27675.0,
              "call_gex": 3994300,
              "put_gex": -13980048,
              "net_gex": -9985749,
              "call_oi": 12,
              "put_oi": 41
            },
            {
              "strike": 27750.0,
              "call_gex": 13314332,
              "put_gex": -35135042,
              "net_gex": -21820710,
              "call_oi": 52,
              "put_oi": 121
            },
            {
              "strike": 27775.0,
              "call_gex": 2145087,
              "put_gex": -27590254,
              "net_gex": -25445167,
              "call_oi": 8,
              "put_oi": 96
            },
            {
              "strike": 28000.0,
              "call_gex": 107254339,
              "put_gex": -126708056,
              "net_gex": -19453718,
              "call_oi": 485,
              "put_oi": 573
            },
            {
              "strike": 28100.0,
              "call_gex": 24853419,
              "put_gex": -17234663,
              "net_gex": 7618756,
              "call_oi": 113,
              "put_oi": 80
            },
            {
              "strike": 28700.0,
              "call_gex": 18640064,
              "put_gex": -6435260,
              "net_gex": 12204804,
              "call_oi": 261,
              "put_oi": 87
            }
          ],
          "flip": 27871.94,
          "flip_status": "ok",
          "flip_reason": null,
          "flip_roots": [
            27871.94
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
          "net_gex": -1606891897,
          "call_gex": 1192964118,
          "put_gex": -2799856015,
          "sign": "negative",
          "call_wall": {
            "strike": 28000.0,
            "gex": 113541662
          },
          "put_wall": {
            "strike": 27000.0,
            "gex": -353569475
          },
          "contracts_used": 10202,
          "expiries": 21,
          "oi_used": 65780,
          "strikes_total": 561,
          "strikes_shown": 40,
          "strikes": [
            {
              "strike": 24000.0,
              "call_gex": 73969,
              "put_gex": -84028227,
              "net_gex": -83954258,
              "call_oi": 1,
              "put_oi": 1491
            },
            {
              "strike": 25000.0,
              "call_gex": 739685,
              "put_gex": -46156350,
              "net_gex": -45416665,
              "call_oi": 10,
              "put_oi": 876
            },
            {
              "strike": 25200.0,
              "call_gex": 221906,
              "put_gex": -17530537,
              "net_gex": -17308631,
              "call_oi": 3,
              "put_oi": 250
            },
            {
              "strike": 25400.0,
              "call_gex": 0,
              "put_gex": -18418159,
              "net_gex": -18418159,
              "call_oi": 0,
              "put_oi": 258
            },
            {
              "strike": 25500.0,
              "call_gex": 1109528,
              "put_gex": -17604505,
              "net_gex": -16494978,
              "call_oi": 15,
              "put_oi": 246
            },
            {
              "strike": 25600.0,
              "call_gex": 517780,
              "put_gex": -26850569,
              "net_gex": -26332789,
              "call_oi": 7,
              "put_oi": 363
            },
            {
              "strike": 25700.0,
              "call_gex": 147937,
              "put_gex": -13314332,
              "net_gex": -13166395,
              "call_oi": 2,
              "put_oi": 183
            },
            {
              "strike": 25800.0,
              "call_gex": 147937,
              "put_gex": -27664222,
              "net_gex": -27516285,
              "call_oi": 1,
              "put_oi": 234
            },
            {
              "strike": 25900.0,
              "call_gex": 147937,
              "put_gex": -28625813,
              "net_gex": -28477876,
              "call_oi": 1,
              "put_oi": 223
            },
            {
              "strike": 25975.0,
              "call_gex": 0,
              "put_gex": -13906080,
              "net_gex": -13906080,
              "call_oi": 0,
              "put_oi": 95
            },
            {
              "strike": 26000.0,
              "call_gex": 1331433,
              "put_gex": -41052523,
              "net_gex": -39721090,
              "call_oi": 9,
              "put_oi": 290
            },
            {
              "strike": 26200.0,
              "call_gex": 295874,
              "put_gex": -26036915,
              "net_gex": -25741041,
              "call_oi": 2,
              "put_oi": 186
            },
            {
              "strike": 26400.0,
              "call_gex": 221906,
              "put_gex": -28108034,
              "net_gex": -27886128,
              "call_oi": 1,
              "put_oi": 148
            },
            {
              "strike": 26500.0,
              "call_gex": 443811,
              "put_gex": -44824917,
              "net_gex": -44381106,
              "call_oi": 3,
              "put_oi": 218
            },
            {
              "strike": 26600.0,
              "call_gex": 0,
              "put_gex": -31584553,
              "net_gex": -31584553,
              "call_oi": 0,
              "put_oi": 156
            },
            {
              "strike": 26700.0,
              "call_gex": 40756649,
              "put_gex": -70639926,
              "net_gex": -29883278,
              "call_oi": 184,
              "put_oi": 325
            },
            {
              "strike": 26800.0,
              "call_gex": 147937,
              "put_gex": -36096633,
              "net_gex": -35948696,
              "call_oi": 1,
              "put_oi": 165
            },
            {
              "strike": 26850.0,
              "call_gex": 813654,
              "put_gex": -12500678,
              "net_gex": -11687024,
              "call_oi": 4,
              "put_oi": 54
            },
            {
              "strike": 26900.0,
              "call_gex": 1701276,
              "put_gex": -15163544,
              "net_gex": -13462269,
              "call_oi": 9,
              "put_oi": 58
            },
            {
              "strike": 27000.0,
              "call_gex": 10059717,
              "put_gex": -353569475,
              "net_gex": -343509757,
              "call_oi": 50,
              "put_oi": 1821
            },
            {
              "strike": 27025.0,
              "call_gex": 0,
              "put_gex": -19157844,
              "net_gex": -19157844,
              "call_oi": 0,
              "put_oi": 83
            },
            {
              "strike": 27100.0,
              "call_gex": 7396851,
              "put_gex": -49558901,
              "net_gex": -42162050,
              "call_oi": 37,
              "put_oi": 201
            },
            {
              "strike": 27200.0,
              "call_gex": 42162050,
              "put_gex": -59840524,
              "net_gex": -17678474,
              "call_oi": 178,
              "put_oi": 223
            },
            {
              "strike": 27300.0,
              "call_gex": 11834961,
              "put_gex": -43197609,
              "net_gex": -31362648,
              "call_oi": 48,
              "put_oi": 153
            },
            {
              "strike": 27400.0,
              "call_gex": 7544788,
              "put_gex": -54218917,
              "net_gex": -46674129,
              "call_oi": 32,
              "put_oi": 211
            },
            {
              "strike": 27500.0,
              "call_gex": 34987105,
              "put_gex": -176414895,
              "net_gex": -141427790,
              "call_oi": 153,
              "put_oi": 618
            },
            {
              "strike": 27600.0,
              "call_gex": 16494978,
              "put_gex": -54292886,
              "net_gex": -37797908,
              "call_oi": 68,
              "put_oi": 214
            },
            {
              "strike": 27650.0,
              "call_gex": 8876221,
              "put_gex": -36762349,
              "net_gex": -27886128,
              "call_oi": 49,
              "put_oi": 136
            },
            {
              "strike": 27750.0,
              "call_gex": 17974348,
              "put_gex": -38537593,
              "net_gex": -20563246,
              "call_oi": 80,
              "put_oi": 140
            },
            {
              "strike": 27775.0,
              "call_gex": 2588898,
              "put_gex": -28477876,
              "net_gex": -25888978,
              "call_oi": 11,
              "put_oi": 100
            },
            {
              "strike": 27900.0,
              "call_gex": 56733847,
              "put_gex": -40830617,
              "net_gex": 15903230,
              "call_oi": 330,
              "put_oi": 189
            },
            {
              "strike": 28000.0,
              "call_gex": 113541662,
              "put_gex": -333967820,
              "net_gex": -220426158,
              "call_oi": 525,
              "put_oi": 1971
            },
            {
              "strike": 28600.0,
              "call_gex": 22042616,
              "put_gex": -10133686,
              "net_gex": 11908930,
              "call_oi": 222,
              "put_oi": 81
            },
            {
              "strike": 28700.0,
              "call_gex": 25741041,
              "put_gex": -11760993,
              "net_gex": 13980048,
              "call_oi": 309,
              "put_oi": 123
            },
            {
              "strike": 28800.0,
              "call_gex": 44972854,
              "put_gex": -7027008,
              "net_gex": 37945845,
              "call_oi": 365,
              "put_oi": 76
            },
            {
              "strike": 29100.0,
              "call_gex": 40386806,
              "put_gex": -15977198,
              "net_gex": 24409608,
              "call_oi": 568,
              "put_oi": 221
            },
            {
              "strike": 29200.0,
              "call_gex": 4733985,
              "put_gex": -28995656,
              "net_gex": -24261671,
              "call_oi": 139,
              "put_oi": 443
            },
            {
              "strike": 29400.0,
              "call_gex": 30401057,
              "put_gex": -1183496,
              "net_gex": 29217561,
              "call_oi": 789,
              "put_oi": 131
            },
            {
              "strike": 29700.0,
              "call_gex": 15755292,
              "put_gex": -369843,
              "net_gex": 15385450,
              "call_oi": 374,
              "put_oi": 66
            },
            {
              "strike": 30100.0,
              "call_gex": 18492127,
              "put_gex": 0,
              "net_gex": 18492127,
              "call_oi": 397,
              "put_oi": 45
            }
          ],
          "flip": 28006.68,
          "flip_status": "ok",
          "flip_reason": null,
          "flip_roots": [
            28006.68
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
        "options_in_file": 16254,
        "unique_kept": 16254,
        "duplicates": 0,
        "unparsed": 0,
        "expired": 944,
        "invalid_gamma_or_oi": 0,
        "used": 15310,
        "roots": {
          "NDX": 4210,
          "NDXP": 12044
        },
        "rejected_roots": {},
        "iv_invalid_for_flip": 336,
        "expiry_min": "2026-11-17",
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
      },
      {
        "session_date": "2026-11-12",
        "recorded_at": "2026-11-13 11:11",
        "quote_timestamp_utc": "2026-11-13 01:04:50",
        "spot": 7592.3999,
        "net_gex": -14326373534,
        "sign": "negative",
        "flip": 7635.32,
        "flip_status": "ok",
        "spot_vs_flip": "below",
        "call_wall": 8000.0,
        "put_wall": 8000.0,
        "net_gex_d7": -820512329,
        "net_gex_d30": -19670852125
      },
      {
        "session_date": "2026-11-13",
        "recorded_at": "2026-11-14 10:57",
        "quote_timestamp_utc": "2026-11-14 01:04:50",
        "spot": 7561.6699,
        "net_gex": -54240527693,
        "sign": "negative",
        "flip": 7632.75,
        "flip_status": "ok",
        "spot_vs_flip": "below",
        "call_wall": 8000.0,
        "put_wall": 7000.0,
        "net_gex_d7": -34956205204,
        "net_gex_d30": -46347467521
      },
      {
        "session_date": "2026-11-16",
        "recorded_at": "2026-11-17 13:05",
        "quote_timestamp_utc": "2026-11-17 04:58:11",
        "spot": 7416.5898,
        "net_gex": -91188941338,
        "sign": "negative",
        "flip": 7624.05,
        "flip_status": "ok",
        "spot_vs_flip": "below",
        "call_wall": 7000.0,
        "put_wall": 7000.0,
        "net_gex_d7": -48908091825,
        "net_gex_d30": -66729515858
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
      },
      {
        "session_date": "2026-11-12",
        "recorded_at": "2026-11-13 11:11",
        "quote_timestamp_utc": "2026-11-13 02:59:24",
        "spot": 28289.1875,
        "net_gex": -357404213,
        "sign": "negative",
        "flip": 28460.85,
        "flip_status": "ok",
        "spot_vs_flip": "below",
        "call_wall": 29000.0,
        "put_wall": 27000.0,
        "net_gex_d7": 271214258,
        "net_gex_d30": -12324283
      },
      {
        "session_date": "2026-11-13",
        "recorded_at": "2026-11-14 10:57",
        "quote_timestamp_utc": "2026-11-14 02:40:22",
        "spot": 27943.7363,
        "net_gex": -1412249648,
        "sign": "negative",
        "flip": 28449.6,
        "flip_status": "ok",
        "spot_vs_flip": "below",
        "call_wall": 29000.0,
        "put_wall": 28000.0,
        "net_gex_d7": -415803902,
        "net_gex_d30": -848005705
      },
      {
        "session_date": "2026-11-16",
        "recorded_at": "2026-11-17 13:05",
        "quote_timestamp_utc": "2026-11-17 04:08:13",
        "spot": 27197.1523,
        "net_gex": -3290415169,
        "sign": "negative",
        "flip": 28274.92,
        "flip_status": "ok",
        "spot_vs_flip": "below",
        "call_wall": 28000.0,
        "put_wall": 27000.0,
        "net_gex_d7": -1148065233,
        "net_gex_d30": -1606891897
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
    },
    {
      "type": "sign_switch",
      "symbol": "NDX",
      "scope": "all",
      "prior_date": "2026-11-11",
      "current_date": "2026-11-12",
      "prior_sign": "positive",
      "current_sign": "negative",
      "prior_net_gex": 517597618,
      "current_net_gex": -357404213,
      "prior_spot": 28374.252,
      "current_spot": 28289.1875
    },
    {
      "type": "flip_cross",
      "symbol": "NDX",
      "scope": "all",
      "prior_date": "2026-11-11",
      "current_date": "2026-11-12",
      "prior_spot": 28374.252,
      "current_spot": 28289.1875,
      "prior_flip": 28338.52,
      "current_flip": 28460.85,
      "prior_relation": "above",
      "current_relation": "below"
    }
  ]
};
