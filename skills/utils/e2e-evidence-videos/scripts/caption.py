#!/usr/bin/env python3
"""Burn captions into a Playwright video.

Top band: ticket, scenario and the bug it guards against.
Bottom band: the last three Gherkin steps as they run, plus a yellow note on the step that
would fail with the bug. A frozen last frame shows the result.

usage: caption.py <workdir> <id>
  reads  <workdir>/<id>.steps.json (written by step-reporter.cjs) and <workdir>/notes.py
  writes <workdir>/out/<file from notes.py>
"""
import importlib.util
import json
import os
import re
import subprocess
import sys
import textwrap
from pathlib import Path

W, VH, TOP, BOTTOM = 1280, 720, 120, 210
H = TOP + VH + BOTTOM
HOLD = 8.0  # seconds the last frame is held for the result card
PAUSE = 4.0  # seconds the frame freezes at each note so it can be read
GHERKIN = ('Given ', 'When ', 'Then ', 'And ', 'But ')


def ts(sec):
    sec = max(sec, 0)
    return f"{int(sec // 3600)}:{int(sec % 3600 // 60):02d}:{sec % 60:05.2f}"


ANSI = re.compile(r'\x1b\[[0-9;]*m|\[[0-9;]*m')


def esc(text):
    text = ANSI.sub('', text)
    return text.replace('\\', '\\\\').replace('{', '(').replace('}', ')').replace('\n', '\\N')


def wrap(text, width):
    return '\\N'.join(textwrap.wrap(esc(text), width))


def video_duration(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
                         capture_output=True, text=True, check=True).stdout
    return float(out)


def load_steps(rows):
    """Return gherkin steps as dicts with begin/end/title/error, plus the video start time."""
    steps, open_ = [], {}
    for r in rows:
        if r.get('cat') != 'test.step' or not r['title'].startswith(GHERKIN):
            continue
        key = (r['title'], r['depth'])
        if r['kind'] == 'begin':
            open_[key] = {'title': r['title'], 'begin': r['t']}
        elif key in open_:
            s = open_.pop(key)
            s.update(end=r['t'], error=r.get('error'))
            steps.append(s)
    steps.sort(key=lambda s: s['begin'])
    return steps


def load_scenarios(path):
    spec = importlib.util.spec_from_file_location('notes', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.SCENARIOS


def main(sid):
    scenarios = load_scenarios('notes.py')
    if sid not in scenarios:
        sys.exit(f'{sid} is not in notes.py; add an entry for it (see notes.example.py)')
    meta = scenarios[sid]
    rows = json.loads(Path(f'{sid}.steps.json').read_text())
    end = next(r for r in rows if r['kind'] == 'testEnd')
    video = end['video']
    # The recording stops when the context closes in teardown; anchor the video timeline there.
    close = [r['t'] for r in rows if r['kind'] == 'begin' and r.get('title') == 'Fixture "context"']
    duration = video_duration(video)
    v0 = close[-1] / 1000 - duration
    steps = load_steps(rows)
    t = lambda ms: ms / 1000 - v0

    noted = []
    for prefix, note in meta['notes']:
        s = next((s for s in steps if s['title'].startswith(prefix)), None)
        if s and 0 < t(s['begin']) < duration:
            noted.append((t(s['begin']), note))
    noted.sort()
    pauses = [a for a, _ in noted]
    # Video time -> output time: the frame freezes for PAUSE seconds at every note.
    f = lambda x: x + PAUSE * sum(1 for p in pauses if p < x)
    total = f(duration) + HOLD

    passed = end['status'] == 'passed'
    head = (f"{{\\b1}}{meta['ticket']}{{\\b0}}  ·  {esc(meta['scenario'])}\\N"
            f"{{\\c&H8080FF&}}Bug:{{\\c&HFFFFFF&}} {wrap(meta['bug'], 125)}")

    ev = [f"Dialogue: 0,{ts(0)},{ts(total)},Head,,0,0,0,,{head}"]

    # Rolling step list: redraw at each step start and at each step end.
    marks = sorted({t(s['begin']) for s in steps} | {t(s['end']) for s in steps})
    marks.append(duration + HOLD)  # mapped to `total` below
    for a, b in zip(marks, marks[1:]):
        started = [s for s in steps if t(s['begin']) <= a + 1e-6]
        if not started:
            continue
        lines = []
        for s in started[-3:]:
            if t(s['end']) <= a + 1e-6:
                icon = '{\\c&H6060FF&}✗' if s['error'] else '{\\c&H60D060&}✓'
            else:
                icon = '{\\c&H40C0FF&}▶'
            lines.append(f"{icon}{{\\c&HFFFFFF&}} {esc(s['title'][:140])}")
        ev.append(f"Dialogue: 0,{ts(f(a))},{ts(f(b) if b < duration else total)},Steps,,0,0,0,,{'\\N'.join(lines)}")

    # Bug notes, shown from the step they explain until the next note or the end.
    for i, (a, note) in enumerate(noted):
        b = f(noted[i + 1][0]) if i + 1 < len(noted) else total
        ev.append(f"Dialogue: 0,{ts(f(a))},{ts(b)},Note,,0,0,0,,{wrap(note, 110)}")
        ev.append(f"Dialogue: 3,{ts(f(a))},{ts(f(a) + PAUSE)},Paused,,0,0,0,,⏸ paused to read the note")

    for s in steps:
        if s['error']:
            first = ANSI.sub('', s['error']).split('\n')[0]
            msg = f"✗ Failed here: {first[:220]}"
            ev.append(f"Dialogue: 2,{ts(f(t(s['end'])))},{ts(total)},Fail,,0,0,0,,{wrap(msg, 110)}")

    if passed:
        result = (f"{{\\c&H60D060&}}✓ PASSED{{\\c&HFFFFFF&}} on the fixed build\\N"
                  f"{{\\fs26}}{esc(meta['fixed'])}")
    else:
        result = (f"{{\\c&H6060FF&}}✗ FAILED{{\\c&HFFFFFF&}}\\N{{\\fs22}}"
                  f"{wrap(ANSI.sub('', end.get('error') or 'see log').split(chr(10))[0], 70)}"
                  + (f"\\N\\N{{\\c&H00E6FF&}}{wrap(meta['why_failed'], 70)}" if meta.get('why_failed') else ''))
    ev.append(f"Dialogue: 1,{ts(f(duration))},{ts(total)},Result,,0,0,0,,{result}")

    ass = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Head,Liberation Sans,24,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,16,16,12,1
Style: Steps,Liberation Sans,22,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,16,16,{TOP + VH + 10},1
Style: Note,Liberation Sans,23,&H0000E6FF,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,0,0,1,16,16,14,1
Style: Fail,Liberation Sans,22,&H006060FF,&H00FFFFFF,&H00000000,&HE0000000,1,0,0,0,100,100,0,0,3,6,0,1,16,16,70,1
Style: Paused,Liberation Sans,22,&H00FFFFFF,&H00FFFFFF,&H00000000,&HA0000000,1,0,0,0,100,100,0,0,3,8,0,9,20,20,{TOP + 10},1
Style: Result,Liberation Sans,44,&H00FFFFFF,&H00FFFFFF,&H00000000,&HC0000000,1,0,0,0,100,100,0,0,3,18,0,5,80,80,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" + '\n'.join(ev) + '\n'
    Path(f'{sid}.ass').write_text(ass)
    Path('out').mkdir(exist_ok=True)
    cuts = [0.0] + pauses + [duration]
    n = len(cuts) - 1
    fc = [f"[0:v]scale={W}:{VH},pad={W}:{H}:0:{TOP}:color=0x1b1b2f,split={n}" + ''.join(f'[s{i}]' for i in range(n))]
    for i in range(n):
        seg = f"[s{i}]trim={cuts[i]:.3f}:{cuts[i + 1]:.3f},setpts=PTS-STARTPTS"
        if i > 0:
            seg += f",tpad=start_mode=clone:start_duration={PAUSE}"
        if i == n - 1:
            seg += f",tpad=stop_mode=clone:stop_duration={HOLD}"
        fc.append(seg + f"[p{i}]")
    fc.append(''.join(f'[p{i}]' for i in range(n)) + f"concat=n={n}:v=1:a=0,ass={sid}.ass[out]")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', video, '-filter_complex', ';'.join(fc), '-map', '[out]', '-c:v', 'libx264', '-crf', '23',
                    '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
                    f"out/{meta['file']}"], check=True)
    print(f"out/{meta['file']}", 'PASSED' if passed else 'FAILED', f'{total:.0f}s')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    os.chdir(sys.argv[1])
    main(sys.argv[2])
