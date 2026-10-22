# The airport knowledge loop — brief before, debrief after

- **Status:** Concept for discussion — 2026-10-22. Not approved for build.
- **Author:** Bryan Dunlop (idea) + Claude (structure)
- **Parent:** [`ROADMAP.md`](./ROADMAP.md), Horizon 1 (the loop without AI) and Horizon 4 (Airflow).
- **Builds on:** the airport module prototype in `src/airport/` and `src/components/airport-info/`. That prototype already has source labels on every fact, propose → review → publish with chief-pilot routing on safety fields (D46), per-field "last confirmed" dates (D54), and the evaluation officer's worklist (LG-83). Check with the production developer what exists on the real platform before treating any of this as new.

---

## 1. The idea in one paragraph

Before a flight, each crew member sees one briefing per airport on the trip. It brings together official data, our company page, our own history at that airport, and what recent crews reported. Every line says **where it came from and how old it is**, so a pilot can tell what is authoritative from what a colleague said. After the trip, and always after an international trip, the crew debriefs in under two minutes. They confirm what was still true, correct what was not, and add what was missing. Those debriefs feed the company page through review, so the next crew's briefing is better than this one. Over time, the department's knowledge of the airports it flies to accumulates instead of leaving with the people who carry it.

## 2. A naming note: 10-7, not 10-9

In Jeppesen's numbering, the **10-9** page is the airport chart: diagram, runway data, takeoff and alternate minimums. That is licensed chart content, and we should never rebuild or restate it. The operator-specific "company pages" are the **10-7** series, written by the operator and published by Jeppesen for that operator only. What myGFO builds is a living 10-7: our own operating guidance for an airport, sitting beside the official charts, never replacing them.

## 3. Four tiers of truth

"Told what is real and what is user generated" is the heart of this. A two-way split is not enough, because our own trip history is real but not official, and a company page is reviewed but not regulatory. Four tiers, each visibly different on screen:

| Tier | Examples | Who can change it | How it is shown |
|---|---|---|---|
| **1. Official** | FAA NASR runways and services, NOTAMs, charts via ForeFlight/Jeppesen, Airflow's certified data | Nobody at GFO | Source and cycle date. Never overridden on screen. |
| **2. Company** | Our 10-7: preferred FBO, handler, customs process, PPR, curfews, ramp limits, crew hotel guidance | Through propose → review → publish. Safety fields need the chief pilot. | "Company", with the date each field was last confirmed. |
| **3. Our history** | Our past trips here, irregularity reports, squawks raised here, typical taxi time, catering issues | Derived from our own records | "From N GFO trips", with the date of the latest one. |
| **4. Crew reported** | Debrief notes not yet reviewed | The crew member who wrote it, until reviewed | "Crew report, unreviewed", with the date and the reporter's role. Hidden after a set age unless confirmed again. |

**Rules that keep the tiers honest:**

- A lower tier never overwrites a higher one on screen. A crew report that contradicts official data is shown as a **conflict** and routed to the chief pilot. It is never shown as the answer.
- A crew report becomes company content only through the existing proposal review. Nothing auto-promotes.
- Age is visible on every line. Something nobody has confirmed for a long time is flagged rather than presented as current.

## 4. Before the flight — the briefing

One card per airport on the leg, inside the Flight Hub and pushed to ForeFlight. Ordered by what changes a decision, not by data source:

1. **Restrictions and hazards** — curfews, PPR, noise, runway or ramp limits, active NOTAMs that touch our aircraft type. Official and company tiers only.
2. **What changed since our last visit** — new NOTAMs, company fields edited, crew reports since the last GFO trip here.
3. **What our crews said** — recent crew reports with their age, plus conflicts awaiting review.
4. **Our history** — "Last GFO visit 12 days ago. Typical taxi-out 14 min. One irregularity report in 12 months: customs delay."
5. **The company page** — FBO, handler, customs, hotel, catering, with last-confirmed dates.

The briefing should be short enough to read in the crew room. A long one gets skimmed, and then it is no safer than no briefing.

## 5. After the flight — the debrief

Triggered when the trip closes. **Required** after international trips, first visits, and airports with a stale or conflicted page. **Offered** otherwise. It asks only about what the crew saw:

1. **"Was everything as briefed?"** One tap for yes. That tap is not a throwaway. It **confirms every company field the crew was shown**, which is what keeps pages fresh without anyone doing review work. This is the most valuable button in the loop.
2. **"What was different?"** The briefed fields are listed. The crew taps the ones that were wrong and types or dictates what they saw.
3. **"Anything new?"** Free text or a voice note.
4. **Optional ratings** for the FBO, handler and catering.

The accountability ladder from the roadmap applies. Remind the PIC, then remind them again, then tell the chief pilot. But the one-tap path means an unchanged airport costs the crew about ten seconds, so escalation should be rare.

## 6. Closing the loop — review

Debrief items land on the Airport Evaluation Officer's worklist, which already exists in the prototype. For each item the officer can:

- **Accept** it into a proposal against the company page. The normal review applies, with the chief pilot on safety fields.
- **Keep** it as a crew report. It stays visible as tier 4 and ages out.
- **Reject** it, with a reason the reporter can see.

**Urgent items** use the Document Center's bulletin pattern. A safety-relevant crew report, such as "ramp closed to aircraft over 90,000 lb until March", can be published at once as an **airport bulletin** attached to the page. It is absorbed into the page at the next review and then retired, the same way bulletins are absorbed into manuals. The same idea applies twice in myGFO, so it should be built once.

## 7. Where the data comes from

| Source | What it gives | Limits |
|---|---|---|
| **FAA NASR** | US airports, runways, services, contacts. 28-day cycle. Free bulk download. | **US only.** The prototype already bundles it. |
| **FAA NOTAM API (NMS)** | Digital NOTAMs | Needs FAA-issued credentials. It is not an anonymous free API. |
| **FAA airport status service** | Delays and ground stops at major US airports | Free and unauthenticated. Only major airports. |
| **ForeFlight / Jeppesen** | Charts, worldwide airport data, the Dispatch airport tab | Licensed. We consume it, we do not copy it. |
| **Airflow** | Certified worldwide data, plus feasibility and briefing reasoning | Business-aviation agents announced 16 October 2026. Broader rollout planned for early 2027. |
| **myairops** | Our trips, handlers and FBOs used, times | Pull-only. |
| **myGFO** | Company pages, debriefs, irregularity reports, squawks, catering | Ours. |

**The international gap is the important pushback.** You said the debrief matters most internationally, and that is exactly where FAA data contributes nothing. Official international data comes through ForeFlight, Jeppesen and Airflow, not the FAA. So for international airports, tiers 2–4 carry most of the value, and the official tier depends on the Jepp ForeFlight relationship.

## 8. Where Airflow could fit

These are **hypotheses to test in the demos**, not facts about the product. What is public: Trip Feasibility checks customs, fire category, parking, noise restrictions, fuel availability and runway length. Ops Briefing gathers NOTAMs and weather and assesses their impact. Both are built into ForeFlight Dispatch. What is **not** public is whether operator data feeds into either.

1. **Before the flight, Airflow provides the official tier worldwide.** This fills the international gap.
2. **Before the flight, Airflow reads our company page.** If Ops Briefing can take operator content as input, our 10-7 and history reach the crew inside ForeFlight with no second app. This is the integration that would justify the effort.
3. **Checking our pages against Airflow.** Trip Feasibility and our company page both describe customs, parking, noise and fuel. Where they disagree, the officer should hear about it before a crew does.
4. **After the flight, an assistant structures the debrief.** It turns a voice note into proposed field changes, spots contradictions, and merges duplicate reports. This could be Airflow or our own agent, because the debrief data is ours. Either way it **drafts**, and the officer decides.

## 9. Distribution — one less app

The goal you described is two apps for crew: myGFO and ForeFlight. So the briefing has to reach ForeFlight, not just live in myGFO:

- **ForeFlight Documents:** a 10-7-style PDF per airport in the pilot content pack, mirrored from the group drive. The roadmap already plans this path.
- **Dispatch, per flight:** Dispatch supports dispatcher notes on a flight, and operational rules that can trigger crew notes. Either could carry the "what changed" summary for that leg. Confirm with ForeFlight which one fits.
- **Flight Hub:** the full interactive briefing, and the only place the debrief happens.

## 10. Risks

- **Debrief fatigue.** Without the one-tap path, crews will write nothing, or write "all good" without reading. The one-tap path is the design. Do not add questions.
- **A crew report treated as guidance.** That is a safety risk. Tier labels and conflict routing are the control, and the hidden-after-age rule stops old reports lingering.
- **Security of what crews write.** Hotels, security arrangements and principal movements do not belong in a briefing the whole department reads. Make sensitive fields restricted by default.
- **Two sources disagreeing.** Airflow and our company page will sometimes disagree. Decide the order now: official, then company, then crew. Show conflicts rather than resolving them silently.

## 11. Questions

1. Does the production platform already have airport pages, and does it use the same propose → review → publish model as the prototype?
2. Who is the Airport Evaluation Officer today, and how many airports would have a company page in year one? The roster should be airports GFO actually flies to, not all 2,000-plus in NASR.
3. Should company pages live in Document Center as controlled documents? That reuses the review, bulletin and audit machinery instead of keeping a second approval model.
4. Can ForeFlight Ops Briefing or Trip Feasibility take operator content as input? This is the first question for the demo. See the Airflow evaluation section of the roadmap.
