#!/usr/bin/env python
"""Cek sisa pola card lengkap (bg #fff + border #e5e7eb + radius 0.75 + padding >=1rem) per file."""
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

def is_full_card(body):
    return (
        'background:' in body and '#fff' in body
        and 'border:' in body and '#e5e7eb' in body
        and re.search(r"borderRadius:\s*['\"]0?\.75rem['\"]", body)
        and re.search(r"padding:\s*['\"][0-9]+(?:rem|\.25rem)[^'\"]*['\"]", body)
    )

total = 0
for dirpath, dirs, files in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d != 'tiktok-shop-sdk']
    for fn in files:
        if not fn.endswith('.tsx'):
            continue
        p = os.path.join(dirpath, fn)
        src = open(p, encoding='utf-8').read()
        i = 0
        while True:
            marker = '<div style={{'
            idx = src.find(marker, i)
            if idx == -1:
                break
            end = find_style_end(src, idx)
            if end is None:
                break
            body = src[idx + len(marker) - 2 : end - 1]
            if is_full_card(body):
                total += 1
                print(f"  {p.replace(ROOT, '')}:{src[:idx].count(chr(10)) + 1}")
            i = end + 1

print(f"=== sisa pola card LENGKAP: {total} ===")
