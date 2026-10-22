# The airport knowledge loop — brief before, debrief after

- **Status:** Concept for discussion — 2026-10-22, revised the same day with Bryan's answers (section 12). Not approved for build. Production has no airport pages yet, so this is a fresh design for the developer, not a change to something live.
- **Author:** Bryan Dunlop (idea) + Claude (structure)
- **Parent:** [`ROADMAP.md`](./ROADMAP.md), Horizon 1 (the loop without AI) and Horizon 4 (Airflow).
- **Builds on:** the airport module prototype in `src/airport/` and `src/components/airport-info/`. That prototype already has source labels on every fact, propose → review → publish with chief-pilot routing on safety fields (D46), per-field "last confirmed" dates (D54), and the evaluation officer's worklist (LG-83). Check with the production developer what exists on the real platform before treating any of this as new.

---

## 1. The idea in one paragraph

Before a flight, each crew member sees one briefing per airport on the trip. It brings together official data, our company page, our own history at that airport, and what recent crews reported. Every line says **where it came from and how old it is**, so a pilot can tell what is authoritative from what a colleague said. After the trip, and always after an international trip, the crew debriefs in under two minutes. They confirm what was still true, correct what was not, and add what was missing. Those debriefs feed the company page through review, so the next crew's briefing is better than this one. Over time, the department's knowledge of the airports it flies to accumulates instead of leaving with the people who carry it.

## 2. A naming note: 10-7, not 10-9 (agreed)

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

1. **New since you last looked** — personal to each pilot, with safety changes pinned until acknowledged. See section 4a.
2. **Restrictions and hazards** — curfews, PPR, noise, runway or ramp limits, active NOTAMs that touch our aircraft type. Official and company tiers only. Always shown, even when nothing has changed.
3. **What our crews said** — recent crew reports with their age, plus conflicts awaiting review.
4. **Our history** — "Last GFO visit 12 days ago. Typical taxi-out 14 min. One irregularity report in 12 months: customs delay."
5. **The company page** — FBO, handler, customs, hotel, catering, with last-confirmed dates.

The briefing should be short enough to read in the crew room. A long one gets skimmed, and then it is no safer than no briefing.

## 4a. At the top of the page — new since you last looked

Bryan's addition. Every time a pilot opens an airport page or briefing, the top of it answers one question: **what has changed since I last looked at this airport?** It is personal. Two pilots on the same trip can see different lists, because they last looked at different times.

**What counts as a change:**

- Company fields edited or newly confirmed as wrong.
- New airport bulletins, and bulletins retired.
- New crew reports and new conflicts.
- New irregularity reports or squawks raised at this airport.
- For US airports, runway and service changes between FAA NASR cycles. For international airports, whatever Jeppesen or Airflow can tell us changed. Ask in the demo.

**Rules that keep it useful:**

1. **Viewing marks it seen. Safety changes need a tap.** A change to a safety field, such as PPR, a curfew, a ramp limit or a new conflict, stays pinned at the top until the pilot taps "Got it". Everything else clears once the pilot has seen it. Scrolling past a curfew change is not the same as reading it.
2. **Unacknowledged safety changes follow you to the trip.** If a pilot is assigned to a trip to this airport and has not acknowledged a safety change, it appears in their Flight Hub readiness for that trip. If it is still unacknowledged close to departure, the accountability ladder applies.
3. **First look is not a diff.** A pilot who has never opened this airport sees "First time here", followed by the restrictions and hazards. A diff against nothing is noise.
4. **A long gap is a summary, not a list.** If it has been more than about a year, or there are more than about ten changes, say "14 changes since March 2025, 2 of them safety" and show the two safety ones. Then offer the full page. A wall of changes gets skimmed.
5. **The marker is the pilot's own.** It exists so the pilot sees what is new to them. Managers do not see who viewed what. The only thing that reaches a manager is an unacknowledged safety change before a trip to that airport, through rule 2.

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

**Urgent items** borrow the Document Center's bulletin *idea*. A safety-relevant crew report, such as "ramp closed to aircraft over 90,000 lb until March", can be published at once as an **airport bulletin** attached to the page. It is absorbed into the page at the next review and then retired, the same way bulletins are absorbed into manuals. Company pages are independent of Document Center (decided, section 12), so this is built inside the airport module rather than shared.

## 7. Where the data comes from

| Source | What it gives | Limits |
|---|---|---|
| **FAA NASR** | US airports, runways, services, contacts. 28-day cycle. Free bulk download. | **US only.** The prototype already bundles it. |
| **FAA NAS status** | Delays and ground stops at major US airports | Free and unauthenticated. Only major airports. |
| **ForeFlight / Jeppesen** | Charts, worldwide airport data, **NOTAMs**, the Dispatch airport tab | Licensed. We consume it, we do not copy it. |
| **Airflow** | Certified worldwide data, plus feasibility and briefing reasoning | Business-aviation agents announced 16 October 2026. Broader rollout planned for early 2027. |
| **myairops** | Our trips, handlers and FBOs used, times | Pull-only. |
| **myGFO** | Company pages, debriefs, irregularity reports, squawks, catering | Ours. |

**Decided:** the FAA supplies only the US airport database (NASR) and NAS status. Everything else official, including NOTAMs and all international data, comes through Jeppesen ForeFlight and Airflow. That keeps us off the credentialed FAA NOTAM API, and it means the official tier for international airports depends entirely on the Jeppesen ForeFlight relationship. For international airports, tiers 2–4 are where GFO adds its own value.

## 8. Where Airflow could fit

These are **hypotheses to test in the demos**, not facts about the product. Bryan recalls that operators can set up their own agents with Airflow. That matches the company's public line that Airflow has an open, model-agnostic architecture where operators can bring their own agents or third-party tools. What that means in practice is the thing to learn. What is public: Trip Feasibility checks customs, fire category, parking, noise restrictions, fuel availability and runway length. Ops Briefing gathers NOTAMs and weather and assesses their impact. Both are built into ForeFlight Dispatch. What is **not** public is whether operator data feeds into either.

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

## 11. Questions still open

1. Who is the Airport Evaluation Officer, and how many airports would have a company page in year one? The roster should be airports GFO actually flies to, not all 2,000-plus in NASR.
2. Can Ops Briefing or Trip Feasibility take operator content as input, and what does "bring your own agent" mean in practice? This is the first question for the demo. See the Airflow evaluation section of the roadmap.
3. Can Jeppesen or Airflow say what changed at an international airport since a given date? Section 4a needs that for international airports.

## 12. Decisions — 2026-10-22

- **10-7 is the model.** Company pages are our own operator pages. We never rebuild the 10-9 chart.
- **FAA for the US database and NAS status only.** NOTAMs and international data come from Jeppesen ForeFlight and Airflow.
- **Sensitive fields are restricted.** Not everything is visible everywhere.
- **No airport pages in production yet.** This design is new work for the developer.
- **Company pages are independent of Document Center.** They keep their own propose → review → publish model. The cost is two approval models to maintain. The benefit is that airport knowledge can move at the speed crews report it, without the weight of manual control.
- **These docs live in this repo.** They are thinking, not the work plan.
