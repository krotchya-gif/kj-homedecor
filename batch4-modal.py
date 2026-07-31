#!/usr/bin/env python
"""Batch 4: refactor modal custom (backdrop+panel inline) → komponen <Modal>.
Pola: {showX && (<div backdrop(position fixed+rgba)><div panel(#fff+0.875rem)>...</div></div>)}
SKIP: kondisi ganda (&&), onClick kompleks, zIndex != 200, struktur beda, file sudah pakai Modal.
"""
import os, re, sys

ROOT = r"D:\web\okky\kj-homedecor\src"
MODAL_IMPORT = "import { Modal } from '@/components/ui/Modal'"

def parse_style_obj(body):
    out = {}
    depth = 0
    cur = ''
    for ch in body:
        if ch in '{([': depth += 1
        elif ch in '})]': depth -= 1
        if ch == ',' and depth == 0:
            m = re.match(r"\s*['\"]?([\w-]+)['\"]?\s*:\s*(.+?)\s*$", cur)
            if m: out[m.group(1)] = m.group(2).strip().strip("'\"")
            cur = ''
        else:
            cur += ch
    m = re.match(r"\s*['\"]?([\w-]+)['\"]?\s*:\s*(.+?)\s*$", cur)
    if m: out[m.group(1)] = m.group(2).strip().strip("'\"")
    return out

def is_backdrop(d):
    return d.get('position') == 'fixed' and 'rgba' in d.get('background', '') and d.get('inset') == '0'

def is_panel(d):
    return d.get('background') == '#fff' and d.get('borderRadius') == '0.875rem'

def style_block_end(s, ss_pos):
    """ss_pos = posisi 's' dari 'style='. Return (body_end_excl_brace, end_incl_after_}})."""
    p = ss_pos + 6          # posisi '{' pertama dari '{{'  ('style=' = 6 chars)
    i = p + 2               # mulai scan setelah '{{'
    depth = 1
    while i < len(s) and depth > 0:
        if s[i] == '{': depth += 1
        elif s[i] == '}': depth -= 1
        i += 1
    return i, i + 2         # i = posisi '}' pertama penutup; body = s[p+2:i]

def process_file(path):
    s = open(path, encoding='utf-8').read()
    out = []
    last = 0
    count = 0
    # scan semua posisi <div yang style-nya di baris berikutnya
    for m in re.finditer(r"<div\s*\n\s*style=\{\{", s):
        i = m.start()
        # konteks 120 char sebelum: cari {showX && (
        pre_start = max(0, i - 120)
        pre = s[pre_start:i]
        cm = re.search(r"\{(\w+)\s*&&\s*\(\s*$", pre)
        cm2 = re.search(r"\{(\w+)\s*&&\s*(\w+)\s*&&\s*\(\s*$", pre)
        if not cm and not cm2:
            continue
        if cm2:
            cond = cm2.group(1)
            cond_obj = cm2.group(2)
        else:
            cond = cm.group(1)
            cond_obj = None
        cond_start = pre_start + (cm2 or cm).start()  # posisi absolut '{'
        # guard ganda selain pola show+obj → skip
        if pre.count('&&') > (2 if cond_obj else 1):
            continue
        # backdrop style
        b_ss = s.index('style={{', i)
        b_body, b_end = style_block_end(s, b_ss)
        bd = parse_style_obj(s[b_ss + 8:b_body])
        if not is_backdrop(bd):
            continue
        # onClick backdrop: if (e.target === e.currentTarget) { stmts } (dengan/ tanpa braces)
        oc = re.search(r"onClick=\{\(e\) => \{\s*if \(e\.target === e\.currentTarget\)\s*\{(.*?)\}\s*\}\}", s[b_end:b_end + 500], re.S)
        if not oc:
            oc = re.search(r"onClick=\{\(e\) => \{\s*if \(e\.target === e\.currentTarget\)\s*(.*?)\s*\}\}", s[b_end:b_end + 500], re.S)
        if not oc:
            continue
        oc_end = b_end + oc.end()  # posisi absolut (oc.end() relatif ke slice)
        stmts = [x.strip() for x in re.split(r'[;\n]', oc.group(1)) if x.strip()]
        null_mode = stmts[0].endswith('(null)') if stmts else False
        expected = 'set' + cond[0].upper() + cond[1:] + ('(null)' if null_mode else '(false)')
        if not stmts or stmts[0] != expected:
            continue
        # '>' penutup tag backdrop (setelah onClick)
        gt = s.index('>', oc_end)
        # panel div berikutnya (bisa single-line atau multi-line)
        pd = s.index('<div', gt)
        ps = s.index('style={{', pd)
        p_body, p_end = style_block_end(s, ps)
        pd_ = parse_style_obj(s[ps + 8:p_body])
        if not is_panel(pd_):
            continue
        pgt = s.index('>', p_end)  # '>' penutup tag panel
        maxw = pd_.get('maxWidth', '480')
        padding = pd_.get('padding', '2rem')
        z = re.search(r"zIndex:\s*(\d+)", s[b_ss + 8:b_body])
        zidx = z.group(1) if z else None
        if zidx and zidx not in ('200', '300'):
            continue
        # indent backdrop (dari awal line)
        ls = s.rfind('\n', 0, i) + 1
        indent = len(s[ls:i]) - len(s[ls:i].lstrip(' '))
        # penutup: panel(indent+2) backdrop(indent) )}(indent-2)
        close_re = re.compile(r"\n\s{%d}</div>\n\s{%d}</div>\n\s{%d}\)\}" % (indent + 2, indent, max(0, indent - 2)))
        cm_ = close_re.search(s, p_end)
        if not cm_:
            continue
        pend = cm_.end()
        content = s[pgt + 1:cm_.start()]
        # build replacement
        onclose = "onClose={() => %s}" % stmts[0] if len(stmts) == 1 else "onClose={() => {\n    %s\n  }}" % "\n    ".join(stmts)
        open_expr = "!!%s" % cond if null_mode else cond
        if cond_obj:
            open_expr = "%s && !!%s" % (cond, cond_obj)
        modal = "<Modal\n  open={%s}\n  %s\n  maxWidth={%s}\n  padding=\"%s\"" % (open_expr, onclose, maxw, padding)
        if zidx:
            modal += "\n  zIndex={%s}" % zidx
        modal += "\n>"
        if null_mode or cond_obj:
            # konten pakai narrowing cond — bungkus guard
            guard_var = cond_obj or cond
            modal += "\n        {%s && (\n          <>" % guard_var
            content += "\n          </>\n        )}"
        out.append(s[last:cond_start])
        out.append(modal)
        out.append(content)
        out.append('</Modal>')
        last = pend
        count += 1
    if count == 0:
        return None
    out.append(s[last:])
    new = ''.join(out)
    # insert import Modal setelah import ui terakhir (kecuali sudah ada)
    lines = new.split('\n')
    if not any("from '@/components/ui/Modal'" in l for l in lines):
        idxs = [i for i, l in enumerate(lines) if "from '@/components/ui/" in l and 'Modal' not in l]
        if idxs:
            lines.insert(max(idxs) + 1, MODAL_IMPORT)
        else:
            lines.insert(0, MODAL_IMPORT)
        new = '\n'.join(lines)
    open(path, 'w', encoding='utf-8', newline='').write(new)
    return count

def main():
    changed = []
    for dirpath, _, files in os.walk(ROOT):
        for f in files:
            if not f.endswith('.tsx'):
                continue
            p = os.path.join(dirpath, f)
            if 'tiktok-shop-sdk' in p:
                continue
            try:
                c = process_file(p)
            except Exception as e:
                print(f"ERROR {p}: {e}", file=sys.stderr)
                continue
            if c:
                changed.append((p, c))
    for p, c in changed:
        print(f"CHANGED {c} modal: {os.path.relpath(p, ROOT)}")
    print(f"\nTotal: {len(changed)} file, {sum(c for _, c in changed)} modal")

if __name__ == '__main__':
    main()
