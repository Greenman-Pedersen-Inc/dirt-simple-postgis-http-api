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
COPY signals.jurisdiction_lookup(type_code,descr) FROM 'input/jurisType.txt' DELIMITER ',' CSV HEADER;
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
    type_code integer,
    updt_user_name text,
    updt_date timestamp,
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
COPY signals.srimp_jurisdiction_linkage(id,sri,mp_start,mp_end,type_code,updt_user_name,updt_date,created_user_name,created_date) FROM 'input/juris.txt' DELIMITER ',' CSV HEADER;
```

## Signal Table Update

Create a backup of the signals data.

```sql
SELECT *
INTO signals.signals_data_backup
FROM signals.signals_data;
```

Add a new column to the signal data to allow filtering on jurisdiction type code from SLD.

```sql
ALTER TABLE signals.signals_data
ADD COLUMN jurisdiction_type_code integer;
```

Join tables and update new field in signals table. The mileposts for a route overlap so the boundary conditions are established in the join.

```sql
UPDATE signals.signals_data ud
SET jurisdiction_type_code = s.type_code
FROM signals.srimp_jurisdiction_linkage s
WHERE ud.sri = s.sri
AND ud.mp > s.mp_start
AND ud.mp <= s.mp_end;
```
