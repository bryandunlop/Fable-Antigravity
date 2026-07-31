-- REFERENCE SCHEMA — TL-38 work-card sync. NOT a migration. Read docs/tech-log-api/README.md first.
--
-- These tables are deliberately NOT ledger tables, and that is the single most important thing on
-- this page. `CLAUDE.md` reserves append-only ledger for signed regulatory records — FlightLog,
-- Defect, Deferral, MaintenanceRelease, Signature, AuditTrail — and a work card in progress is none
-- of those. It is operational WIP: a technician edits it all day, changes their mind, corrects a
-- typo. Putting it on an append-only ledger would mean a superseding signed insert per keystroke, and
-- putting a mutable `revision` column on a ledger row is forbidden outright ("NEVER store a mutable
-- is_current / status flag on an append-only ledger row").
--
-- The regulatory record this work eventually produces — the CRS / MaintenanceRelease signed at
-- completion — IS a ledger table, and is not defined here. See PHASE1_BUILD_SPEC.md §3.1.

-- ─────────────────────────────────────────────────────────────────────────────────────────────────
-- The card aggregate
-- ─────────────────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE wip.WorkCard (
    work_card_id        UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    aircraft_id         UNIQUEIDENTIFIER NOT NULL,
    card_number         NVARCHAR(32)     NOT NULL,

    -- Card body. NVARCHAR rather than fixed-width throughout: these are not ledger columns so they
    -- CAN be altered later, but the habit is worth keeping — the ledger tables next door cannot be.
    title               NVARCHAR(400)    NOT NULL,
    description         NVARCHAR(MAX)    NULL,
    ata_chapter         CHAR(2)          NOT NULL,
    status              NVARCHAR(16)     NOT NULL,
    amm_reference       NVARCHAR(200)    NULL,   -- hand-typed (D22); never CAMP-sourced
    rii_required        BIT              NOT NULL DEFAULT 0,

    -- ── The server-owned stamp. This is what the whole slice turns on. ──
    -- Monotonic per card. The client sends the revision it composed against; a mismatch is a 409.
    revision            INT              NOT NULL DEFAULT 1,
    -- The SERVER's clock at commit. A client timestamp is advisory and never lands here.
    server_at_utc       DATETIME2(3)     NOT NULL,
    updated_by_oid      NVARCHAR(64)     NOT NULL,
    -- FROZEN, not a join to Personnel. A rename must not repaint history (TL-16 / CLAUDE.md).
    updated_by_name     NVARCHAR(200)    NOT NULL,

    CONSTRAINT CK_WorkCard_revision_positive CHECK (revision >= 1)
);

CREATE INDEX IX_WorkCard_aircraft ON wip.WorkCard (aircraft_id, status);

-- Labor is part of the card AGGREGATE on the wire, but a child table in storage — the metrics
-- rollups read across cards, and the CRS print reads per card.
CREATE TABLE wip.LaborEntry (
    labor_entry_id      UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    work_card_id        UNIQUEIDENTIFIER NOT NULL
        REFERENCES wip.WorkCard (work_card_id) ON DELETE CASCADE,
    tech_oid            NVARCHAR(64)     NOT NULL,
    -- Frozen at entry, same rule as updated_by_name. These lines print on the work-card CRS, and a
    -- live join meant a rename repainted a signed release (TL-16).
    tech_name           NVARCHAR(200)    NULL,
    hours               DECIMAL(6, 2)    NOT NULL,
    date_utc            DATETIME2(3)     NOT NULL,
    description         NVARCHAR(1000)   NOT NULL,
    category            NVARCHAR(24)     NULL,    -- D27 non-wrench categories
    note                NVARCHAR(1000)   NULL,    -- the why-note when the work ran long (QM1/QM5)

    CONSTRAINT CK_LaborEntry_hours_positive CHECK (hours > 0)
);

CREATE INDEX IX_LaborEntry_card ON wip.LaborEntry (work_card_id);
CREATE INDEX IX_LaborEntry_tech ON wip.LaborEntry (tech_oid, date_utc);

-- Parts orders and the status-tag time history hang off the card the same way. Omitted here for
-- length; shapes are `PartsOrder`, `StatusTagEvent` and `WorkCardTimeAuditEvent` in
-- src/components/tech-log/types.ts. Note `timeAudit` is append-only BY CONVENTION (D62) even though
-- this is not a ledger table — engine/statusTags.ts is its only sanctioned writer.

-- ─────────────────────────────────────────────────────────────────────────────────────────────────
-- Idempotency
-- ─────────────────────────────────────────────────────────────────────────────────────────────────

-- Stores the RESPONSE, not a "seen" flag. A replayed key must return the identical response — that
-- is what makes the client's outbox safe to retry after a lost ACK, and it is the difference between
-- a retry and a duplicated labor line.
CREATE TABLE wip.IdempotencyRecord (
    idempotency_key     UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,  -- client-generated UUIDv7
    work_card_id        UNIQUEIDENTIFIER NOT NULL,
    actor_oid           NVARCHAR(64)     NOT NULL,
    outcome             NVARCHAR(16)     NOT NULL,              -- ACCEPTED | REJECTED
    response_json       NVARCHAR(MAX)    NOT NULL,
    created_at_utc      DATETIME2(3)     NOT NULL
);

-- A CONFLICT is deliberately NOT recorded here. The same key may legitimately be retried after the
-- client rebases onto the current revision; recording it would replay the failure forever.

-- Retention: these are transport bookkeeping, not records. Sweep older than ~7 days — long enough to
-- outlive any plausible offline period (an iPad left in an aircraft over a long weekend), short
-- enough that the table does not grow forever. It is NOT a regulatory record and the four retention
-- classes in CLAUDE.md do not apply to it.
CREATE INDEX IX_IdempotencyRecord_age ON wip.IdempotencyRecord (created_at_utc);

-- ─────────────────────────────────────────────────────────────────────────────────────────────────
-- Presence
-- ─────────────────────────────────────────────────────────────────────────────────────────────────

-- Advisory only. NOT a lock, and nothing in the app gates on it — a distributed lock held by a tablet
-- that walked out of wifi range is how a card becomes permanently unworkable. Its only job is to stop
-- two technicians unknowingly troubleshooting the same squawk.
CREATE TABLE wip.Presence (
    session_id          NVARCHAR(64)     NOT NULL PRIMARY KEY,
    work_card_id        UNIQUEIDENTIFIER NULL,   -- NULL = watching nothing
    actor_oid           NVARCHAR(64)     NOT NULL,
    actor_name          NVARCHAR(200)    NOT NULL,
    last_seen_at_utc    DATETIME2(3)     NOT NULL
);

CREATE INDEX IX_Presence_card ON wip.Presence (work_card_id, last_seen_at_utc);

-- Needs a TTL sweep (rows older than PRESENCE_TTL_MS = 45 s). The client already filters stale rows
-- for display, so a missing sweep is invisible in the UI and unbounded in the table.
