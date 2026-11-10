"""Generate UTC+8 civil solar-term dates; no runtime/build-time network access.

python -m pip install --target out/calendar-generator lunar_python==1.4.9
python -X utf8 tools/extract-chinese-solar-terms.py
HKO reference: https://www.hko.gov.hk/en/gts/time/conversion.htm
"""
import datetime
import hashlib
import importlib.metadata
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
NAMES = ['小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至']
sys.path.insert(0, str(ROOT / 'out/calendar-generator'))
from lunar_python import LunarYear, Solar
assert importlib.metadata.version('lunar_python') == '1.4.9', 'Use the pinned generator version 1.4.9'

def extract(year):
    days = []
    for julian_day in LunarYear.fromYear(year).getJieQiJulianDays():
        solar = Solar.fromJulianDay(julian_day)
        if solar.getYear() == year:
            date = datetime.date(year, solar.getMonth(), solar.getDay())
            days.append(date.timetuple().tm_yday)
    if len(days) != 24 or days != sorted(set(days)):
        raise ValueError(f'{year}: expected 24 ordered solar terms, got {days}')
    return days

if __name__ == '__main__':
    rows = [extract(year) for year in range(1901, 2101)]
    files = sorted((ROOT / 'out/calendar-generator/lunar_python').rglob('*.py'))
    digest = hashlib.sha256(b''.join(file.read_bytes() for file in files)).hexdigest()
    result = {'source': 'lunar_python 1.4.9 / ShouXing astronomical calculations', 'url': 'https://github.com/6tail/lunar-python', 'license': 'MIT', 'generatorSourceSha256': digest, 'reference': 'https://www.hko.gov.hk/en/gts/time/conversion.htm', 'timezone': 'UTC+08:00', 'firstYear': 1901, 'lastYear': 2100, 'names': NAMES, 'days': rows}
    path = ROOT / 'references/chinese-solar-terms.json'
    content = json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n'
    if not path.exists() or path.read_text(encoding='utf-8') != content:
        path.write_text(content, encoding='utf-8')
    print('Generated 200 years / 4800 solar terms (lunar_python 1.4.9)')
