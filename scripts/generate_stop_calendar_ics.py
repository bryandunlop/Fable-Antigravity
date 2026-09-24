#!/usr/bin/env python3
"""Convert the GFO Pilot STOP Schedule PDF into iCalendar (.ics) files.

The PDF renders each event as a single-cell coloured chip anchored on its
START date; spans are implied by the rotation rules printed on the cover
page, not drawn in the grid. This script recovers the chips by geometry
(fill colour -> event type, cell position -> date) and then expands them
into real date ranges:

    STOP 1            Monday -> Sunday (7 days off)
    STOP 1 weekend    Saturday -> Sunday (2 days off)
    STOP 2/3/FLEX     Saturday -> Sunday (2 days off)
    P&G holiday       single day
    BOD trip          single day

The "<group> STOP 1 WKND" chip marks the trailing weekend of that group's
own STOP 1 week. It is emitted as its own entry, matching the PDF, so it
deliberately overlaps the STOP 1 week it belongs to.

Pilot training is skipped: GFO tracks training on a separate calendar.
Set INCLUDE_TRAINING to re-enable it.

Usage:
    python3 scripts/generate_stop_calendar_ics.py <schedule.pdf> [outdir]

Requires: pdfplumber
"""
from __future__ import annotations

import datetime as dt
import hashlib
import re
import sys
from collections import defaultdict
from pathlib import Path

import pdfplumber

# --- PDF geometry -----------------------------------------------------------

MONTHS = {m: i + 1 for i, m in enumerate(
    "January February March April May June July August September "
    "October November December".split())}

# Left edge of each weekday column (Sunday..Saturday) in PDF points.
COLUMN_EDGES = [29.2, 134.2, 239.2, 344.2, 449.2, 554.2, 659.2, 764.2]

# Chip fill colour -> event type, taken from the PDF legend.
CHIP_COLOURS = {
    (0.0000, 0.2392, 0.6471): "STOP1",     # dark blue   - STOP 1 (Mon-Sun)
    (0.8627, 0.9020, 0.9647): "STOP23",    # pale blue   - STOP 2 / 3 weekend
    (0.0000, 0.6392, 0.8784): "FLEX",      # cyan        - STOP 4 (FLEX) weekend
    (0.9451, 0.7059, 0.2039): "TRAINING",  # amber       - pilot training
    (0.9961, 0.8588, 0.0000): "HOLIDAY",   # yellow      - P&G holiday
    (0.6863, 0.0863, 0.5216): "BOD",       # magenta     - BOD trip
}

# --- Facts stated in the PDF prose, not recoverable from the grid -----------

# Cover page lists the eleven P&G holidays absorbed by the rotation; the grid
# chips only say "P&G HOLIDAY".
HOLIDAY_NAMES = {
    "2027-01-18": "MLK Day",
    "2027-02-15": "Presidents' Day",
    "2027-05-31": "Memorial Day",
    "2027-06-18": "Juneteenth (observed)",
    "2027-07-05": "Independence Day (observed)",
    "2027-09-06": "Labor Day",
    "2027-11-25": "Thanksgiving",
    "2027-11-26": "Day after Thanksgiving",
    "2027-12-24": "Christmas Eve",
    "2027-12-25": "Christmas Day",
    "2027-12-31": "New Year's Eve",
}

# The only two training courses whose length the PDF states (RESIDUAL TRAINING
# CONFLICTS on the cover page). Values are INCLUSIVE last days.
TRAINING_END_DATES = {
    ("2027-04-01", "G800 Initial - JRG/JWB"): "2027-04-06",
    ("2027-06-10", "G800 Initial - RGP/MTS"): "2027-06-14",
}

# GFO manages pilot training on its own calendar, so those chips are not
# emitted. Flip this to True to include them.
INCLUDE_TRAINING = False

# Roster changes made after the PDF was drawn. The PDF stays the source of
# truth for dates; only who sits in which group is overridden here.
#
# PILOT_MOVES maps a pilot to the printed group whose rotation they now
# follow. They are removed from their printed group and added to the target.
PILOT_MOVES = {
    "TBD": "ATK/JRG",   # TBD now flies the slot-1 rotation
}

# PILOT_RENAMES is applied last, so a moved pilot can also be renamed.
PILOT_RENAMES = {
    "TBD": "AJW",       # JL1's replacement, now named
}


def resolve_group(printed: str) -> tuple[str, list[str]]:
    """Map a printed group label to its current (display name, members)."""
    members = [p for p in printed.split("/") if p not in PILOT_MOVES]
    members += sorted(p for p, dest in PILOT_MOVES.items() if dest == printed)
    members = [PILOT_RENAMES.get(p, p) for p in members]
    return "/".join(members), members

TRAINING_NOTE = ("The schedule marks only the start date for this course; the "
                 "PDF does not state its length. Confirm the end date before "
                 "relying on it.")

UID_NAMESPACE = "2027-gfo-pilot-stop-schedule"


def classify(colour) -> str:
    best, best_dist = None, 9.0
    for ref, name in CHIP_COLOURS.items():
        dist = sum(abs(a - b) for a, b in zip(ref, colour))
        if dist < best_dist:
            best, best_dist = name, dist
    if best_dist >= 0.05:
        raise ValueError(f"unrecognised chip colour {colour}")
    return best


def parse_pdf(path: Path) -> list[dict]:
    """Return one record per chip: {date, kind, label}."""
    chips: list[dict] = []
    with pdfplumber.open(str(path)) as pdf:
        for page in pdf.pages:
            words = page.extract_words()
            texts = {w["text"] for w in words}
            if not {"SUNDAY", "WEDNESDAY", "SATURDAY"} <= texts:
                continue  # not a month grid
            titles = [w for w in words if w["text"] in MONTHS and w["top"] < 60]
            if not titles:
                continue
            month = MONTHS[titles[0]["text"]]
            years = [w["text"] for w in words
                     if w["top"] < 60 and re.fullmatch(r"20\d\d", w["text"])]
            year = int(years[0]) if years else 2027

            # Day numbers are right-aligned against their column's right edge.
            grid: dict[float, dict[int, int]] = defaultdict(dict)
            for w in words:
                if not re.fullmatch(r"\d{1,2}", w["text"]):
                    continue
                for col in range(7):
                    if abs(w["x1"] - (COLUMN_EDGES[col + 1] - 2.0)) < 4:
                        grid[round(w["top"], 0)][col] = int(w["text"])
            rows = {top: cells for top, cells in grid.items() if len(cells) >= 5}
            if not rows:
                continue
            row_dates = _resolve_rows(rows, year, month)
            tops = sorted(rows)

            for chip in page.curves:
                col = next((c for c in range(7)
                            if COLUMN_EDGES[c] - 3 <= chip["x0"] <= COLUMN_EDGES[c] + 8), None)
                if col is None:
                    continue
                top = max((t for t in tops if t < chip["top"]), default=None)
                if top is None:
                    continue
                date = row_dates[top] + dt.timedelta(days=col)
                label = " ".join(
                    w["text"] for w in words
                    if chip["x0"] - 2 <= w["x0"] <= chip["x1"]
                    and chip["top"] - 2 <= w["top"] and w["bottom"] <= chip["bottom"] + 2)
                chips.append({"date": date.isoformat(),
                              "kind": classify(chip["non_stroking_color"]),
                              "label": label})
    # Month pages overlap at the seams, so the same chip is read more than once.
    unique = {(c["date"], c["kind"], c["label"]): c for c in chips}
    return sorted(unique.values(), key=lambda c: (c["date"], c["label"]))


def _resolve_rows(rows: dict[float, dict[int, int]], year: int, month: int) -> dict[float, dt.date]:
    """Map each grid row to the date of its Sunday cell.

    A row is matched by requiring every day number in it to line up with a
    candidate week. February and March 2027 share an identical layout, so some
    rows are ambiguous alone; those are fixed by the fact that rows on a page
    are consecutive weeks.
    """
    first = dt.date(year, month, 1)
    candidates: dict[float, list[dt.date]] = {}
    for top, cells in rows.items():
        matches = []
        for offset in range(-45, 46):
            sunday = first + dt.timedelta(days=offset)
            if sunday.weekday() != 6:  # Sunday
                continue
            if all((sunday + dt.timedelta(days=c)).day == d for c, d in cells.items()):
                matches.append(sunday)
        candidates[top] = matches

    ordered = sorted(candidates)
    anchors = [(i, m[0]) for i, top in enumerate(ordered)
               for m in [candidates[top]] if len(m) == 1]
    if not anchors:
        raise ValueError("no unambiguous week on page")
    index, anchor = anchors[0]

    resolved = {}
    for i, top in enumerate(ordered):
        expected = anchor + dt.timedelta(days=7 * (i - index))
        if expected not in candidates[top]:
            raise ValueError(f"week {expected} does not match the printed grid")
        resolved[top] = expected
    for i, date in anchors:
        if resolved[ordered[i]] != date:
            raise ValueError("conflicting week anchors on one page")
    return resolved


# --- Chips -> calendar events ----------------------------------------------

class Event:
    def __init__(self, summary, start, end_exclusive, description, categories, key):
        self.summary = summary
        self.start = start
        self.end = end_exclusive
        self.description = description
        self.categories = categories
        self.uid = (hashlib.sha1(f"{UID_NAMESPACE}|{key}".encode()).hexdigest()
                    + "@mygfo.local")


def build_events(chips: list[dict]) -> tuple[list[Event], dict[str, list[Event]]]:
    """Return (all events, events per pilot)."""
    day = dt.timedelta(days=1)
    events: list[Event] = []
    per_pilot: dict[str, list[Event]] = defaultdict(list)
    printed_groups = sorted({c["label"].split()[0] for c in chips
                             if c["kind"] in ("STOP1", "STOP23", "FLEX")})
    pilots = sorted({p for g in printed_groups for p in resolve_group(g)[1]})

    for chip in chips:
        date = dt.date.fromisoformat(chip["date"])
        kind, label = chip["kind"], chip["label"]

        if kind == "STOP1":
            group, members = resolve_group(label.split()[0])
            if label.endswith("STOP 1 WKND"):
                # The trailing Sat/Sun of this group's own STOP 1 week. The PDF
                # marks it separately, so it is kept as its own entry and
                # overlaps the seven-day event.
                ev = Event(f"STOP 1 weekend — {group}", date, date + 2 * day,
                           "Weekend off (Saturday and Sunday), the tail of "
                           f"this group's STOP 1 week.\nCrew group {group}.",
                           ["STOP", "STOP 1 weekend"], f"stop1wknd|{group}|{date}")
            else:
                ev = Event(f"STOP 1 — {group}", date, date + 7 * day,
                           "Seven days off, Monday through Sunday.\n"
                           f"Crew group {group}.",
                           ["STOP", "STOP 1"], f"stop1|{group}|{date}")
            _assign(ev, events, per_pilot, members)

        elif kind in ("STOP23", "FLEX"):
            group, members = resolve_group(label.split()[0])
            if kind == "FLEX":
                name, cats = "STOP 4 (FLEX) weekend", ["STOP", "STOP 4 FLEX"]
            else:
                num = "2" if "STOP 2" in label else "3"
                name, cats = f"STOP {num} weekend", ["STOP", f"STOP {num}"]
            ev = Event(f"{name} — {group}", date, date + 2 * day,
                       f"Weekend off (Saturday and Sunday).\nCrew group {group}.",
                       cats, f"{kind}|{label}|{date}")
            _assign(ev, events, per_pilot, members)

        elif kind == "HOLIDAY":
            name = HOLIDAY_NAMES.get(chip["date"])
            summary = f"P&G Holiday — {name}" if name else "P&G Holiday"
            ev = Event(summary, date, date + day,
                       "P&G company holiday.", ["P&G Holiday"],
                       f"holiday|{date}")
            _assign(ev, events, per_pilot, pilots)

        elif kind == "BOD":
            ev = Event("BOD Trip", date, date + day,
                       "Board of Directors trip.", ["BOD Trip"], f"bod|{date}")
            _assign(ev, events, per_pilot, pilots)

        elif kind == "TRAINING":
            if not INCLUDE_TRAINING:
                continue
            course, _, who = label.partition(" - ")
            attendees = [PILOT_RENAMES.get(p, p) for p in who.split("/") if p]
            who = "/".join(attendees)
            end_inclusive = TRAINING_END_DATES.get((chip["date"], label))
            if end_inclusive:
                end = dt.date.fromisoformat(end_inclusive) + day
                note = ""
            else:
                end = date + day
                note = "\n\n" + TRAINING_NOTE
            ev = Event(f"Training: {course} — {who}", date, end,
                       f"{course}\nPilots: {', '.join(attendees)}.{note}",
                       ["Training"], f"training|{label}|{date}")
            _assign(ev, events, per_pilot, attendees)

        else:
            raise ValueError(f"unhandled chip kind {kind}")

    events.sort(key=lambda e: (e.start, e.summary))
    for pilot in per_pilot:
        per_pilot[pilot].sort(key=lambda e: (e.start, e.summary))
    return events, dict(per_pilot)


def _assign(ev, events, per_pilot, pilots):
    events.append(ev)
    for pilot in pilots:
        per_pilot[pilot].append(ev)


# --- iCalendar output -------------------------------------------------------

def escape(text: str) -> str:
    return (text.replace("\\", "\\\\").replace(";", r"\;")
                .replace(",", r"\,").replace("\n", r"\n"))


def fold(line: str) -> str:
    """Fold to 75 octets per RFC 5545, without splitting a UTF-8 sequence."""
    raw = line.encode("utf-8")
    if len(raw) <= 75:
        return line
    chunks, start = [], 0
    limit = 75
    while start < len(raw):
        end = min(start + limit, len(raw))
        while end > start and end < len(raw) and (raw[end] & 0xC0) == 0x80:
            end -= 1  # do not cut mid-character
        chunks.append(raw[start:end].decode("utf-8"))
        start, limit = end, 74  # continuation lines carry a leading space
    return "\r\n ".join(chunks)


def render_ics(events: list[Event], name: str, description: str) -> str:
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//P&G Global Flight Operations//2027 Pilot STOP Schedule//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:{escape(name)}",
        f"X-WR-CALDESC:{escape(description)}",
        "X-WR-TIMEZONE:America/New_York",
    ]
    for ev in events:
        lines += [
            "BEGIN:VEVENT",
            f"UID:{ev.uid}",
            f"DTSTAMP:{stamp}",
            f"DTSTART;VALUE=DATE:{ev.start:%Y%m%d}",
            f"DTEND;VALUE=DATE:{ev.end:%Y%m%d}",
            f"SUMMARY:{escape(ev.summary)}",
            f"DESCRIPTION:{escape(ev.description)}",
            f"CATEGORIES:{','.join(escape(c) for c in ev.categories)}",
            "TRANSP:TRANSPARENT",
            "STATUS:CONFIRMED",
            "END:VEVENT",
        ]
    lines.append("END:VCALENDAR")
    return "".join(fold(l) + "\r\n" for l in lines)


def main(argv: list[str]) -> int:
    if not 2 <= len(argv) <= 3:
        print(__doc__)
        return 2
    pdf_path = Path(argv[1])
    outdir = Path(argv[2] if len(argv) == 3 else ".")
    outdir.mkdir(parents=True, exist_ok=True)

    chips = parse_pdf(pdf_path)
    events, per_pilot = build_events(chips)

    disclaimer = ("Generated from the 2027 GFO Pilot STOP Schedule (proposed "
                  "rotation). Dates are all-day and unzoned; the source "
                  "document is Eastern Time.")

    combined = outdir / "2027_GFO_STOP_Schedule.ics"
    combined.write_text(render_ics(
        events, "2027 GFO Pilot STOP Schedule",
        "All crew groups. " + disclaimer), encoding="utf-8")
    print(f"{combined}  ({len(events)} events)")

    pilot_dir = outdir / "by-pilot"
    pilot_dir.mkdir(exist_ok=True)
    for pilot, pilot_events in sorted(per_pilot.items()):
        path = pilot_dir / f"2027_GFO_STOP_{pilot}.ics"
        path.write_text(render_ics(
            pilot_events, f"2027 STOP Schedule — {pilot}",
            f"Crew rotation for {pilot}. " + disclaimer), encoding="utf-8")
        print(f"{path}  ({len(pilot_events)} events)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
