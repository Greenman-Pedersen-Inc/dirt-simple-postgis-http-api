-- ogr2ogr -skipfailures -f "PostgreSQL" PG:"dbname=fdot_data user=postgres password=GPI2021!" "C:\Users\mcollins\OneDrive - Greenman-Pedersen, Inc\Downloads\SRIMuniBufferMercator_Featur\SRIMuniBufferMercator_Featur.json" -nln public.route_municipal_buffer -append

-- Table: public.route_municipal_buffer

DROP TABLE IF EXISTS public.route_municipal_buffer;

CREATE TABLE IF NOT EXISTS public.route_municipal_buffer
(
    internal_id serial primary key,
    sri text,
    mun_code text,
    county_name text,
    muni_name text,
    geom geometry(multipolygon, 3857)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.route_municipal_buffer
    OWNER to postgres;

CREATE INDEX ON public.route_municipal_buffer (SRI);
CREATE INDEX ON public.route_municipal_buffer (Municipality_Code);
CREATE INDEX ON public.route_municipal_buffer USING GIST (geom);

insert into route_municipal_buffer (sri, mun_code, county_name, muni_name, geom) select * from route_municipal_buffer_import

ALTER TABLE route_municipal_buffer
ADD COLUMN mun_cty_co text,
ADD COLUMN mun_mu text;
UPDATE public.route_municipal_buffer
	SET 
		mun_cty_co=substring(mun_code, 1, 2), 
		mun_mu=substring(mun_code, 3, 2);
		
CREATE INDEX ON public.route_municipal_buffer (mun_cty_co, mun_mu);