#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Подарок для Полины: живой ASCII-глаз в терминале.
Запуск:  python polina.py        (по-русски)
         python polina.py --en   (по-английски)
Выход: любая клавиша или Ctrl+C.
"""
import math, os, random, shutil, sys, time

TEXT_RU = "Полина — лучшая девушка на свете <3"
TEXT_EN = "Polina is the best girl in the world <3"
TEXT = TEXT_EN if ("--en" in sys.argv or "_en" in os.path.basename(sys.argv[0]).lower()) else TEXT_RU

DIM, EYE, TXT = "\x1b[32m", "\x1b[92m", "\x1b[1;97m"
RESET = "\x1b[0m"
RAMP = " .:-=+*#%@"
FPS = 30


def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def setup_console():
    if os.name == "nt":
        os.system("")  # включает ANSI-цвета в cmd
        try:
            import ctypes
            ctypes.windll.kernel32.SetConsoleOutputCP(65001)
        except Exception:
            pass
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


def key_pressed():
    try:
        import msvcrt
        if msvcrt.kbhit():
            msvcrt.getch()
            return True
    except ImportError:
        pass
    return False


class Scene:
    def __init__(self, cols, rows):
        self.cols, self.rows = cols, rows
        rnd = random.Random(7)
        self.rnd = [[rnd.random() for _ in range(cols)] for _ in range(rows)]
        self.s = max(0.45, min((cols - 8) / 62.0, (rows - 7) / 22.0, 1.25))
        self.cx = cols / 2.0
        self.cy = rows / 2.0 - 3.0 * self.s - 1
        self.text_row = min(rows - 2, int(self.cy + 6 * self.s) + 4)
        self.text_scr = [random.choice("01@#%&*+=") for _ in TEXT]

    # --- геометрия глаза (в «условных» единицах, до масштаба) ---
    A = 30.0     # полуширина
    HU = 19.0    # высота верхнего века
    HL = 12.0    # высота нижнего века

    def lids(self, u, o):
        t = u / self.A
        if abs(t) > 1:
            return None
        k = (1 - t * t) ** 0.85
        return -self.HU * k * o, self.HL * k * (0.35 + 0.65 * o)

    def eye_layer(self, o, gx, gy, p):
        """Возвращает dict {(row, col): char}"""
        s, cx, cy = self.s, self.cx, self.cy
        cells = {}
        ix, iy = gx * 6.0, gy * 2.5
        R, RP = 12.5, 5.2
        for r in range(self.rows):
            for c in range(self.cols):
                u = (c - cx) / s
                v = (r - cy) * 2 / s
                ch = None
                l = self.lids(u, o)
                if l is not None:
                    up, low = l
                    if up <= v <= low:
                        d_up, d_low = v - up, low - v
                        if d_up * s < 1.7 or d_low * s < 1.1:
                            ch = "@"
                        else:
                            rr = math.hypot(u - ix, v - iy)
                            if rr < R:
                                if rr < RP:
                                    ch = " "
                                else:
                                    ang = math.atan2(v - iy, u - ix)
                                    b = 0.50 + 0.22 * math.sin(ang * 13) \
                                        + 0.28 * (rr - RP) / (R - RP)
                                    if rr > R - 1.6:
                                        b = 1.0
                                    # тень от верхнего века
                                    b -= 0.35 * clamp(1 - d_up / 7.0)
                                    ch = RAMP[int(clamp(b) * (len(RAMP) - 1))]
                                    if ch == " ":
                                        ch = "."
                                # блик
                                if math.hypot(u - (ix - 3.2), v - (iy - 3.2)) < 2.3:
                                    ch = "@"
                            else:
                                if d_up * s < 4.5:
                                    ch = "-" if d_up * s > 3 else "="
                                elif (c + r) % 2 == 0 and r % 2 == 0:
                                    ch = "."
                                else:
                                    ch = " "
                    # складка века
                    elif up - 5.5 * (0.4 + 0.6 * o) <= v < up - 3.0 and abs(u) < self.A - 3:
                        ch = "="
                if ch is not None and self.rnd[r][c] < p:
                    cells[(r, c)] = ch
        # ресницы
        for u0 in range(-24, 25, 6):
            l = self.lids(u0, o)
            if not l:
                continue
            dx = (u0 / self.A) * 0.9
            for k in range(1, 3):
                rr = int(round(cy + l[0] * s / 2)) - k
                cc = int(round(cx + u0 * s + dx * k * 2.2))
                if 0 <= rr < self.rows and 0 <= cc < self.cols and self.rnd[rr][cc] < p:
                    cells[(rr, cc)] = "/" if dx > 0.3 else ("\\" if dx < -0.3 else "|")
        # бровь
        for u0 in range(-32, 33):
            t = u0 / 34.0
            vb = -(self.HU * o + 9) - 3 * (1 - t * t) + 6 * t * t
            rr = int(round(cy + vb * s / 2))
            cc = int(round(cx + u0 * s))
            if 0 <= rr < self.rows and 0 <= cc < self.cols and self.rnd[rr][cc] < p:
                cells[(rr, cc)] = "~" if abs(u0) > 24 else "="
        return cells

    def frame(self, t):
        rows, cols = self.rows, self.cols
        grid = [[(" ", 0)] * cols for _ in range(rows)]
        dot_p = clamp(t / 1.5)
        for r in range(0, rows, 2):
            for c in range(0, cols, 2):
                if self.rnd[r][c] < dot_p:
                    grid[r][c] = (".", DIM)
        # моргание и взгляд
        tt = max(0.0, t - 3.0)
        o = 1.0
        ph = tt % 3.6
        if tt > 0 and ph < 0.28:
            o = abs(ph - 0.14) / 0.14 * 0.92 + 0.08
        gx = math.sin(tt * 0.9) * 0.9 if tt > 0 else 0
        gy = math.sin(tt * 0.55 + 1) * 0.5 if tt > 0 else 0
        p = clamp((t - 0.8) / 2.2)
        for (r, c), ch in self.eye_layer(o, gx, gy, p).items():
            # внутри глаза фоновые точки стираются
            grid[r][c] = (ch, EYE)
        # надпись: "расшифровка" символов
        t0 = 4.2
        n = len(TEXT)
        x0 = int((cols - n) / 2)
        for i, chx in enumerate(TEXT):
            show_at = t0 + i * 0.07
            if t < show_at - 0.35:
                continue
            c = x0 + i
            if not (0 <= c < cols):
                continue
            if t < show_at:
                grid[self.text_row][c] = (random.choice("01@#%&*+=$"), EYE)
            else:
                grid[self.text_row][c] = (chx, TXT)
        return grid


def to_ansi(grid):
    out, last = [], None
    for row in grid:
        for ch, col in row:
            if col != last:
                out.append(RESET + col if col else RESET)
                last = col
            out.append(ch)
        out.append("\n")
        last = None
        out.append(RESET)
    out[-2] = ""  # без лишнего перевода строки внизу
    return "".join(out)


def main():
    setup_console()
    if "--still" in sys.argv:  # быстрый предпросмотр без цветов
        cols, rows = 100, 32
        sc = Scene(cols, rows)
        t = float(sys.argv[sys.argv.index("--still") + 1]) if len(sys.argv) > sys.argv.index("--still") + 1 else 9.0
        print("\n".join("".join(ch for ch, _ in row) for row in sc.frame(t)))
        return
    size = shutil.get_terminal_size((100, 32))
    cols, rows = size.columns, size.lines - 1
    sc = Scene(cols, rows)
    w = sys.stdout.write
    w("\x1b[?25l\x1b[2J")
    start = time.time()
    try:
        while True:
            t = time.time() - start
            w("\x1b[H" + to_ansi(sc.frame(t)))
            sys.stdout.flush()
            if key_pressed():
                break
            time.sleep(1.0 / FPS)
    except KeyboardInterrupt:
        pass
    finally:
        w(RESET + "\x1b[?25h\x1b[2J\x1b[H")


if __name__ == "__main__":
    main()
