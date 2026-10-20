# Annual Fortune Report Generator (BaZi + ZiWei)

> English version for overseas skill marketplaces (Claude Skills / MCP directories / Gumroad-style packs).
> Package with the original `scripts/`, `templates/`, `references/` folders.

---
name: bazi-ziwei-annual-report
description: Generate a detailed annual/5-year BaZi (Four Pillars) + ZiWei DouShu fortune report for any person. Input birth date, gender, birth time and city; the skill validates the chart with 6 self-checks, then produces a dark-themed HTML report covering year-by-year and month-by-month guidance. Cultural reference only; not medical, legal, or financial advice.
agent_created: true
version: 2.3.0
metadata:
  displayName: Annual Fortune Report Generator
  keywords: BaZi, Four Pillars, ZiWei, Chinese astrology, annual fortune, monthly forecast, cultural reference
  runtime:
    node: '>=18'
  install:
    - kind: node
      package: iztro
---

# Annual Fortune Report Generator

A reusable pipeline: **cast chart → self-validate → pull yearly/monthly data → write the report**.

## When to use
- User wants next N years or the coming 5 years on career / wealth / relationship / benefactors / health
- Year-by-year or month-by-month analysis of one year
- Luck-pillar (大运 / 大限) transition points
- A saveable report (HTML / PDF)

## Non-negotiables
1. **Zero charting errors**: the script runs 6 self-checks; if any FAILs, do NOT interpret.
2. **No personal data** inside the skill: all examples use placeholders.
3. **Two time dimensions**: current year month-by-month (from "today"), plus a 5-year outlook.

## Inputs required
- Birth date (Gregorian; convert lunar first, watch leap months)
- Gender
- Birth time (if fuzzy, use 亥 21:00–22:59 and state the assumption; if unknown, say the hour pillar and life palace may be off and keep the reading coarse)

## Workflow
```bash
# give a reference date (derives current-year months + next 5 years)
node scripts/annual_report.js <YYYY-MM-DD> <gender 1=male 0=female> [HH:MM|亥时] [refDate YYYY-MM-DD]

# or explicit year range
node scripts/annual_report.js <YYYY-MM-DD> <gender> [HH:MM] <startYear> <endYear>
```
Output six blocks: self-check results, four pillars + day master + life palace, 12 palaces with star and four-transformation flags, **two independent luck cycles** (BaZi 大运 via `getYun` vs ZiWei 大限 via `decadal` — never mix them), benefactor-star placements + 5-year table, current-year monthly table.

## Critical pitfalls
- **Four pillars must come from `lunar-typescript`, never `iztro.chineseDate`.** `iztro` groups months by lunar month, while BaZi month pillars split at the exact solar-term instant — measured 34.2% divergence across 448 samples. Correct: `Solar.fromYmdHms(...).getLunar().getEightChar()`.
- `iztro.astro.bySolar(date, timeIndex, gender, lang)`: the 2nd arg is the **double-hour index** (1 = 丑, 11 = 亥, 12 = late 子), not gender.
- Hour-branch formula (off-by-one prone): `ZHI[(floor((t-1)/2)+11)%12]`.
- 23:00–23:59 late-子 vs early-子: default `SECT=1` (no day change); switch to 2 for late-子.
- Solar-term boundaries: state the exact crossing time on boundary days.

## Report structure
Summary in one line → chart self-check verdict → core conclusion (both luck cycles) → current-year monthly action table → 5-year yearly advice → themed cards → action checklist → disclaimer.

Mandatory disclaimer:
> This content is a cultural/astrological reference and does not constitute medical, legal, financial, marital, or any other professional advice for major life decisions. Consult a qualified professional.

## Style rules
Plain language with a one-line translation after each term; every year gets a concrete action; state which school's favorable-element conclusion is adopted; keep age references consistent (full years).

## Compliance red lines
No predictions of lifespan, death, or major illness diagnosis. No "removing bad luck" or paid ritual offers. Marriage compatibility is personality reference only.

## Pricing
List at **$1 per full report** (or accept the marketplace's creator reward points). Bulk/enterprise white-label integration is a separate higher-tier offer.
