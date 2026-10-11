#!/usr/bin/env python3
"""Single-session feature lifecycle guard. Python 3.9+, standard library only."""
import argparse
import hashlib
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FEATURES = ROOT / 'docs' / 'features'
EXCLUDE = ['--', '.', ':(exclude)docs/features/**']

def fail(message):
    raise ValueError(message)

def now():
    return datetime.now(timezone.utc).isoformat()

def git(*args):
    p = subprocess.run(['git', *args], cwd=ROOT, text=True, capture_output=True)
    if p.returncode:
        fail('Git failed: ' + p.stderr.strip())
    return p.stdout.strip()

def directory(slug):
    if not re.fullmatch(r'[a-z][a-z0-9-]{0,63}', slug):
        fail('Invalid slug: use 1-64 lowercase ASCII letters/digits/hyphens, start with letter.')
    d = FEATURES / slug
    if d.resolve() != d.absolute() or FEATURES.resolve() != FEATURES.absolute():
        fail('Symlinked feature paths are unsupported.')
    return d

def digest(d):
    p = d / 'plan.md'
    if not p.is_file() or not p.read_text(encoding='utf-8').strip():
        fail('Missing or empty plan.md.')
    return hashlib.sha256(p.read_bytes()).hexdigest()

def load(d):
    p = d / 'state.json'
    if not p.is_file():
        fail('Unknown feature; run /feature-plan first.')
    return json.loads(p.read_text(encoding='utf-8'))

def save(d, s):
    s['updated_at'] = now()
    tmp = d / 'state.json.tmp'
    tmp.write_text(json.dumps(s, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    tmp.replace(d / 'state.json')

def check(d, s):
    if s['status'] not in ('in_progress', 'blocked', 'implemented'):
        fail('Feature has not started.')
    if s.get('approved_plan_sha256') != digest(d):
        fail('Approved plan changed. Stop and re-plan with a new slug.')
    if git('rev-parse', 'HEAD') != s.get('baseline_head'):
        fail('HEAD changed since start. Explicit baseline recovery is required.')

def run(a):
    d = directory(a.slug)
    if a.action == 'init':
        if d.exists():
            fail('Slug already exists. Choose a new slug or use feature-status.')
        git('rev-parse', '--show-toplevel')
        d.mkdir(parents=True)
        s = {'schema_version': 1, 'slug': a.slug, 'status': 'planning',
             'review': 'not_requested', 'created_at': now()}
        save(d, s)
    else:
        s = load(d)
        if a.action == 'planned':
            if s['status'] != 'planning':
                fail('Only a planning feature can become planned.')
            if not (d / 'request.md').is_file():
                fail('Missing request.md.')
            digest(d)
            s['status'] = 'planned'
            save(d, s)
        elif a.action == 'start':
            current = digest(d)
            if current != a.plan_hash:
                fail('Plan hash mismatch; inspect the current plan first.')
            if s['status'] in ('in_progress', 'blocked'):
                check(d, s)
            elif s['status'] == 'planned':
                for p in FEATURES.glob('*/state.json'):
                    other = json.loads(p.read_text(encoding='utf-8'))
                    if other.get('slug') != a.slug and other.get('status') in ('in_progress', 'blocked'):
                        fail('Another feature is active or blocked: ' + other.get('slug', '?'))
                top = Path(git('rev-parse', '--show-toplevel')).resolve()
                if top != ROOT:
                    fail('Install/run this package at the git repository root.')
                if git('status', '--porcelain', *EXCLUDE):
                    fail('Source tree is dirty. Commit/stash existing source and configuration before first start.')
                s['approved_plan_sha256'] = current
                s['baseline_head'] = git('rev-parse', 'HEAD')
                s['approved_at'] = now()
            else:
                fail('Cannot start status ' + s['status'])
            s['status'] = 'in_progress'
            s['review'] = 'not_requested'
            save(d, s)
        elif a.action == 'check':
            check(d, s)
        elif a.action == 'finish':
            if s['status'] != 'in_progress':
                fail('Only an in_progress feature can finish.')
            check(d, s)
            if not (d / 'implementation.md').is_file():
                fail('Missing implementation.md.')
            s['status'] = a.result
            s['review'] = 'not_requested'
            save(d, s)
        elif a.action == 'reviewed':
            if s['status'] not in ('implemented', 'blocked'):
                fail('Review requires an implementation handoff.')
            check(d, s)
            if not (d / 'review.md').is_file():
                fail('Missing review.md.')
            s['review'] = 'completed'
            s['reviewed_at'] = now()
            save(d, s)
    result = dict(s)
    result['feature_directory'] = str(d)
    result['plan_sha256'] = digest(d) if (d / 'plan.md').is_file() else None
    result['approval_matches'] = bool(result['plan_sha256']) and result['plan_sha256'] == s.get('approved_plan_sha256')
    result['artifacts'] = {x: (d / x).is_file() for x in ('request.md', 'plan.md', 'implementation.md', 'review.md')}
    print(json.dumps(result, ensure_ascii=False, indent=2))

def main():
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest='action', required=True)
    for name in ('init', 'planned', 'start', 'check', 'finish', 'reviewed', 'status'):
        q = sub.add_parser(name)
        q.add_argument('slug')
        if name == 'start':
            q.add_argument('--plan-hash', required=True)
        if name == 'finish':
            q.add_argument('--result', choices=('implemented', 'blocked'), required=True)
    try:
        run(p.parse_args())
        return 0
    except (ValueError, OSError, KeyError) as e:
        print('feature-state: ' + str(e), file=sys.stderr)
        return 1

if __name__ == '__main__':
    sys.exit(main())
