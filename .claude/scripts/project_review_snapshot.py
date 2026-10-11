#!/usr/bin/env python3
"""Read-only review inventory and endpoint fingerprint. Python 3.9+, Git."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import subprocess
import sys
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / '.claude/project-review.json'

def git(*args):
    p = subprocess.run(['git', *args], cwd=ROOT, capture_output=True)
    if p.returncode:
        raise ValueError(p.stderr.decode('utf-8', errors='replace').strip())
    return p.stdout

def scope_path(scope):
    p = Path(scope)
    if p.is_absolute() or '..' in p.parts:
        raise ValueError('Scope must be an existing repo-relative path without traversal.')
    dest = ROOT / p
    if dest.resolve() != dest.absolute() or not dest.exists():
        raise ValueError('Scope is missing, symlinked, or outside the repository.')
    return dest.relative_to(ROOT).as_posix()

def snapshot(scope):
    if Path(git('rev-parse', '--show-toplevel').decode().strip()).resolve() != ROOT:
        raise ValueError('Install helper at Git repository root.')
    selected = scope_path(scope)
    raw_config = CONFIG.read_bytes()
    config = json.loads(raw_config)
    if config['schema_version'] != 1 or config['max_text_file_bytes'] < 1:
        raise ValueError('Invalid config schema/size limit.')
    paths = sorted(set(x.decode('utf-8', errors='strict') for x in
                       git('ls-files', '-z', '--cached', '--others', '--exclude-standard').split(bytes([0])) if x))
    files, excluded = [], []
    for name in paths:
        if selected != '.' and name != selected and not name.startswith(selected + '/'):
            continue
        p = PurePosixPath(name)
        reason = None
        if any(part in config['exclude_directories'] for part in p.parts):
            reason = 'excluded directory'
        elif any(name == prefix or name.startswith(prefix.rstrip('/') + '/')
                 for prefix in config['exclude_paths']):
            reason = 'excluded path'
        if reason:
            excluded.append({'path': name, 'reason': reason})
            continue
        local = ROOT / name
        if local.resolve() != local.absolute():
            files.append({'path': name, 'kind': 'symlink', 'sha256': None})
            continue
        if not local.exists():
            files.append({'path': name, 'kind': 'missing', 'sha256': None})
            continue
        if not local.is_file():
            files.append({'path': name, 'kind': 'non-regular', 'sha256': None})
            continue
        h = hashlib.sha256()
        size = 0
        content = bytearray()
        with local.open('rb') as f:
            while True:
                chunk = f.read(65536)
                if not chunk:
                    break
                h.update(chunk)
                size += len(chunk)
                if len(content) <= config['max_text_file_bytes']:
                    content.extend(chunk)
        if size > config['max_text_file_bytes']:
            kind = 'oversized'
        else:
            try:
                bytes(content).decode('utf-8')
                kind = 'binary' if bytes([0]) in content else 'text'
            except UnicodeDecodeError:
                kind = 'binary-or-non-utf8'
        files.append({'path': name, 'kind': kind, 'bytes': size, 'sha256': h.hexdigest()})
    identity = {'scope': selected, 'head': git('rev-parse', 'HEAD').decode().strip(),
                'config_sha256': hashlib.sha256(raw_config).hexdigest(),
                'files': files, 'excluded': excluded}
    fingerprint_input = {k: v for k, v in identity.items() if k != 'excluded'}
    fingerprint = hashlib.sha256(json.dumps(fingerprint_input, sort_keys=True).encode()).hexdigest()
    return {**identity, 'fingerprint': fingerprint,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'counts': {'selected': len(files), 'excluded': len(excluded),
                       'text': sum(x['kind'] == 'text' for x in files)},
            'limits': ['Git-ignored files absent; configured dependencies/generated paths excluded.',
                       'Endpoint comparison is not atomic; concurrent sessions unsupported.']}

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('action', choices=['snapshot'])
    p.add_argument('scope', nargs='?', default='.')
    try:
        print(json.dumps(snapshot(p.parse_args().scope), ensure_ascii=False, indent=2))
        return 0
    except (OSError, ValueError, KeyError, TypeError) as e:
        print('project-review: ' + str(e), file=sys.stderr)
        return 1

if __name__ == '__main__':
    sys.exit(main())
