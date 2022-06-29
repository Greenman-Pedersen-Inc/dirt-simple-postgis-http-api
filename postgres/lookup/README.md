# Lookup Tables for Redundantly stored information in Voyager

## Counties
Create table and populate
```sql
-- Table: signals.jurisdiction_lookup

DROP TABLE IF EXISTS lookup.county;

CREATE TABLE IF NOT EXISTS lookup.county
(
    internal_id serial primary key,
    code text,
    description text
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS lookup.county
    OWNER to postgres;
```

## Municipalities
```sql
DROP TABLE IF EXISTS lookup.municipality;

CREATE TABLE IF NOT EXISTS lookup.municipality
(
    internal_id serial primary key,
    code text,
    county_code text,
    description text
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS lookup.municipality
    OWNER to postgres;
```