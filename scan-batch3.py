#!/usr/bin/env python
"""Scan variasi pola card #fff yang tersisa di KJ (batch 3)."""
import os, re
from collections import Counter

ROOT = r"D:\web\okky\kj-homedecor\src"
variants = Counter()
files_with = []
for dirpath, dirs, files in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d != 'tiktok-shop-sdk']
    for fn in files:
        if not fn.endswith('.tsx'):
            continue
        p = os.path.join(dirpath, fn)
        s = open(p, encoding='utf-8').read()
        if '#fff' in s and 'section-card' not in s:
            files_with.append(p)
        for m in re.finditer(r"background:\s*['\"]?#fff['\"]?", s):
            ctx = s[max(0, m.start() - 300) : m.start() + 300]
            pad = re.findall(r"padding:\s*['\"]([0-9.]+rem[^'\"]*)['\"]", ctx)
            rad = re.findall(r"borderRadius:\s*['\"]([0-9.]+rem)['\"]", ctx)
            variants[(tuple(pad[-1:]), tuple(rad[-1:]))] += 1

print("=== file belum pakai section-card (dari total):", len(files_with), "===")
print("=== variasi padding x borderRadius (count) ===")
for k, v in variants.most_common(15):
    print(f"  {k}: {v}")
