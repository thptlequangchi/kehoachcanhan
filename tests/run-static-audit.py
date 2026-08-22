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
if 'assets/js/27-regression-tests.js' not in p.scripts: die('Regression module not loaded in index.html')
if p.scripts[-1] != 'assets/js/15-init.js': die('15-init.js must remain last internal script')
print(f'PASS: HTML IDs {len(p.ids)}/{len(set(p.ids))} unique')
print(f'PASS: HTML resources {len(p.refs)} present')
print(f'PASS: DOM refs {len(domrefs)} resolved')
print(f'PASS: named functions {len(fn)}/{len(set(fn))} unique')
print(f'PASS: APP_SHELL {len(app_shell)} resources present')
print(f'PASS: APP_VERSION {sv}')
print('PASS: all JavaScript node --check')
