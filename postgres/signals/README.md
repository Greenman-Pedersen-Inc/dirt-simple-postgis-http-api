# Creation of Jurisdiction Table

These tables were created to join the jurisdiction information from the SLD to the signals information in the Signal Explorer module.

## Jurisdiction Lookup Table

The first component is a table of lookup values that tell which jurisdiction a code belongs to.

### Table Creation

This query creates the table for the lookup values.

```sql
CREATE TABLE IF NOT EXISTS signals.jurisdiction_lookup
(
    internal_id serial primary key,
    type_code integer,
    descr text
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS signals.jurisdiction_lookup
    OWNER to postgres;
```

### Table Population

This query takes the text file as input and populates the previously created table.

```sql
COPY public.crash(type_code,descr) FROM 'input/jurisType.txt' DELIMITER ',' CSV HEADER;
```

## SRI-MP Jurisdiction Linkage Data

The second component is a table of values that tell which jurisdiction should be attributed to each section of roadway.

### Table Creation

This query creates the table for the lookup values.

```sql
CREATE TABLE IF NOT EXISTS signals.srimp_jurisdiction_linkage
(
    internal_id serial primary key,
    id integer,
    sri text,
    mp_start numeric,
    mp_end numeric,
    type_code text,
    updt_user_name text,
    updt_date text,
    created_user_name text,
    created_date timestamp
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS signals.srimp_jurisdiction_linkage
    OWNER to postgres;
```

### Table Population

This query takes the text file as input and populates the previously created table.

```sql
COPY public.crash(id,sri,mp_start,mp_end,type_code,updt_user_name,updt_date,created_user_name,created_date) FROM 'input/juris.txt' DELIMITER ',' CSV HEADER;
```
