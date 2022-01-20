# Creation of Jurisdiction Boundary Layers

[OSGeoShell](https://trac.osgeo.org/osgeo4w/)

Installing this after installing postgres, postgis 3, then running the following commands will import a geojson into the database. No need to create table beforehand. It will fail if it is already there.

```bash
ogr2ogr -f "PostgreSQL" PG:"host=34.229.63.174 dbname=ard_data user=postgres password=GPI2021!" "C:\Users\mcollins\OneDrive - Greenman-Pedersen, Inc\Downloads\Municipal_Boundaries_of_NJ.geojson" -nln municipal_boundaries_of_nj -append

ogr2ogr -f "PostgreSQL" PG:"host=34.229.63.174 dbname=ard_data user=postgres password=GPI2021!" "C:\Users\mcollins\OneDrive - Greenman-Pedersen, Inc\Downloads\County_Boundaries_of_NJ.geojson" -nln county_boundaries_of_nj -append
```

Calculated centroids for the labels as follows:

```sql
ALTER TABLE municipal_boundaries_of_nj
ADD COLUMN centroid double precision[];

UPDATE public.municipal_boundaries_of_nj
	SET centroid=array[ST_X(ST_Centroid(wkb_geometry)), ST_Y(ST_Centroid(wkb_geometry))]
  ```
  
  # Segment Polygon Layer Updates
  ```sql
  -- create an intersect of the segment polygons and the municipal boundaries
SELECT internal_id, objectid, ST_Area(ST_INTERSECTION(geom, wkb_geometry))
into segment_jurisdiction_join
FROM segment_polygons, municipal_boundaries_of_nj_3857
where geom && wkb_geometry
and ST_IsValid(geom)

-- create indexes on the join fields and the area (might not be necessary)
CREATE INDEX ON segment_jurisdiction_join (internal_id);
CREATE INDEX ON segment_jurisdiction_join (objectid);
CREATE INDEX ON segment_jurisdiction_join (st_area);

-- select intersection that has the largest area as this is the largest overlap
SELECT 
	DISTINCT internal_id, 
	FIRST_VALUE(objectid) OVER (
		PARTITION BY internal_id ORDER BY st_area DESC
	) objectid
	INTO segment_jursidiction_join_max
FROM segment_jurisdiction_join

-- join in the muni and county names to the maximum area table
select a.internal_id, a.sri, a.mp, name as muni_name, county as county_name, a.geom
into segment_polygons_updated
from segment_polygons a
left join segment_jursidiction_join_max b
on a.internal_id = b.internal_id
left join municipal_boundaries_of_nj_3857 c
on b.objectid = c.objectid

-- create indexes on sri and stndrd_rt_id to speed join
CREATE INDEX ON segment_polygons_updated (sri);
CREATE INDEX ON srilookupname (stndrd_rt_id);

-- the srilookup has many redundant values, this creates a table with the most recent (by year) entry
SELECT 
	DISTINCT stndrd_rt_id, 
	FIRST_VALUE(name) OVER (
		PARTITION BY stndrd_rt_id ORDER BY year DESC
	) route_name
into sri_lookup_name_current
FROM srilookupname

-- create indexes on stndrd_rt_id to speed join
CREATE INDEX ON sri_lookup_name_current (stndrd_rt_id);

-- create new table that now includes the route name
SELECT
	distinct internal_id,
	sri, 
	mp, 
	muni_name, 
	county_name,
	objectid as route_name, 
	st_transform(geom, 4326) geom
into segement_polygon_final
FROM public.segment_polygons_updated
left join sri_lookup_name_current
on sri = stndrd_rt_id;

-- update the table with formatted county names
UPDATE public.segement_polygon_final
	SET county_name = concat(initcap(county_name)::text, ' County')
	where county_name is not null;
	
-- finally, update the table with formatted route names
UPDATE public.segement_polygon_final
	SET route_name = initcap(route_name)::text
	where route_name is not null;
```
