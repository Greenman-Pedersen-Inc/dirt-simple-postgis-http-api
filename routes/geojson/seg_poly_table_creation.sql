-- ogr2ogr -f "PostgreSQL" PG:"dbname=fdot_data user=postgres password=GPI2021!" "C:\Users\mcollins\OneDrive - Greenman-Pedersen, Inc\Downloads\SegPolyWithAttributes_Featur\SegPolyWithAttributes_Featur.json" -nln public.segment_polygons -append

-- Table: public.segment_polygons

DROP TABLE IF EXISTS public.segment_polygons;

CREATE TABLE IF NOT EXISTS public.segment_polygons
(
    internal_id serial primary key,
    SRI text,
    MP double precision,
    geom geometry(polygon, 3857)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.segment_polygons
    OWNER to postgres;

CREATE INDEX ON public.segment_polygons (SRI, MP);
CREATE INDEX ON public.segment_polygons USING GIST (geom);