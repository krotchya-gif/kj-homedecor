#!/usr/bin/env python
"""Batch 3: convert sisa pola card konten #fff → section-card (KJ 2026-07-31).
Signature card konten: background:'#fff' + border:'1px solid #e5e7eb' + borderRadius
0.75rem|0.875rem + padding '1.25rem'|'1rem 1.25rem' (atau urutan bebas).
Bukan card (button/badge padding kecil, padding 2rem hero) TIDAK disentuh.
Balanced-brace parser — aman untuk nested braces/spread.
"""
import os, re

ROOT = r"D:\web\okky\kj-homedecor\src"

def find_style_end(s, start):
    i = s.index('{{', start) + 2
    depth = 2
    while i < len(s):
        c = s[i]
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                j = i + 1
                while j < len(s) and s[j] in ' \t':
                    j += 1
                return j if j < len(s) and s[j] == '>' else None
        i += 1
    return None

def is_card(body):
    if 'background:' not in body or '#fff' not in body:
        return False
    if 'border:' not in body or '#e5e7eb' not in body:
        return False
    rad = re.search(r"borderRadius:\s*['\"]([0-9.]+rem)['\"]", body)
    if not rad or rad.group(1) not in ('0.75rem', '0.875rem'):
        return False
    pad = re.search(r"padding:\s*['\"]([^'\"]+)['\"]", body)
    if not pad:
        return False
    return pad.group(1) in ('1.25rem', '1rem 1.25rem')

changed = []
for dirpath, dirs, files in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d != 'tiktok-shop-sdk']
    for fn in files:
        if not fn.endswith('.tsx'):
            continue
        p = os.path.join(dirpath, fn)
        src = open(p, encoding='utf-8').read()
        out, i, mod = [], 0, False
        while True:
            marker = '<div style={{'
            idx = src.find(marker, i)
            if idx == -1:
                out.append(src[i:])
                break
            end = find_style_end(src, idx)
            if end is None:
                out.append(src[i:])
                break
            body = src[idx + len(marker) - 2 : end - 1]
            if is_card(body):
                out.append(src[i:idx] + '<div className="section-card">')
                mod = True
                i = end + 1
            else:
                out.append(src[i : end + 1])
                i = end + 1
        if mod:
            open(p, 'w', encoding='utf-8', newline='').write(''.join(out))
            changed.append(p)

print(f"CHANGED: {len(changed)} files")
for p in changed:
    print('  +', p.replace(ROOT, ''))
