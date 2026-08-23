#!/usr/bin/env python3
from pathlib import Path
from html.parser import HTMLParser
from collections import Counter
import re, subprocess, sys
ROOT = Path(__file__).resolve().parents[1]

class Parser(HTMLParser):
    def __init__(self):
        super().__init__(); self.ids=[]; self.refs=[]; self.scripts=[]
    def handle_starttag(self, tag, attrs):
        d=dict(attrs)
        if d.get('id'): self.ids.append(d['id'])
        for attr in ('src','href'):
            v=d.get(attr)
            if v and not re.match(r'^(?:https?:)?//|^(?:data|blob):',v): self.refs.append(v.split('?')[0].lstrip('./'))
        if tag=='script' and d.get('src','').startswith('assets/js/'): self.scripts.append(d['src'])

def die(msg):
    print('FAIL:',msg); sys.exit(1)

html=(ROOT/'index.html').read_text(encoding='utf-8')
p=Parser(); p.feed(html)
dup_ids=[k for k,v in Counter(p.ids).items() if v>1]
if dup_ids: die('Duplicate HTML IDs: '+', '.join(dup_ids))
missing_refs=[r for r in p.refs if not (ROOT/r).exists()]
if missing_refs: die('Missing HTML resources: '+', '.join(missing_refs))

js_files=sorted((ROOT/'assets/js').glob('*.js'))
for f in js_files+[ROOT/'service-worker.js']:
    subprocess.run(['node','--check',str(f)],check=True,stdout=subprocess.DEVNULL)
js='\n'.join(f.read_text(encoding='utf-8',errors='ignore') for f in js_files)
ids=set(p.ids)
domrefs=set(re.findall(r'(?:getElementById|byId)\([\'\"]([^\'\"]+)[\'\"]\)',js))
missing_dom=sorted(domrefs-ids)
if missing_dom: die('Missing literal DOM IDs: '+', '.join(missing_dom))
fn=[]
for f in js_files: fn += re.findall(r'\bfunction\s+([A-Za-z_$][\w$]*)\s*\(',f.read_text(encoding='utf-8',errors='ignore'))
dup_fn=[k for k,v in Counter(fn).items() if v>1]
if dup_fn: die('Duplicate named functions: '+', '.join(dup_fn))

sw=(ROOT/'service-worker.js').read_text(encoding='utf-8')
block=re.search(r'const APP_SHELL = \[(.*?)\];',sw,re.S)
if not block: die('Cannot find Service Worker APP_SHELL')
app_shell=re.findall(r"['\"](\./[^'\"]+)['\"]",block.group(1))
missing_shell=[]
for ref in app_shell:
    rel=ref[2:]
    if rel and not (ROOT/rel).exists(): missing_shell.append(ref)
if missing_shell: die('Missing APP_SHELL resources: '+', '.join(missing_shell))
state=(ROOT/'assets/js/01-state.js').read_text(encoding='utf-8')
sv=re.search(r"const APP_VERSION = '([^']+)'",state).group(1)
wv=re.search(r"const APP_VERSION = '([^']+)'",sw).group(1)
if sv!=wv: die(f'APP_VERSION mismatch: state={sv}, sw={wv}')

if 'assets/css/pro-workspace-v51.css' not in html: die('Professional UI v51 stylesheet not loaded')
css_refs=re.findall(r'<link[^>]+href=["\'](assets/css/[^"\']+)["\']',html)
if not css_refs or css_refs[-1] != 'assets/css/pro-workspace-v51.css': die('Professional UI v51 stylesheet must load last')
if 'assets/js/27-regression-tests.js' not in p.scripts: die('Regression module not loaded in index.html')
if 'assets/js/04-shared-core.js' not in p.scripts: die('Shared core module not loaded in index.html')
if p.scripts.index('assets/js/04-shared-core.js') <= p.scripts.index('assets/js/04-account-firestore.js'): die('Shared core must load after account/firestore helpers')
if p.scripts.index('assets/js/04-shared-core.js') >= p.scripts.index('assets/js/05-backup-restore.js'): die('Shared core must load before backup/restore')
if p.scripts[-1] != 'assets/js/15-init.js': die('15-init.js must remain last internal script')
listener_count=len(re.findall(r"window\.addEventListener\(['\"]teacher-data-changed['\"]",js))
if listener_count != 1: die(f'teacher-data-changed should have one shared listener, found {listener_count}')
minute_timer_count=len(re.findall(r"setInterval\([^\n]*60000",js))
if minute_timer_count != 1: die(f'60-second UI heartbeat should be centralized, found {minute_timer_count}')
if 'function buildPpctAlerts' in js: die('PPCT reminder must not have a separate suggestion engine')
if 'function buildProgressAttentionSnapshot' not in js: die('Missing shared PPCT progress snapshot helper')
if 'function addWorkSystemSuggestion' not in js: die('Missing generic system-suggestion saver')
if 'PPCT alert may not originate from the standard suggestion cache' in js: die('Legacy PPCT direct-save fallback still present')
if 'function getSmartReminderManagedSuggestionKeys' not in js: die('Missing Reminder/Suggestion de-duplication helper')
if '.filter(isSystemSuggestionReminderWorthy).map(suggestion =>' not in js: die('System Reminder must filter to high/urgent suggestions before rendering')
if 'workSuggestionCache = allSuggestions.filter(item => !reminderManagedKeys.has(item.key));' not in js: die('Work suggestions do not exclude Reminder-managed items')
if js.count('<p>${esc(alert.detail)}</p>') != 1: die('Reminder detail markup should be rendered once')
if 'function getSchoolSemesterInfo' not in js: die('Missing semester boundary helper')
if 'function getCurriculumSemesterTargets' not in js: die('Missing curriculum semester target helper')
if 'function detectSemesterOneEndSuggestion' not in js: die('Missing HKI boundary suggestion helper')
if 'semesterOneEndPpct' not in js: die('Missing teacher-confirmed HKI boundary field')
if 'sourceWeek > 0 && sourceWeek <= SEMESTER_ONE_END_WEEK' in js: die('Legacy HKI boundary inference from sourceWeek is still present')
if 'function buildSemesterForecastMetrics' not in js: die('Missing semester forecast helper')
if 'function buildSemesterRemainingStatus' not in js: die('Missing semester remaining-status helper')
if 'const TOTAL_ACADEMIC_CALENDAR_WEEKS = MAX_SCHOOL_WEEKS + MAX_AUXILIARY_WEEKS;' not in js: die('Missing 39-week academic calendar invariant')
if 'function getAcademicCalendarWeekSequence' not in js: die('Missing 39-week calendar sequence helper')
if 'statusLabel = `Chậm ${Math.abs(difference)} tiết`' in js: die('Legacy user-facing Chậm x tiết status still present')
if 'Nguy cơ đến tuần ${forecastWeek}' in js: die('Legacy annual forecast label still present')
if 'nguy cơ chưa hoàn thành trước tuần ${MAX_SCHOOL_WEEKS}' in js: die('Legacy whole-year risk notice still present')
print(f'PASS: HTML IDs {len(p.ids)}/{len(set(p.ids))} unique')
print(f'PASS: HTML resources {len(p.refs)} present')
print(f'PASS: DOM refs {len(domrefs)} resolved')
print(f'PASS: named functions {len(fn)}/{len(set(fn))} unique')
print(f'PASS: APP_SHELL {len(app_shell)} resources present')
print(f'PASS: APP_VERSION {sv}')
print('PASS: Professional UI v51 stylesheet loads last')
print(f'PASS: centralized data-change listeners {listener_count}')
print(f'PASS: centralized minute heartbeat {minute_timer_count}')
print('PASS: PPCT uses unified suggestion engine')
print('PASS: Reminder/System Suggestions de-duplicated')
print('PASS: semester forecast uses teacher-confirmed HKI boundary')
print('PASS: progress status shows remaining periods by semester')
print('PASS: academic calendar supports 39 weeks (2 auxiliary + 37 main)')
print('PASS: all JavaScript node --check')
