#!/usr/bin/env python3
"""Extract MEL Section Two (CAS Message Relief) and the NEF Deferral List from the
P&G D195 MELs into MelItem-shaped JSON.

Input is `pdftotext -layout` output — the layout flag is load-bearing: these are
column tables and the column x-positions are read off each page's own header row,
because the indentation drifts page to page.

Nothing here infers content. Every field is a verbatim slice of the document, with
two documented exceptions marked DERIVED below.
"""
import json
import re
import sys
from collections import defaultdict

# The G650ER footer reads "Aircraft: G650ER"; the G500's reads "Aircraft: G-500".
# Missing the hyphen lets the whole footer leak into the table columns.
FOOTER = re.compile(r"^\s*Aircraft:\s*G[-\s]?\d")
REV = re.compile(r"Revision No:\s*(\S+)\s+Date:\s*(\d{2})-(\d{2})-(\d{2})")
# Running heads and the one sub-area heading ("Lavatories", which subdivides area 400).
# These sit inside the procedure column and would otherwise be read as procedure text.
CENTERED_NOISE = re.compile(
    r"^\s*(CAS Message|Minimum Equipment List|NEF Program|NEF"
    r"|Intentionally Left Blank|Lavatories)\s*$"
)
# "(Amber – Caution)" / "(Cyan- Advisory)" — the en-dash and the spacing both vary, and
# on narrower pages the pair wraps into the middle of the message rather than onto its
# own trailing line, so this is searched anywhere in the name and then cut out.
COLOR = re.compile(r"\((White|Blue|Cyan|Amber|Red|Green)\s*[–-]\s*(\w+)\)")


def iso_date(m):
    mm, dd, yy = m.group(2), m.group(3), m.group(4)
    return f"20{yy}-{mm}-{dd}"


# ── Section Two: CAS Message Relief ────────────────────────────────────────────

CAS_HDR = re.compile(r"^(\s*)Item #\s+Item\s+Dispatch Consideration\s*$")
CAT_HDR = re.compile(r"^\s*Repair Category\s*$")
CAS_ID = re.compile(r"^(\d+-\d+)$")


def parse_cas(lines, actype):
    items, warnings = [], []
    i, n = 0, len(lines)
    rev, eff = None, None

    while i < n:
        line = lines[i]
        m = REV.search(line)
        if m:
            rev, eff = m.group(1), iso_date(m)

        h = CAS_HDR.match(line)
        if not h:
            i += 1
            continue

        # Column geometry from this page's own header pair.
        name_col = line.index("Item", line.index("Item #") + 6)
        disp_col = line.index("Dispatch Consideration")
        cat_col = None
        for back in range(1, 4):
            if i - back >= 0 and CAT_HDR.match(lines[i - back]):
                cat_col = lines[i - back].index("Repair Category")
                break
        if cat_col is None or not (name_col < cat_col < disp_col):
            warnings.append(f"{actype}: unreadable column geometry at line {i + 1}")
            i += 1
            continue

        page_items, cur = [], None
        j = i + 1
        while j < n:
            ln = lines[j]
            if FOOTER.match(ln) or CAS_HDR.match(ln) or CAT_HDR.match(ln):
                break
            if ln.startswith("Operations (O)") or ln.startswith("Maintenance (M)"):
                break
            if CENTERED_NOISE.match(ln):
                j += 1
                continue

            head = ln[:name_col].strip()
            if CAS_ID.match(head):
                cur = {
                    "itemNumber": head,
                    "name": [ln[name_col:cat_col].strip()],
                    "category": ln[cat_col:disp_col].strip(),
                    "dispatch": [ln[disp_col:].rstrip()],
                }
                page_items.append(cur)
            elif cur is not None:
                left = ln[name_col:cat_col].strip()
                right = ln[disp_col:].rstrip()
                if left:
                    cur["name"].append(left)
                if right.strip():
                    cur["dispatch"].append(right)
            j += 1

        # Trailing Operations (O) / Maintenance (M) blocks belong to this page.
        blocks = {}
        while j < n:
            ln = lines[j]
            if FOOTER.match(ln) or CAS_HDR.match(ln) or CAT_HDR.match(ln):
                break
            key = None
            if ln.startswith("Operations (O)"):
                key = "O"
            elif ln.startswith("Maintenance (M)"):
                key = "M"
            if key:
                body, j = [], j + 1
                while j < n:
                    b = lines[j]
                    if (
                        FOOTER.match(b)
                        or CAS_HDR.match(b)
                        or CAT_HDR.match(b)
                        or b.startswith("Operations (O)")
                        or b.startswith("Maintenance (M)")
                    ):
                        break
                    if not CENTERED_NOISE.match(b):
                        body.append(b.rstrip())
                    j += 1
                blocks[key] = tidy(body)
                continue
            j += 1

        # A sub-variant row leaves the Item column blank and sits directly under the row
        # whose message it shares — e.g. 2-32 under "2-31 Wing Anti-Ice Maint Reqd, L-R",
        # the both-sides variant of the same message. It inherits the message text, never
        # a repair category or a proviso, which it always states for itself.
        for k, it in enumerate(page_items):
            if not "".join(it["name"]).strip() and k > 0:
                it["name"] = list(page_items[k - 1]["name"])
                it["inheritedMessage"] = True

        for it in page_items:
            it["blocks"] = blocks
            it["rev"], it["eff"] = rev, eff
        if blocks and len(page_items) > 1:
            marked = [
                it for it in page_items if re.search(r"\((O|M)\)", " ".join(it["dispatch"]))
            ]
            if len(marked) != 1:
                warnings.append(
                    f"{actype}: page with {len(page_items)} items shares an (O)/(M) block "
                    f"({', '.join(it['itemNumber'] for it in page_items)}) — attached to "
                    f"{len(marked)} marked item(s)"
                )
            for it in page_items:
                if it not in marked:
                    it["blocks"] = {}

        items.extend(page_items)
        i = j

    return [to_cas_melitem(it, actype) for it in items], warnings


def unwrap(text):
    """Rejoin a word the PDF broke across lines at a hyphen: "L- R" -> "L-R"."""
    return re.sub(r"(?<=\w)- (?=\w)", "-", text)


def tidy(lines):
    out, buf = [], []
    for ln in lines:
        if ln.strip():
            buf.append(ln.strip())
        elif buf:
            out.append(" ".join(buf))
            buf = []
    if buf:
        out.append(" ".join(buf))
    return " ".join(out).strip()


def to_cas_melitem(it, actype):
    message = " ".join(x for x in it["name"] if x).strip()
    color = level = None
    cm = COLOR.search(message)
    if cm:
        color, level = cm.group(1).upper(), cm.group(2).upper()
        message = (message[: cm.start()] + " " + message[cm.end() :]).strip()
    # A message continued across a page break repeats the item number under a
    # "(Continued)" marker; the marker is page furniture, not part of the message.
    message = re.sub(r"\(Continued\)", "", message)
    message = unwrap(re.sub(r"\s{2,}", " ", message)).strip(" -–")

    out = {
        "id": f"mel-{actype.lower()}-cas-{it['itemNumber']}",
        "_inherited": bool(it.get("inheritedMessage")),
        "aircraftType": actype,
        "mmelRevision": f"Rev {it['rev']}" if it["rev"] and it["rev"] != "Original" else "Original",
        "effectiveDate": it["eff"],
        "approvalState": "APPROVED",
        "melSection": "TWO",
        "ataReference": "",  # Section Two is keyed by CAS message, not ATA. Not inferred.
        "itemNumber": it["itemNumber"],
        "subItemNumber": it["itemNumber"],
        "title": message,
        "category": it["category"] if it["category"] in ("A", "B", "C", "D") else None,
        "numberInstalled": None,
        "numberRequired": None,
        "casMessage": message,
    }
    if color:
        out["casColor"] = color
        out["casLevel"] = level
    provisos = tidy(it["dispatch"])
    if provisos:
        out["provisos"] = provisos
    if it["blocks"].get("O"):
        out["oProcedure"] = it["blocks"]["O"]
    if it["blocks"].get("M"):
        out["mProcedure"] = it["blocks"]["M"]
    return out


# ── NEF Deferral List ─────────────────────────────────────────────────────────

NEF_HDR = re.compile(r"^(\s*)Item #\s+Item Name\s+\(M\)\(O\) Procedures\s*$")
# One row is numbered "N200-31N" — the suffix letter is part of the item number.
NEF_ID = re.compile(r"^(N\d{3}-\d+[A-Z]?)$")
AREA = re.compile(r"^\s*([A-Z][A-Z ,/&]+)\s*\((\d00)\)\s*$")

# DERIVED (1 of 2): the NEF Deferral List page header states the placard rule once,
# for every item on the list. Carried verbatim onto each row rather than restated.
NEF_PLACARD_TEXT = (
    "Place MEL Placard in a Prominent Location Visible by the Flight Crew. "
    "Place MEL Placard near affected NEF Item as necessary."
)


def parse_nef(lines, actype):
    items, warnings = [], []
    i, n = 0, len(lines)
    rev, eff, area = None, None, None

    while i < n:
        line = lines[i]
        m = REV.search(line)
        if m:
            rev, eff = m.group(1), iso_date(m)
        am = AREA.match(line)
        if am:
            area = f"{am.group(1).strip().title()} ({am.group(2)})"

        h = NEF_HDR.match(line)
        if not h:
            i += 1
            continue

        name_col = line.index("Item Name")
        proc_col = line.index("(M)(O) Procedures")
        cur = None
        j = i + 1
        while j < n:
            ln = lines[j]
            if FOOTER.match(ln) or NEF_HDR.match(ln):
                break
            am = AREA.match(ln)
            if am:
                area = f"{am.group(1).strip().title()} ({am.group(2)})"
                j += 1
                continue
            if CENTERED_NOISE.match(ln):
                j += 1
                continue

            head = ln[:name_col].strip()
            if NEF_ID.match(head):
                cur = {
                    "itemNumber": head,
                    "name": [ln[name_col:proc_col].strip()],
                    "proc": [ln[proc_col:].rstrip()],
                    "area": area,
                    "rev": rev,
                    "eff": eff,
                }
                items.append(cur)
            elif cur is not None:
                left = ln[name_col:proc_col].strip()
                right = ln[proc_col:].rstrip()
                if left:
                    cur["name"].append(left)
                if right.strip():
                    cur["proc"].append(right)
            j += 1
        i = j

    return [to_nef_melitem(it, actype) for it in items], warnings


PROC_SPLIT = re.compile(r"\((M|O)\)\s*")


def to_nef_melitem(it, actype):
    name = unwrap(" ".join(x for x in it["name"] if x).strip())
    body = tidy(it["proc"])

    condition, o_proc, m_proc = None, None, None
    parts = PROC_SPLIT.split(body)
    if parts and parts[0].strip():
        condition = parts[0].strip()
    for k in range(1, len(parts) - 1, 2):
        tag, text = parts[k], parts[k + 1].strip()
        if tag == "M":
            m_proc = text
        else:
            o_proc = text

    def keep(v):
        return v if v and v.rstrip(".").strip().lower() != "none" else None

    out = {
        "id": f"mel-{actype.lower()}-nef-{it['itemNumber'].lower()}",
        "aircraftType": actype,
        "mmelRevision": f"Rev {it['rev']}" if it["rev"] and it["rev"] != "Original" else "Original",
        "effectiveDate": it["eff"],
        "approvalState": "APPROVED",
        "melSection": "NEF",
        # The NEF program's authority is MMEL/MEL item 25-22 (ATA 25 Equipment /
        # Furnishings), which is where the FAA grants it. Stated in the document.
        "ataReference": "25",
        "itemNumber": it["itemNumber"],
        "subItemNumber": it["itemNumber"],
        "title": name,
        # NEF carries no repair category: "repaired at the earliest opportunity".
        "category": None,
        "numberInstalled": None,
        "numberRequired": None,
        "nefArea": it["area"],
        "placardText": NEF_PLACARD_TEXT,
        # DERIVED (2 of 2): MEL item 25-22-01, the item that grants the NEF program its
        # authority, is marked "Flight Crew Deferral Item: YES" in both MELs.
        "flightCrewDeferral": True,
    }
    if keep(m_proc):
        out["mProcedure"] = m_proc
    if keep(o_proc):
        out["oProcedure"] = o_proc
    if condition:
        out["provisos"] = condition
    return out


def main():
    all_items, all_warnings = [], []
    for path, actype in [(sys.argv[1], "G650ER"), (sys.argv[2], "G500")]:
        lines = open(path, encoding="utf-8", errors="replace").read().split("\n")
        cas, w1 = parse_cas(lines, actype)
        nef, w2 = parse_nef(lines, actype)
        all_warnings += w1 + w2
        print(f"{actype}: {len(cas)} CAS relief items, {len(nef)} NEF items", file=sys.stderr)
        all_items += cas + nef

    # N900-1..8 are the blank write-in slots the paper NEF Checklist is signed into
    # ("Additional Items Added Upon Completion of NEF Check List"). They carry no item,
    # so they are form furniture, not catalog entries.
    blanks = [it["id"] for it in all_items if it["itemNumber"].startswith("N900")]
    all_items = [it for it in all_items if not it["itemNumber"].startswith("N900")]
    if blanks:
        print(f"dropped {len(blanks)} blank NEF write-in slots (N900-*)", file=sys.stderr)

    # An item whose table runs over a page break is emitted twice under the same item
    # number. Fold the later fragment into the first rather than shipping both.
    merged = {}
    for it in all_items:
        prior = merged.get(it["id"])
        if prior is None:
            merged[it["id"]] = it
            continue
        for field in ("provisos", "oProcedure", "mProcedure"):
            if it.get(field):
                prior[field] = f"{prior[field]} {it[field]}".strip() if prior.get(field) else it[field]
        if not prior["title"] and it["title"]:
            prior["title"] = it["title"]
            prior["casMessage"] = it["title"]
        for field in ("casColor", "casLevel", "category"):
            if prior.get(field) is None and it.get(field) is not None:
                prior[field] = it[field]
    all_items = list(merged.values())

    empty = [it["id"] for it in all_items if not it["title"].strip()]
    if empty:
        all_warnings.append(f"{len(empty)} items with no title survived merge: {empty}")
    missing_color = [
        it["id"] for it in all_items if it["melSection"] == "TWO" and not it.get("casColor")
    ]
    if missing_color:
        all_warnings.append(
            f"{len(missing_color)} Section Two items with no annunciation colour: {missing_color}"
        )

    for w in all_warnings:
        print(f"WARN {w}", file=sys.stderr)
    json.dump(all_items, open(sys.argv[3], "w"), indent=2, ensure_ascii=False)
    print(f"wrote {len(all_items)} items -> {sys.argv[3]}", file=sys.stderr)


if __name__ == "__main__":
    main()
