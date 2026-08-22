# Group Drives + Document Control — SharePoint / OneDrive under the controlled-list process — Design Spec

- **Date:** 2026-07-30
- **Status:** **Draft for review — NOT approved for implementation.** Written from the 2026-07-30 whiteboard photo + Bryan's steer. §12 lists what is still open; five questions have been answered since the first draft and are recorded there.
- **Author:** Bryan Dunlop (whiteboard) + Claude
- **Branch:** `claude/sharepoint-onedrive-drive-management-e9d5n2`
- **Surface:** extends the existing Document Compliance module (`src/components/documents/`)
- **Nature of deliverable:** architecture for a prototype / reference implementation on the mock store, in the existing patterns. Not production Graph plumbing — but the seams are named so the real integration drops in without a rewrite.

---

## 1. What the whiteboard says

![The 2026-07-30 whiteboard](./2026-07-30-whiteboard.jpg)

Transcribed so the decision survives the photo. Four zones:

**Right — eight group drives, each split two ways.** `Admin` · `Pilots` (sub-folders `Training`, `Standards`) · `FA` · `Mx` · `Scheduling` · `Master` · `Reg & Comp` · `Safety`. Every group has a **CTL** bucket and an **Un-CTL** bucket. A brace spanning the whole column labels it **OneDrive**.

**Middle — two registers.** Every group's CTL bucket wires back (red) to one **Controlled list**; every Un-CTL bucket wires back (blue) to one **Un-Controlled list**. Each register carries a **12 month audit**. Both registers then flow two ways:
- down (solid) into **myGFO and/or OneDrive**, annotated **CRUD**;
- left (dotted) into the **Pilot / Content Pack folder**.

**Left-top — distribution.** The Pilot / Content Pack folder feeds (dotted) into **ForeFlight**, whose contents are listed as `GOM`, `Pilot Folder` (`Standards`, `Training`, `MEL`, `LoA`), `PB`, `Reg & Comp`.

**Left-bottom — authoring.** **SharePoint**: a **Working Folder** and a **Shared Folder**. A line runs from there along the bottom, labelled **CRUD**, and arrows up into the group-drive column.

**Bryan's steer on top of the drawing:** the drives on the right are a SharePoint or OneDrive drive per group; they can be managed **via myGFO or natively** — "but it would need to go through this process."

## 2. The requirement that drives the whole design

Two management surfaces, one process.

If myGFO were the only way in, "must go through this process" is a UI problem — put the classification step in the upload dialog and you are done. Bryan explicitly did not ask for that. A file can also be dropped into the group's drive **natively**, from Explorer, Teams, or the OneDrive client, by someone who has never opened myGFO.

So the process cannot be enforced at the point of entry. It has to be enforced by **reconciliation**: myGFO continuously compares what is actually in the drives against what is on the two registers, and anything it cannot account for is surfaced as work, not silently accepted. That single fact decides the shape of everything below.

The corollary is the thing to be honest about up front: **there is a window** between a native drop and the next reconcile in which a file exists in a group drive and is on no register. The design does not pretend to close that window; it makes it short, visible, and impossible to mistake for a classified state (§6).

## 3. Model: the register is the control plane, the drive is the storage plane

**A document's classification is a property of its register entry, never of the folder it sits in.**

This is the load-bearing decision. The tempting read of the whiteboard is that `…/Pilots/CTL/` *is* the controlled state — the folder makes it so. That inverts the control: dragging a file between two folders in SharePoint would then reclassify a controlled document, with no approval, no audit entry, and no way to tell afterwards that it happened. That is precisely the failure the controlled list exists to prevent.

So:

| Plane | Lives in | Holds | System of record for |
|---|---|---|---|
| **Control** | myGFO | register entries: classification, owner group, revision + approval state, audit dates, distribution targets | *whether* a document is controlled, what revision is effective, who signed for it |
| **Storage** | SharePoint / OneDrive | the bytes, version history, native co-authoring | the file content |

The CTL / Un-CTL folders on the whiteboard stay — they are how the drive *renders* the register to someone browsing natively, and they are what makes native browsing safe to look at. But they are an **output** of classification, not the input. myGFO files the item into the right bucket; a human moving it between buckets in SharePoint is a discrepancy to reconcile (§6), not a reclassification.

**The register entry binds to the drive item by immutable id — `driveId` + `itemId` — never by path.** Paths change when someone renames a folder; the binding must not.

## 4. Recommendation: back the group drives with SharePoint document libraries, not personal OneDrive

The brace on the whiteboard says "OneDrive," and Bryan's steer says "SharePoint or OneDrive." For the *user experience* those are the same thing — the OneDrive client syncs a SharePoint library to Explorer, and that is almost certainly what the brace means. For the *backing store* they are materially different, and the choice should be made deliberately:

1. **Ownership survives turnover.** A personal OneDrive is a user object. When that person leaves, the drive enters a retention window and is deleted. A group's controlled documents cannot live somewhere that dies with an employee. A SharePoint library belongs to the site/group.
2. **Least privilege actually exists.** For SharePoint, Graph offers **`Sites.Selected`** — an application permission that grants nothing until an administrator grants this app access to *specific* sites. For personal OneDrive there is no equivalent; app-only access to arbitrary users' drives means **`Files.Read.All` / `Files.ReadWrite.All`**, which is tenant-wide access to every file every employee owns. Handing myGFO that scope to manage eight group folders is not a trade worth making.
3. **Permissions are the enforcement surface.** §5 depends on being able to make the CTL bucket read-only to humans and writable only by the sync identity. Library-level permissions do that cleanly.

**Recommendation:** each of the eight groups is a SharePoint document library (one site with eight libraries, or one library with eight top-level folders — see [[Q3]]), surfaced to users through OneDrive sync so it still *looks* like the whiteboard. myGFO holds `driveId` per group and never needs a tenant-wide file scope.

## 5. Where each folder on the whiteboard fits

**SharePoint Working Folder** — drafting. Nothing here is on either register; it is pre-process by definition. This is where a native author works before the document enters control. The `CRUD` arrow from here into the group drives is *promotion*: the act of moving a file out of Working and into a group drive is the act of asking for it to be classified.

**SharePoint Shared Folder** — the cross-group surface: things more than one group reads but no one group governs. Its `CRUD` arrow also lands in the group column.

**Group `Un-CTL` bucket** — registered, audited, not revision-controlled. Read-write to the group. Its register entry gives it an owner, a review date, and a place on the uncontrolled list.

**Group `CTL` bucket** — registered and revision-controlled. **Read-only to humans; writable only by myGFO's sync identity.** This is the second half of the enforcement story and it matters: if a pilot can open the controlled GOM in SharePoint and type into it, the four-eyes draft→approve→publish pipeline the documents module already implements is bypassed by a double-click. Editing a controlled document means starting a revision — in myGFO, or by working a copy in the Working Folder and submitting it. Either way it lands back through approval.

*This reading of Working vs Shared is inferred from the layout, not labelled on the board — see [[Q1]].*

**`Master`** — read as the corporate/all-hands group, peer to the other seven, not a superset of them ([[Q2]]).

**`Pilots → Training` / `Standards`** — sub-folders within the Pilots group, not separate groups. Both role ids already exist in `ADDITIONAL_ROLES` (`training`, `standards`), as does `reg-comp`.

## 6. Reconciliation — how "it would need to go through this process" is enforced

Every drive item in scope is in exactly one of four states, and the state is computed, never stored on the file:

| State | Meaning | Where it shows |
|---|---|---|
| `registered` | drive item ↔ register entry, content hash matches | normal |
| `unclassified` | in a group drive, on no register — a native drop | **Intake queue** |
| `drifted` | registered, but the bytes changed outside myGFO | **Intake queue**, flagged by class |
| `orphaned` | register entry whose drive item is gone or moved out of scope | **Intake queue** |

**The intake queue is the process.** It is a work list owned by each group's document owner: classify this (CTL / Un-CTL / not a document — reject back to Working), or account for this change. Nothing auto-classifies. An `unclassified` item is not "uncontrolled by default" — that would quietly make the safest-sounding word mean "nobody has looked at it," which is how an uncontrolled register fills with documents nobody chose to put there.

**`drifted` is asymmetric by class, and this is the point of the whole design:**
- an Un-CTL item drifting is expected — record the new hash, bump `lastModified`, done;
- a **CTL item drifting is an incident**. It means the read-only permission in §5 failed or was bypassed. It raises a flag on the register entry, notifies the owner and the document manager, and the effective revision in myGFO **does not change** — a native edit can never become the effective revision of a controlled document. The register keeps pointing at the last approved revision; the drift is a discrepancy to be resolved (restore, or take it through a revision).

**Mechanics.** Graph change notifications (a subscription per drive) tell myGFO *that* something changed; they do not say what. So the notification triggers a **delta query** (`/drives/{id}/root/delta`) which returns the changed items and a token for next time. Delta is also the cold-start and the safety net: a scheduled delta sweep runs regardless of notifications, because driveItem subscriptions expire (~30 days) and need renewal, and a missed notification must not mean a permanently invisible file. **Delta is the source of truth; notifications only make it prompt.**

## 7. Controlled vs uncontrolled — what the split has to buy

The distinction only earns its keep if the two lists behave differently. They do, and most of it is already built:

|  | Controlled (CTL) | Uncontrolled (Un-CTL) |
|---|---|---|
| Change path | draft → approve → publish, approver ≠ author | direct edit |
| Effective revision | pinned; supersedes on publish | latest is latest |
| Acknowledgment | can require initials / signature | none |
| Native editing | blocked (§5) | allowed |
| Drift | incident | expected |
| Point-in-time answer | must be reconstructable | not required |

The documents module already implements the left column — `DocumentClassConfig.controlled` gates four-eyes, `DocRevision.status` carries `draft → pending-approval → approved → published → superseded`, the reducer enforces `decidedByUserId !== authorUserId`, and `DocAcknowledgment` is scoped to `(doc, revision, user)` so publishing re-arms it. **What is new here is not the control model. It is the group/drive axis and the two registers as first-class, browsable objects.**

**Point-in-time durability.** "What was the effective revision on date X" must not depend on SharePoint version history — a tenant admin can prune it, and retention policy is not our policy. On publish of a controlled revision, snapshot the rendered file to the WORM blob container the project already specifies (`Storage__SignedDocsContainerUri`). The register entry cites the blob; SharePoint holds the working copy.

## 8. Forced review — 12 months controlled, 24 months uncontrolled

> **Refined 2026-07-30 (Bryan).** The board wrote "12 month audit" over both registers. The two reviews ask **different questions**, and the uncontrolled one runs on a longer clock — **24 months** as a working figure ([[Q8]] holds the exact number open; it is one config value, `Documents__UncontrolledReviewMonths`).

**Controlled — 12 months — *attest*.** The owner is walked through every controlled document in their group and has to answer, per document: it is present, it is current, it is correct. Outcomes: **reaffirm** (clock resets) or **start a revision** (into the four-eyes pipeline that already exists). The point is that it is a *forcing function on a named human* — the review exists so that nobody can claim a document is current by saying nothing about it for three years.

**Uncontrolled — 24 months — *cull*.** Different verb, different question: not "is this correct" but "does this still need to exist." Outcomes: **keep** (clock resets) or **delete**. Uncontrolled documents are not regulatory records, so deleting one is a legitimate outcome — but it is **tombstoned on the register, never silently vanished**, so "where did that go?" has an answer and the removal is attributable to a person and a date. Without the tombstone, a cull is indistinguishable from a file going missing, which is the thing an uncontrolled pile does to itself already.

**Overdue flags; it never hides.** A controlled document whose review has lapsed is *still the effective revision* and stays readable. Withdrawing a manual because an owner missed a calendar reminder would ground the operation to solve a paperwork problem. Overdue is loud — on the register row, in the owner's queue, and on the document wherever it is read (§10) — and it escalates. It does not remove.

**Mostly already modelled.** `Doc.reviewCycleDays`, `nextReviewDate` and `DocReviewRecord` (`outcome: 'reaffirmed' | 'revision-started'`) are this mechanism, with 365 days already the default on `sop`/`manual`. What is new: the queue is **owned per group** rather than per document, the cull adds `'kept' | 'deleted'` to `DocReviewRecord.outcome`, and the cadence becomes a function of classification rather than of class.

**Who does the work: each group's own owner** (answered 2026-07-30). Eight queues, eight accountable people — matching the whiteboard's per-group split, and keeping the judgment with the only people who can actually tell whether an Mx form is still correct. A single central reviewer would be simpler to build and to chase, and would degrade into a rubber stamp for exactly that reason.

The cost of that choice, recorded rather than argued: **there is no backstop.** If an owner leaves, changes role, or simply stops working the queue, nothing in the system notices on anyone else's behalf. So the group roll-up below has to be visible to *somebody* outside the group — an escalation surface is a consequence of this decision, not a separate feature. Who sees it is [[Q11]].

**The group roll-up is the auditable artifact.** Per (group, register, period): every entry attested, nothing overdue, every drive item on a list, no unclassified backlog. **A period cannot be closed while that group's intake queue is non-empty** — that is what makes §6 a process rather than a dashboard, and it is what you hand an auditor.

## 9. Distribution — the ForeFlight content pack is a mirrored folder

> **Corrected 2026-07-30 (Bryan).** The ForeFlight integration on this board is **Documents**, and it is *not* the ForeFlight surface this repo already talks to. `src/utils/foreflight/` and `src/scheduling/foreflight/` are the **Files** path — trip sheets, passenger documents, flight data — a different product surface with a different API. **None of it is reusable here and none of it should be extended for this.** ForeFlight Documents is pointed at a **OneDrive folder by path** — that is what the `/` in "Pilot / Content Pack folder" means — and it **mirrors** that folder.

Both registers feed the pack (the board draws both dotted arrows). What the ForeFlight box lists is `GOM`, `Pilot Folder` (`Standards`, `Training`, `MEL`, `LoA`), `PB`, `Reg & Comp` — **a pilot-facing subset, not a mirror of the registers**; no Mx, no Scheduling, no FA. So inclusion stays a per-entry opt-in (`distributeToForeFlight`), not a folder-location rule: a Safety document meant for crew is included without moving out of the Safety group. The pack's tree is **authored** to match the ForeFlight box, not derived from the group tree — pilots see `Pilot Folder/Standards`, never `Pilots/CTL`.

The mirror changes the engineering on both sides of the ledger.

**There is no integration to build.** No API, no upload, no credentials, no push queue, no retry/backoff, no `uploadFile` seam. myGFO's entire job is to *make the folder correct*; ForeFlight picks it up. Distribution is a filesystem-shaped problem, which is the cheapest possible answer and removes a whole class of failure.

**But the folder is the interface, and a mirror is dumb.** Four consequences, all of which have to be designed for:

1. **Deletion is part of publishing.** A mirror propagates removals as faithfully as additions, and *only* removals remove. Superseding a revision therefore has to **delete the old file** from the pack folder, or pilots keep reading it. So a pack build is a **reconcile of the folder to the desired state — add / replace / delete — never an append.** This is the single most likely way to ship a wrong document to a flight deck.
2. **The mirror has no notion of controlled.** It will carry whatever is in the folder. So the pack folder needs the same protection as the CTL bucket (§5): written only by myGFO's publish identity, read-only to humans. A native drop into the pack folder is distribution to *every pilot* with no register entry, no revision and no audit — the highest-consequence version of the §6 `unclassified` case. **The pack folder is therefore in reconcile scope too**, and drift there is an incident, not a change.
3. **There is no receipt.** You cannot ask a mirror what it delivered, so "which revision is on the iPad" has no API answer. Make the pack **self-describing instead**: myGFO writes a manifest into the folder alongside the content — document id, revision, effective date, checksum, build timestamp. It rides the mirror like any other file, so the question is answerable from the same folder the pilots are reading, and an auditor can diff it against the register.
4. **Timing is the mirror's, not ours.** Publish completes when the folder is correct; arrival on a device is eventually-consistent and outside myGFO's control. Nothing in the register may treat "published" as "received" — and if a revision ever needs a positive confirmation that a crew has it, that is `DocAcknowledgment` in the Document Center, not an inference from the pack.

*Assumed one-way (OneDrive → ForeFlight). If Documents ever writes back, that is a different design and needs raising.*

## 10. Access — how users actually get to the documents

> Bryan flagged this as the open problem: *"we need to figure out a way for the users to be able to access this, and that's what I'm trying to understand — the best way to do that."* This section is a recommendation, not a transcription.

### 10.0 [[Q9]] answered — and it falsifies the first draft's recommendation

**Answered 2026-07-30 (Bryan):** *"OneDrive. Technically SharePoint, but people don't know that, and they use a shortcut on OneDrive to the SharePoint."*

Two things follow, one good and one that invalidates a design decision.

**The good one: §4 is already true in the field.** The backing store is a SharePoint library, not personal OneDrive. That is not a migration to argue for — it is what GFO already runs, and people simply experience it through *Add shortcut to OneDrive*. [[Q3]]'s SharePoint-vs-personal-OneDrive half is closed by observation.

**The one that hurts: the reading surface is File Explorer, and Explorer shows almost nothing.** The first draft's recommendation was to write the register onto drive items as **SharePoint metadata columns**. Those columns render in the browser and in Teams. They do **not** render in File Explorer, which is where a synced OneDrive shortcut is actually read — Explorer shows name, date modified, type, size and a sync badge, and nothing more. A design that puts the register in columns puts it precisely where this population will never look.

So the recommendation below replaces it. **The truth has to ride the only two things Explorer displays: the folder path and the filename.**

### 10.1 There is no single reader, because there is no single user

| Who | Where they are | What they can actually see |
|---|---|---|
| **Pilot**, airborne or on the road | iPad, often offline, no appetite for a login | whatever ForeFlight Documents mirrored — filenames and folders |
| **Anyone at a desk** doing their job | **File Explorer, via a OneDrive shortcut to the SharePoint library** | **filename, folder, date modified, size. No columns, no metadata, no badges.** |
| **Anyone who must *rely* on a document** | anywhere | needs to know it is current and controlled, and whether they owe an acknowledgment |

Funnelling all three through one door fails in a predictable direction. The desk population will keep using the shortcut because it is already in Explorer, and **a reader nobody uses is worse than no reader** — it becomes the place where the register is true while the drive is what people actually read. That gap is the failure mode this whole design exists to prevent, so the access model must not reintroduce it.

### 10.2 Recommendation — the register rides the folder and the filename

**myGFO owns the register. It does not own the reading experience.** That much survives. What changes is the carrier.

**1. Folder = classification.** The CTL / Un-CTL split the whiteboard already draws is not decoration — for an Explorer reader it is the *only* permanently-visible classification signal. §3 still holds exactly as written (classification lives on the register entry; the folder is a *rendering* of it, and moving a file between folders is drift, not reclassification) — but that rendering is now **load-bearing** rather than a convenience. Bryan's original instinct on the board was right for a reason the board did not state.

**2. Filename = revision and currency.** myGFO owns the filename and stamps it — `GOM — Rev 4.2 — eff 2026-01-15.pdf`. It is ugly, and it is correct in every place a file can end up: Explorer, OneDrive web, a phone, a printout on someone's desk, an attachment a person forwarded out of the system entirely. Nothing else has that reach. A hand-renamed file is drift (§6) like any other unsanctioned change.

**3. Metadata columns = enhancement, never mechanism.** Still worth writing for the browser/Teams view and for SharePoint search, because they make the register genuinely queryable there. But **nothing may depend on them**, and no user-facing guarantee may rest on a reader seeing one. That also neatly de-risks [[Q10]]: IT has not been asked yet, and now the answer changes how good the web view is rather than whether the design works.

So:
- **Pilots →** ForeFlight Documents via the mirrored folder (§9). Offline by construction, no login.
- **Desk users →** the OneDrive shortcut they already use, where folder and filename carry the register.
- **Anyone asking a question *about* a document →** the myGFO Document Center.

### 10.2a What the shortcut mechanism costs

Three consequences of the *Add shortcut to OneDrive* pattern that the design has to absorb:

- **The shortcut is per-user and removable.** "Everyone has permission" is not "everyone has the shortcut," and myGFO cannot see whether a given person added it. Onboarding needs that step, and myGFO should offer a link that opens the right library location rather than assuming the shortcut exists.
- **Deletions propagate to everyone's Explorer.** Good — the 24-month cull and controlled supersede actually *reach* people. Also sharp: a delete is the distribution of an absence, and it is as irreversible in the reader's view as a publish. Same hazard class as the ForeFlight mirror (§9).
- **Offline copies go stale silently, and this is the strongest argument for the filename stamp.** A synced file held offline is a copy of whatever it was at sync time, and Explorer will never tell that reader a newer revision published. With the revision in the filename, an offline copy at least *names itself* — a reader who checks can tell what they are holding. Without it, a superseded manual and the current one are indistinguishable on a laptop in a hotel. For a Part 91 flight department that is the difference that matters.

### 10.3 What the myGFO reader is actually for

Not a file browser competing with SharePoint. It is where you go when the question is **about** the document rather than **inside** it:

- **Cross-group search over the register** — one query across all eight groups, filtered by audience. "Every controlled document I own that is overdue" is a register question; SharePoint search across eight libraries answers it badly.
- **"What do I owe?"** — the acknowledgment queue. Purely a myGFO concept; no drive can produce it.
- **Revision history and point-in-time** — what was effective on date X, off the WORM snapshot (§7).
- **The owner queues** — 12-month attestation and 24-month cull (§8).
- **The suggestion loop** — crew → owner, already built.

### 10.4 Two kinds of document, one register

Worth stating plainly, because it decides how much of the existing module carries over:

- **Authored in myGFO** — SOPs, bulletins, manuals as `DocSection`/`DocBlock` trees. myGFO renders them; the drive receives a published rendering as the readable artifact.
- **Files that live in the drive** — PDFs, Word, spreadsheets, forms produced elsewhere. myGFO registers, classifies, versions and reviews them but does **not** render them; it links out and Office renders.

**One register, one classification model, one review cadence, across both.** The reader differs; the control does not. This is what lets the eight groups put the files they already have under control without re-authoring anything — which is plausibly the difference between this being adopted and being ignored.

### 10.5 Permissions: the drive enforces, myGFO targets

There are now two places that decide who sees what, and only one of them actually stops anyone. **The drive's permissions are the enforcement. `Doc.roles` is audience targeting** — who *should* see it, for surfacing and notification. It is not a security boundary and must not be treated as one.

They have to agree, and the clean way to make them agree is **one Entra group per GFO group**, used as both the SharePoint permission principal and the myGFO audience. One object, one place to change when someone moves teams, no drift between the two by construction.

**A link myGFO shows that the user cannot open is a defect** — and a detectable one: a permission mismatch is a reconcile finding like any other (§6).

## 11. What exists, what's new

**Reuse as-is:** `DocRevision` + status machine, four-eyes reducer enforcement, `DocAcknowledgment`, `DocReviewRecord`, `DocSuggestion` (crew→owner loop), `mockChecksum`, the Document Center reader (`docReaderPath`), `DOC_CLASSES` as config.

**New:**
1. `DocGroup` — the eight groups as config, in `classes.ts` style: id, label, owner roles, sub-folders, `driveId`. Config, not code.
2. `DocDriveBinding` on the document identity — `{ groupId, driveId, itemId, classification: 'controlled' | 'uncontrolled', contentHash, lastSyncedAtUtc }`. Classification moves here **as a per-document property**. Today `controlled` is per-class, which cannot express "this Safety PDF is controlled, that one isn't" within one class. Class stays the default; the binding is the authority.
3. `DriveSyncEngine` (pure) — `reconcile(driveItems, registerEntries) → { unclassified, drifted, orphaned, registered }`. Pure and unit-tested; the Graph client is a thin caller, mockable, exactly as `SchedulingService` wraps the pure scheduling engine.
4. `RegisterAudit` — the (group, register, period) attestation record.
5. `packReconcile` (pure) — desired pack tree vs actual folder → `{ add, replace, delete }`, plus the manifest writer (§9). Same shape as `DriveSyncEngine`, and the **only** ForeFlight-facing code: the pack folder is written with the ordinary Graph drive calls, not through any ForeFlight API.
6. **Surfaces:** a Registers page (two lists, filterable by group, the auditor's view); a per-group Intake queue; an audit panel. Reader stays the Document Center — D66 already ruled it the only reader.

**Config keys** (naming per the CLAUDE.md contract; nothing wired until approved): `Graph__TenantId`, `Graph__ClientId`, `Graph__GroupDriveMap`, `Graph__DeltaSweepMinutes`, `Graph__SubscriptionRenewalHours`, `Documents__RegisterAuditMonths` = `12`. **No Graph secret is introduced** — app-only auth via the API's managed identity with `Sites.Selected`, granted per site. If [[Q3]] lands on personal OneDrive, that changes and the scope discussion in §4.2 has to be reopened explicitly.

**Guardrails that apply** (from CLAUDE.md): file names and item ids are loggable, file *contents* are not; a published controlled revision is append-only and corrected by superseding revision, never by editing the drive item; drive items are not airworthiness records and nothing here touches the tech-log ledger.

## 12. Open questions — answer before a plan is cut

> **Resolved since the first draft** (numbering held throughout, so earlier references still resolve):
>
> - **[[Q5]] ForeFlight path** — ForeFlight **Documents**, pointed at a OneDrive folder by path and mirroring it. Not an API push, and not the Files integration this repo already has. §9 rewritten.
> - **[[Q9]] Where people work** — a **OneDrive shortcut to a SharePoint library**; users think of it as OneDrive. Confirms §4's backing store by observation, and **falsifies** the first draft's metadata-column recommendation, because Explorer renders no columns. §10 rewritten around folder + filename.
> - **[[Q3]] (half)** — SharePoint-backed, not personal OneDrive. Confirmed by what GFO already runs. The *topology* half (site/library layout) stays open below.
> - **Review ownership** — each group's own owner, no central reviewer (§8). Consequence: no backstop, hence [[Q11]].
> - **[[Q10]] Metadata columns** — pending IT. Deliberately demoted to an enhancement in §10.2 so the answer no longer gates anything.

1. **[[Q1]] Working vs Shared Folder.** Is my §5 reading right — Working = pre-process drafting (on no register), Shared = cross-group published surface? Or is Shared also a staging area?
2. **[[Q2]] `Master`.** A ninth peer group (corporate/all-hands), or the union/index of the other eight?
3. **[[Q3]] Drive topology.** One SharePoint site with eight libraries, one library with eight folders, or eight sites? Drives the `Sites.Selected` grant and the sync-scope story. Also: confirm SharePoint-backed rather than personal OneDrive (§4).
4. **[[Q4]] Who classifies?** Per-group document owner, the central document manager, or either? And who may *reclassify* Un-CTL → CTL — that promotion is the moment a document acquires regulatory weight.
5. **[[Q5a]] Pack folder placement.** Where does the mirrored pack folder live — its own library, or a folder inside the Pilots group? It is written only by myGFO either way (§9, consequence 2), but it is the one folder whose contents reach a flight deck, so it may deserve its own permission boundary rather than inheriting Pilots'.
6. **[[Q6]] Scope of Phase 1 here.** Full reconcile against a mocked Graph, or registers + intake UI over the existing mock store with the drive layer stubbed? My recommendation: the latter first — the pure `DriveSyncEngine` and both registers are the valuable, testable half, and they are what makes the Graph work mechanical when it comes.
7. **[[Q7]] Retention.** Does the group review roll-up have a retention requirement of its own (Part 91 record-keeping), or is it an internal quality artifact?
8. **[[Q8]] Uncontrolled cull cadence.** 24 months is Bryan's working figure ("I'm not sure of the timeline — let's just say 24 months"). Confirm, or set it per group. It is one config value either way, so this gates nothing — but the number should be someone's decision rather than a placeholder that hardened by default.
9. **[[Q10]] Metadata columns — with IT.** No longer gates the design (§10.2 point 3), but the answer decides how good the browser/Teams view gets. Bundle it with the other IT asks: item write scope, column provisioning per library, and whether one Entra group per GFO group (§10.5) fits how GFO manages groups today.
10. **[[Q11]] Who sees the roll-up?** Per-group ownership has no backstop (§8). Somebody outside the group has to see a group going quiet — Chief Pilot, DOM, a lead-tier role, or a standing report. This is the direct consequence of the ownership decision, not a new idea.
11. **[[Q12]] How many documents per group, roughly?** Answered "varies wildly," which is the answer that makes this worth counting. A group with tens is absorbed by the ordinary intake queue; a group with thousands needs **bulk backfill as its own feature** — batch classify, sane defaults, and a way to work it down over weeks, because handing an owner 2,000 unclassified items is not an intake queue, it is a wall. **Eight rough counts would size this in an afternoon** and decide whether Slice 2 carries a bulk path.
12. **[[Q13]] Filename stamping — acceptable in practice?** §10.2 point 2 has myGFO own and stamp filenames (`GOM — Rev 4.2 — eff 2026-01-15.pdf`). It is the only carrier that survives Explorer, offline copies, print and forwarding — but it means filenames change on every revision, which breaks anyone's saved links and desktop shortcuts to a specific file. Worth checking against how people actually refer to these documents before committing.

## 13. Suggested slicing (once §12 is answered)

- **Slice 1 — registers over the mock store.** `DocGroup` config, `DocDriveBinding`, both register views, per-document classification. No Graph.
- **Slice 2 — reconcile + intake.** Pure `DriveSyncEngine` + tests (unclassified / drifted / orphaned / CTL-drift-is-an-incident), intake queue UI, mock drive fixtures. **Carries a bulk-backfill path if [[Q12]] says any group is in the thousands** — same engine, different UI affordance (batch classify with defaults, worked down over weeks rather than a single sitting).
- **Slice 3 — the review cycles.** Owner queues per group: 12-month controlled attestation and 24-month uncontrolled cull, the delete tombstone, overdue-flags-but-never-hides, and the group roll-up with the "cannot close with a non-empty queue" rule.
- **Slice 3b — access.** The register surfaced where people actually read it (§10): folder placement and filename stamping as the primary carriers, deep links both directions, cross-group register search, the "what do I owe" queue. Metadata columns only if [[Q10]] comes back yes, and as an enhancement. Sequenced right after the review cycles, because an overdue flag is worth little if it is only visible to someone who already opened myGFO.
- **Slice 4 — content pack folder.** `distributeToForeFlight`, authored pack tree, and a pure `packReconcile(desired, actual) → { add, replace, delete }` with the delete arm tested hardest — a superseded revision left behind in the folder is a wrong document on a flight deck (§9, consequence 1). Plus the manifest, and the pack folder folded into reconcile scope.
- **Slice 5 — real Graph.** Delta + subscriptions + renewal behind the seam Slice 2 defined. Separate call, separate review.
