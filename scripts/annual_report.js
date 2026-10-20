#!/usr/bin/env node
/**
 * annual_report.js —— 八字×紫微 流年/流月/大运/贵人 数据引擎（通用版）
 *
 * 依赖：iztro@2.5.8（紫微+八字四柱）、lunar-typescript（农历换算，iztro 传递依赖）
 * 安装：cd 到本 skill 目录，npm install
 *
 * 用法：
 *   node scripts/annual_report.js <公历日期> <性别> [出生时间] [参考日期]
 *   node scripts/annual_report.js <公历日期> <性别> [出生时间] <起始年> <结束年>
 *
 *   公历日期：YYYY-MM-DD（或 YYYY/M/D）
 *   性别    ：1=男  0=女
 *   出生时间：HH:MM 或 汉字时辰（如 亥时）；缺省 12:00
 *   参考日期：YYYY-MM-DD（用于"按使用当日推算本年逐月"）；缺省=今天
 *   年起止  ：显式区间（与参考日期二选一）
 *
 * 例：
 *   node scripts/annual_report.js 1990-08-15 0 14:30 2026-10-05
 *   node scripts/annual_report.js 1990-08-15 0 14:30 2026 2030
 *
 * 输出：排盘自校验 + 四柱/命宫/十二宫/大运/贵人星位 + 近5年逐年表 + 本年逐月表
 */

const path = require('path');

// ---- 依赖加载：优先本 skill 的 node_modules，其次主 skill ----
function loadDeps() {
  const candidates = [
    path.join(__dirname, '..', 'node_modules'),
    path.join(__dirname, '..', '..', 'university-applications', 'node_modules'),
    path.join(process.env.HOME || '', '.workbuddy', 'skills', 'university-applications', 'node_modules'),
  ];
  for (const p of candidates) {
    try {
      require(path.join(p, 'iztro'));
      require(path.join(p, 'lunar-typescript'));
      return p;
    } catch (e) { /* try next */ }
  }
  throw new Error('未找到 iztro / lunar-typescript，请在本 skill 目录执行: npm install');
}
const MODPATH = loadDeps();
process.env.NODE_PATH = MODPATH + path.delimiter + (process.env.NODE_PATH || '');
require('module').Module._initPaths();
const { astro } = require(path.join(MODPATH, 'iztro'));
const { Solar } = require(path.join(MODPATH, 'lunar-typescript'));

// ============================================================
// 八字大运（子平体系，lunar-typescript getYun）
// 与紫微「大限」是两套独立体系，两者干支/起止岁数不同，勿混用！
// ============================================================
function getBaZiDaYun(solarY, solarM, solarD, gender) {
  try {
    const ec = Solar.fromYmd(solarY, solarM, solarD).getLunar().getEightChar();
    const yun = ec.getYun(gender); // 1=男 0=女
    return {
      startAge: yun.getStartYear(),
      startDate: yun.getStartSolar ? yun.getStartSolar().toYmd() : '',
      list: yun.getDaYun().map(d => ({
        gz: d.getGanZhi(),
        startAge: d.getStartAge(),
        endAge: d.getEndAge(),
        startYear: d.getStartYear(),
        endYear: d.getEndYear(),
      })),
    };
  } catch (e) { return null; }
}

// ============================================================
// 参数解析
// ============================================================
const argv = process.argv.slice(2);
if (argv.length < 2) {
  console.error('用法: node scripts/annual_report.js <公历日期YYYY-MM-DD> <性别1男0女> [出生时间HH:MM|亥时] [参考日期YYYY-MM-DD | 起始年 结束年]');
  console.error('例:   node scripts/annual_report.js 1990-08-15 0 14:30 2026-10-05');
  process.exit(1);
}
const normDate = s => {
  const m = String(s).trim().match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
  if (!m) return null;
  return m[1] + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[3]).padStart(2, '0');
};

const solarDateInput = normDate(argv[0]);
if (!solarDateInput) {
  console.error('❌ 日期格式错误：应为 YYYY-MM-DD，例如 1990-08-15');
  process.exit(1);
}
const solarDate = solarDateInput;
const gender = parseInt(argv[1], 10) === 1 ? 1 : 0;
const birthTime = argv[2] || '12:00';

// 第4参：参考日期 或 起始年；第5参：结束年
const today = new Date();
const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
let refDate = todayStr;
let startYear, endYear, explicitRange = false;
if (argv[3]) {
  const d = normDate(argv[3]);
  if (d) { refDate = d; }
  else {
    startYear = parseInt(argv[3], 10);
    endYear = parseInt(argv[4], 10) || (startYear + 4);
    explicitRange = true;
  }
}
if (!explicitRange) {
  const refYear = parseInt(refDate.slice(0, 4), 10);
  startYear = refYear;
  endYear = refYear + 4;   // 近5年（含今年）
}

// ============================================================
// 时辰 -> iztro 时辰序号（bySolar 第2参）
// 【铁律】序号是「从丑时起算」：1=丑(01-02) 2=寅 3=卯 4=辰 5=巳 6=午
//         7=未 8=申 9=酉 10=戌(19-20) 11=亥(21-22) 12=晚子(23-00)
// 传错序号会让时柱与命宫整盘偏移。本函数为唯一换算入口。
// ============================================================
const ZHI_TO_INDEX = {
  丑: 1, 寅: 2, 卯: 3, 辰: 4, 巳: 5, 午: 6,
  未: 7, 申: 8, 酉: 9, 戌: 10, 亥: 11, 子: 12,
};
function hourToTimeIndex(t) {
  t = String(t).trim();
  if (/[子丑寅卯辰巳午未申酉戌亥]/.test(t)) {
    const z = t.match(/[子丑寅卯辰巳午未申酉戌亥]/)[0];
    return ZHI_TO_INDEX[z] || 6;
  }
  let h;
  if (/^\d{1,2}:\d{2}/.test(t)) h = parseInt(t.split(':')[0], 10);
  else h = parseInt(t, 10);
  if (isNaN(h) || h < 0 || h > 23) h = 12;
  const table = { 1:1, 2:1, 3:2, 4:2, 5:3, 6:3, 7:4, 8:4, 9:5, 10:5,
                  11:6, 12:6, 13:7, 14:7, 15:8, 16:8, 17:9, 18:9,
                  19:10, 20:10, 21:11, 22:11, 23:12, 0:12 };
  return table[h] || 6;
}
// 出生时分解析（早于 timeIndex 使用）
const birthHM = (() => {
  const t = String(birthTime || '12:00');
  if (/^\d{1,2}:\d{2}/.test(t)) { const [a, b] = t.split(':'); return [parseInt(a, 10) || 0, parseInt(b, 10) || 0]; }
  // 汉字时辰回退：取该时辰的中间整点
  const zi = { '\u5b50': 0, '\u4e11': 2, '\u5bc5': 4, '\u536f': 6, '\u8fb0': 8, '\u5df3': 10, '\u5348': 12, '\u672a': 14, '\u7533': 16, '\u9149': 18, '\u620c': 20, '\u4ea5': 22 };
  const k = Object.keys(zi).find(c => t.includes(c));
  return [k ? zi[k] : 12, 0];
})();
const timeIndex = hourToTimeIndex(birthTime);

// 出生小时 -> 时支（八字用）。23:00-00:59 = 子时。
// ZHI 自寅起：t=1..2丑,3..4寅,…，公式 idx=(floor((t-1)/2)+11)%12
function hourToZhi(hh) {
  const t = ((hh % 24) + 24) % 24;
  if (t >= 23 || t < 1) return '子';
  const ZHI = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
  return ZHI[(Math.floor((t - 1) / 2) + 11) % 12];
}
const expectHourZhi = hourToZhi(birthHM[0]);

// ============================================================
// 排盘
// ============================================================
const astrolabe = astro.bySolar(solarDate, timeIndex, gender, 'zh-CN');

// 抓取全部星 -> 宫
const starPalace = {};
astrolabe.palaces.forEach(p => {
  ['majorStars', 'minorStars', 'adjectiveStars'].forEach(t => {
    (p[t] || []).forEach(s => {
      (starPalace[s.name] = starPalace[s.name] || new Set()).add(p.name);
    });
  });
});
const palaceOf = s => (starPalace[s] ? [...starPalace[s]].join('/') : '?');
const starsInPalace = name => {
  const out = [];
  astrolabe.palaces.filter(p => p.name === name).forEach(p =>
    ['majorStars', 'minorStars', 'adjectiveStars'].forEach(t => (p[t] || []).forEach(s => out.push(s.name))));
  return out;
};

// 地支 -> 本盘宫位
const zhi2palace = {};
astrolabe.palaces.forEach(p => { zhi2palace[p.earthlyBranch] = p.name; });

// 宫名 -> 地支（反查）
const palace2zhi = {};
astrolabe.palaces.forEach(p => { palace2zhi[p.name] = p.earthlyBranch; });

// ============================================================
// 八字基础：四柱必须用 lunar-typescript（精确节气）取，★不要用 iztro 的 chineseDate★
// ------------------------------------------------------------
// 原因：iztro 的月柱按「农历月」粗判，而八字月柱必须按精确到秒的节气交节时刻划分。
// 实测 448 组抽样中月柱差异 153 处（34.2%）：
//   1990-01-05 12:00 → 小寒当晚 22:33 才交，八字应仍在子月(丙子)，iztro 给丁丑(错一月)
//   1950-03-15       → 惊蛰 3/6 已过 9 天，iztro 仍给戊寅，应为己卯
// 月柱为「提纲」、旺衰权重最高，一错则旺衰/喜用/格局全盘皆错。
// iztro 仅用于紫微斗数（十二宫/星曜/大限）。
// ============================================================
// 晚子时流派：早子时（默认，23点后日柱不换日）。如需晚子时，把 SECT 改为 2。
const SECT = 1;
const eightChar = (() => {
  const [Y, M, D] = solarDate.split('-').map(Number);
  const ec = Solar.fromYmdHms(Y, M, D, birthHM[0], birthHM[1], 0).getLunar().getEightChar();
  ec.setSect(SECT);
  return ec;
})();
const pillars = [eightChar.getYear(), eightChar.getMonth(), eightChar.getDay(), eightChar.getTime()]; // [年,月,日,时]
const dayGan = (pillars[2] || '')[0] || '';
const yearGan = (pillars[0] || '')[0] || '';
// 双引擎交叉核对：日柱/时柱应与 iztro 一致（月柱/年柱允许差异，因 iztro 用农历月粗判）
const iztroPillars = String(astrolabe.chineseDate || '').trim().split(/\s+/);

// ---- 十神表：按「日干」动态推导（十神关系是固定的天干生克规则）----
const GAN_WX = { 甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水' };
const GAN_YANG = { 甲:1,丙:1,戊:1,庚:1,壬:1 }; // 阳干
const SHENG = { 木:'火', 火:'土', 土:'金', 金:'水', 水:'木' }; // 生
const KE = { 木:'土', 土:'水', 水:'火', 火:'金', 金:'木' };    // 克
function tenGod(dayG, otherG) {
  if (!dayG || !otherG) return '?';
  const dw = GAN_WX[dayG], ow = GAN_WX[otherG];
  const same = (!!GAN_YANG[dayG]) === (!!GAN_YANG[otherG]); // 阴阳同性
  if (ow === dw) return same ? '比肩' : '劫财';
  if (SHENG[ow] === dw) return same ? '偏印' : '正印';   // 生我
  if (SHENG[dw] === ow) return same ? '食神' : '伤官';   // 我生
  if (KE[dw] === ow) return same ? '偏财' : '正财';      // 我克
  if (KE[ow] === dw) return same ? '七杀' : '正官';      // 克我
  return '?';
}

// ---- 支的五行 / 藏干主气（用于地支十神与喜忌参考）----
const ZHI_WX = {
  子:'水', 丑:'土', 寅:'木', 卯:'木', 辰:'土', 巳:'火',
  午:'火', 未:'土', 申:'金', 酉:'金', 戌:'土', 亥:'水',
};
// 地支本气天干
const ZHI_BENQI = {
  子:'癸', 丑:'己', 寅:'甲', 卯:'乙', 辰:'戊', 巳:'丙',
  午:'丁', 未:'己', 申:'庚', 酉:'辛', 戌:'戊', 亥:'壬',
};

// 五行生克（判断某五行对日主是喜/忌的粗略提示；精确喜用需结合旺衰）
function wxRole(dayG, wx) {
  const dw = GAN_WX[dayG];
  if (wx === dw) return '比劫(同我)';
  if (SHENG[wx] === dw) return '印(生我)';
  if (SHENG[dw] === wx) return '食伤(我生)';
  if (KE[dw] === wx) return '财(我克)';
  if (KE[wx] === dw) return '官杀(克我)';
  return '?';
}

// ============================================================
// 年干四化表（紫微）
// ============================================================
const HUA = {
  甲: { 禄:'廉贞', 权:'破军', 科:'武曲', 忌:'太阳' },
  乙: { 禄:'天机', 权:'天梁', 科:'紫微', 忌:'太阴' },
  丙: { 禄:'天同', 权:'天机', 科:'文昌', 忌:'廉贞' },
  丁: { 禄:'太阴', 权:'天同', 科:'天机', 忌:'巨门' },
  戊: { 禄:'贪狼', 权:'太阴', 科:'右弼', 忌:'天机' },
  己: { 禄:'武曲', 权:'贪狼', 科:'天梁', 忌:'文曲' },
  庚: { 禄:'太阳', 权:'武曲', 科:'太阴', 忌:'天同' },
  辛: { 禄:'巨门', 权:'太阳', 科:'文曲', 忌:'文昌' },
  壬: { 禄:'天梁', 权:'紫微', 科:'左辅', 忌:'武曲' },
  癸: { 禄:'破军', 权:'巨门', 科:'太阴', 忌:'贪狼' },
};

// ============================================================
// 【自校验模块】—— 排盘正确性核验，任何一项 FAIL 都会红旗警示
// ============================================================
const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok: !!ok, detail: detail || '' });
}

// 1) 出生时间与四柱时柱时支一致性（用精确的 hourToZhi）
const hourZhiActual = (pillars[3] || '')[1] || '';
check('时辰→时支一致', hourZhiActual === expectHourZhi,
  `出生 ${birthTime} 期望时支「${expectHourZhi}」，实测时柱「${pillars[3] || '?'}」`);

// 2) 四柱完整性（四柱各2字）
check('四柱完整', pillars.length === 4 && pillars.every(p => p.length === 2),
  `四柱 = ${pillars.join(' ')}（lunar-typescript 精确节气）`);

// 2b) 双引擎交叉核对：日柱/时柱必须与 iztro 一致；月柱/年柱因 iztro 用农历月粗判，
//     差异属预期，仅提示不计为失败
{
  const daySame = iztroPillars[2] === pillars[2];
  const hourSame = iztroPillars[3] === pillars[3];
  let d = `日柱 ${daySame ? '✓' : '✗ ' + iztroPillars[2] + '/' + pillars[2]}，时柱 ${hourSame ? '✓' : '✗ ' + iztroPillars[3] + '/' + pillars[3]}`;
  if (iztroPillars[1] !== pillars[1]) d += `；月柱差异(${iztroPillars[1]} vs ${pillars[1]}，已采用精确节气值)`;
  if (iztroPillars[0] !== pillars[0]) d += `；年柱差异(${iztroPillars[0]} vs ${pillars[0]}，立春交界)`;
  check('双引擎交叉核对(日/时柱)', daySame && hourSame, d);
}

// 3) 农历日期回算校验：农历→公历 是否等于输入
try {
  const lunar = Solar.fromYmd(parseInt(solarDate.slice(0,4),10), parseInt(solarDate.slice(5,7),10), parseInt(solarDate.slice(8,10),10)).getLunar();
  const backSolar = lunar.getSolar();
  const back = backSolar.getYear() + '-' + String(backSolar.getMonth()).padStart(2,'0') + '-' + String(backSolar.getDay()).padStart(2,'0');
  check('公历↔农历互算一致', back === solarDate, `回算得 ${back}`);
} catch (e) {
  check('公历↔农历互算一致', false, '换算异常: ' + e.message);
}

// 4) 命宫地支有效性
const mingPalace = astrolabe.palaces.find(p => p.name === '命宫');
check('命宫存在', !!mingPalace, mingPalace ? `命宫在 ${mingPalace.earthlyBranch} 宫` : '未找到命宫');

// 5) 十二宫数量
check('十二宫齐全', astrolabe.palaces.length === 12, `实测 ${astrolabe.palaces.length} 宫`);

// 6) 时辰序号范围
check('时辰序号合法(1-12)', timeIndex >= 1 && timeIndex <= 12, `timeIndex=${timeIndex}`);

// ============================================================
// 输出
// ============================================================
const line = '═'.repeat(68);
console.log(line);
console.log('八字 × 紫微 数据引擎（通用版）');
console.log(line);
console.log('公历生日 :', solarDate, birthTime, '(' + (gender ? '男' : '女') + ')');
console.log('农历日期 :', astrolabe.lunarDate);
console.log('四柱八字 :', astrolabe.chineseDate);
console.log('日主     :', dayGan, '(' + (GAN_WX[dayGan] || '?') + ')');
console.log('时辰序号 :', timeIndex, '（1=丑 … 10=戌 … 11=亥 … 12=晚子）');
console.log('命主/身主:', (astrolabe.soul || '?'), '/', (astrolabe.body || '?'));
console.log('参考日期 :', refDate, '｜ 推算年区间:', startYear + '-' + endYear);

// ---- 自校验报告 ----
console.log('\n' + line);
console.log('【排盘自校验】');
let allPass = true;
checks.forEach(c => {
  if (!c.ok) allPass = false;
  console.log('  ' + (c.ok ? '✅ PASS' : '❌ FAIL') + '  ' + c.name + '  —— ' + c.detail);
});
console.log(allPass
  ? '  ▶ 全部通过，排盘可信。'
  : '  ⚠️ 存在未通过项！请核对出生日期/时间后再解读，勿直接使用。');
if (!allPass) {
  console.log('  提示：若"时辰序号→时支"FAIL，请检查出生时间是否在时辰边界（如整点）。');
}

// ---- 图表 ----
console.log('\n【十二宫星曜】');
astrolabe.palaces.forEach(p => {
  const stars = [];
  ['majorStars', 'minorStars', 'adjectiveStars'].forEach(t =>
    (p[t] || []).forEach(s => stars.push(s.name + (s.mutagen ? '(' + s.mutagen + ')' : ''))));
  const tag = p.isBodyPalace ? ' [身宫]' : '';
  console.log('  ' + (p.name + tag).padEnd(10) + '(' + p.earthlyBranch + ')' + p.heavenlyStem + ' : ' + stars.join(' '));
});

// ---- 大运：两套体系分别列出（八字大运 ≠ 紫微大限）----
console.log('\n【八字大运（子平体系 · 十年一换）】');
const bz = getBaZiDaYun(parseInt(solarDate.slice(0,4),10), parseInt(solarDate.slice(5,7),10), parseInt(solarDate.slice(8,10),10), gender);
if (bz) {
  console.log('  起运：约 ' + bz.startAge + ' 岁（' + bz.startDate + '）');
  const refYear = parseInt(refDate.slice(0,4), 10);
  bz.list.filter(d => d.gz).forEach(d => {
    const cur = (refYear >= d.startYear && refYear <= d.endYear) ? '  ◀ 当前所在' : '';
    console.log('  ' + d.gz + '  ' + String(d.startAge).padStart(3) + '-' + String(d.endAge).padStart(3) +
      '岁  (' + d.startYear + '-' + d.endYear + ')' + cur);
  });
} else {
  console.log('  （八字大运计算失败）');
}

console.log('\n【紫微大限（紫微体系 · 十年一换，与上面八字大运非同一套）】');
astrolabe.palaces
  .filter(p => p.decadal && p.decadal.range)
  .sort((a, b) => a.decadal.range[0] - b.decadal.range[0])
  .filter(p => p.decadal.range[0] <= 100)
  .forEach(p => {
    console.log('  ' + String(p.decadal.range[0]).padStart(3) + '-' + String(p.decadal.range[1]).padStart(3) +
      '岁  ' + p.decadal.heavenlyStem + p.decadal.earthlyBranch + '  落宫:' + p.name);
  });

console.log('\n【本盘贵人星落宫】');
['天魁','天钺','左辅','右弼','文昌','文曲','天贵','天才','天官','天巫','天德','月德','禄存','天马','凤阁']
  .forEach(g => { if (starPalace[g]) console.log('  ' + g.padEnd(4) + ' -> ' + [...starPalace[g]].join('/')); });

// ---- 逐年（近5年）----
function yearGZ(y) { return Solar.fromYmd(y, 6, 1).getLunar().getYearInGanZhi(); }
function analyzeYear(y) {
  const gz = yearGZ(y);
  const gan = gz[0], zhi = gz[1];
  const lp = zhi2palace[zhi] || '?';
  const h = HUA[gan] || {};
  const fours = ['禄','权','科','忌'].map(k => k + ':' + (h[k] || '?') + '(' + palaceOf(h[k]) + ')').join('  ');
  return { y, gz, gan, zhi, lp, h, fours,
    gan10: tenGod(dayGan, gan),
    zhi10: tenGod(dayGan, ZHI_BENQI[zhi] || gan),
    zhiWx: ZHI_WX[zhi] || '?',
    zhiRole: wxRole(dayGan, ZHI_WX[zhi] || ''),
  };
}

console.log('\n' + line);
console.log('【近5年逐年表】' + startYear + ' - ' + endYear + '（以参考日期 ' + refDate + ' 为基准）');
console.log(line);
console.log('年份 | 流年干支 | 流年命宫 | 年干十神 | 年支五行(对日主) | 流年四化(禄/权/科/忌 -> 落宫)');
for (let y = startYear; y <= endYear; y++) {
  const a = analyzeYear(y);
  console.log(y + ' | ' + a.gz + ' | ' + a.lp + ' | ' + a.gan10 + ' | ' + a.zhiWx + '(' + a.zhiRole + ') | ' + a.fours);
}

console.log('\n【近5年 · 流年命宫自带星曜】');
for (let y = startYear; y <= endYear; y++) {
  const a = analyzeYear(y);
  const s = starsInPalace(a.lp);
  console.log('  ' + y + ' ' + a.gz + ' 命宫入「' + a.lp + '」: ' + (s.join(' ') || '(空宫/借星)'));
}

// ---- 流月（参考日期所在年，按节气月精确划分）----
console.log('\n' + line);
console.log('【本年逐月表（按节气月精确）】' + refDate.slice(0, 4) + '年');
console.log(line);
console.log('干支月 | 交节公历 | 月干支 | 月干十神 | 月支五行(对日主) | 月支十神');
const refYear = parseInt(refDate.slice(0, 4), 10);
// 节气月建：寅月起于立春，依次惊蛰(卯)、清明(辰)…
const JIE_LIST = ['立春','惊蛰','清明','立夏','芒种','小暑','立秋','白露','寒露','立冬','大雪','小寒'];
const JIE_ZHI  = ['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'];
try {
  // 用一个覆盖该年全部节气的基准农历对象
  const base = Solar.fromYmd(refYear, 6, 1).getLunar();
  const t = base.getJieQiTable();
  for (let m = 0; m < 12; m++) {
    const jieName = JIE_LIST[m];
    let jieDate = t[jieName]; // Solar 对象
    // 丑月的小寒属次年 1 月：若取到的年份 == refYear（即当年1月），改用次年
    if (jieName === '小寒' && jieDate && jieDate.getYear() === refYear) {
      jieDate = Solar.fromYmd(refYear + 1, 1, jieDate.getDay()).getLunar().getJieQiTable()['小寒'] || jieDate;
    }
    let jieStr = '';
    let gz = '';
    if (jieDate) {
      jieStr = jieDate.getYear() + '-' + String(jieDate.getMonth()).padStart(2, '0') + '-' + String(jieDate.getDay()).padStart(2, '0');
      // 该节气后 2 天取月柱（确保已入该月）
      const probe = jieDate.nextDay(2);
      gz = probe.getLunar().getMonthInGanZhiExact();
    } else {
      gz = '?';
    }
    const mGan = gz[0] || '?';
    const zhi = JIE_ZHI[m];
    console.log('  ' + (zhi + '月').padEnd(5) + ' | ' + jieStr.padEnd(10) + ' | ' + gz +
      ' | ' + tenGod(dayGan, mGan) + ' | ' + (ZHI_WX[zhi] || '?') + '(' + wxRole(dayGan, ZHI_WX[zhi] || '') + ')' +
      ' | ' + tenGod(dayGan, ZHI_BENQI[zhi] || mGan));
  }
  console.log('  说明：流月以节气交接之日为界（非农历初一）。当月宜进宜守，看月干十神与月支对日主的生克。');
} catch (e) {
  console.log('  （流月计算异常：' + e.message + '）');
}

console.log('\n' + line);
console.log('解读提示：');
console.log('  1) 逐年看「流年命宫落点 + 流年四化(尤其忌)落宫 + 十神喜忌」三者交叉。');
console.log('  2) 流月看月干十神与月建地支对日主的生克，定当月宜进宜守。');
console.log('  3) 贵人 = 本盘贵人星位 × 当年被激活的宫。');
console.log('⚠️ 仅作文化参考，不构成医疗/法律/财务/婚姻等专业建议。');
