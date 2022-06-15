# Creation of Jurisdiction Boundary Layers

[OSGeoShell](https://trac.osgeo.org/osgeo4w/)

Installing this after installing postgres, postgis 3, then running the following commands will import a geojson into the database. No need to create table beforehand. It will fail if it is already there.

```bash
ogr2ogr -f "PostgreSQL" PG:"host=34.229.63.174 dbname=ard_data user=postgres password=GPI2021!" "C:\Users\mcollins\OneDrive - Greenman-Pedersen, Inc\Downloads\Municipal_Boundaries_of_NJ.geojson" -nln municipal_boundaries_of_nj -append

ogr2ogr -f "PostgreSQL" PG:"host=34.229.63.174 dbname=ard_data user=postgres password=GPI2021!" "C:\Users\mcollins\OneDrive - Greenman-Pedersen, Inc\Downloads\County_Boundaries_of_NJ.geojson" -nln county_boundaries_of_nj -append
```

## Centroid Calculation

```sql
ALTER TABLE municipal_boundaries_of_nj
ADD COLUMN centroid double precision[];

UPDATE public.municipal_boundaries_of_nj
    -- if a text array was desirable you could calculate it this way
    -- set centroid=concat('[', round(ST_X(ST_Centroid(wkb_geometry))::numeric, 4), round(ST_Y(ST_Centroid(wkb_geometry))::numeric,4), ']');
    SET centroid=array[ST_X(ST_Centroid(wkb_geometry)), ST_Y(ST_Centroid(wkb_geometry))]
```

## Bounding Box Calculation

```sql
-- add simple field to contain bounding box geometry for zooming to jurisdiction
alter table municipal_boundaries_of_nj_3857 add bounding_box text;

-- calculate bounding coordinates then format them into a string
with text_bbox as (
	select
		objectid,
		concat(
			'[[',
			round(ST_XMin(ST_Extent(st_transform(wkb_geometry, 4326)))::numeric, 4),
			',' ,
			round(ST_YMin(ST_Extent(st_transform(wkb_geometry, 4326)))::numeric, 4),
			'],[',
			round(ST_XMin(ST_Extent(st_transform(wkb_geometry, 4326)))::numeric, 4),
			',' ,
			round(ST_YMin(ST_Extent(st_transform(wkb_geometry, 4326)))::numeric, 4),']]') concat_string
	from county_boundaries_of_nj_3857
	group by 1
)

-- update the new field and by joining the concatenated strings
UPDATE public.county_boundaries_of_nj_3857
SET bounding_box = text_bbox.concat_string
from text_bbox
where county_boundaries_of_nj_3857.objectid = text_bbox.objectid
```

# Segment Polygon Layer Updates

Segment polygon layer was created from a supplied centerline file. This centerline was then split into 1/10th of a mile sections. These segments were then buffered for visualization. The segment polygons were then imported into the postgres database using web mercator projection.

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

# ARD Accidents Table

To add the rounded milepost column for binning we run the following:

```sql
ALTER TABLE ard_accidents_geom_partition ADD rounded_mp numeric(4,1);
CREATE INDEX ON public.ard_accidents_geom_partition (rounded_mp);
UPDATE public.ard_accidents_geom_partition SET rounded_mp = ROUND(FLOOR(milepost * 10) / 10, 1);
```

# Administration Traffic Tracking

Update the table to include elapsed time calculated column. That way it can log entry as well as performance. Then add indices for speed.

```sql
select * into traffic.crash_map_backup from traffic.crash_map;

ALTER TABLE traffic.crash_map
ADD elapsed_time bigint GENERATED ALWAYS AS (execution_time - request_time) STORED;

CREATE INDEX ON traffic.crash_map (elapsed_time);
CREATE INDEX ON traffic.crash_map (request_time);
CREATE INDEX ON traffic.crash_map (user_query);
CREATE INDEX ON traffic.crash_map (user_name);
```

## Token Duration

Route to see how long users are accessing Voyager for with a given token.

```sql
with token_duration_info as (
    select
        TO_TIMESTAMP(min(request_time)/1000) as access_date,
        age(
            TO_TIMESTAMP(max(request_time)/1000),
            TO_TIMESTAMP(min(execution_time)/1000)
        ) as duration,
        user_name
    from traffic.crash_map
    group by token, user_name
)
select * from token_duration_info
where duration > make_interval(0,0,0,0,0,1)
order by 1 desc
```

## Max Query Duration and Timeout

Give the top 100 queries from the crash_map to highlight any issues that might arise from using filters, etc.

```sql
select user_name, elapsed_time, end_point, user_query
from traffic.crash_map
order by 2 desc
limit 100
```

## Filter Frequency

PURPOSE: This method is designed to create a list of most frequently applied data filters

VARIABLES:

-   excludeDevelopers => if true, the function will not consider records created by administrators
-   FilterFrequency => a list of most frequent filters

RETURNS: a list of most frequent filters

SIMILAR METHODS: ActionLog_ListOfActions

### Service View

Similar to the module frequency, we start by creating a view of all filter frequencies and aggregating them.

```sql
SELECT count(*) as frequency, end_point, user_query FROM traffic.admin group by user_query
union all
SELECT count(*) as frequency, end_point, user_query FROM traffic.aggregate_counts group by user_query
union all
SELECT count(*) as frequency, end_point, user_query FROM traffic.crash_map group by user_query
union all
SELECT count(*) as frequency, end_point, user_query FROM traffic.crash_map_backup group by user_query
union all
SELECT count(*) as frequency, end_point, user_query FROM traffic.jurisdiction group by user_query
union all
SELECT count(*) as frequency, end_point, user_query FROM traffic.maintenance group by user_query
union all
SELECT count(*) as frequency, end_point, user_query FROM traffic.sunglare group by user_query
union all
SELECT count(*) as frequency, end_point, user_query FROM traffic.weather group by user_query
```

### Service Code

```sql
            List<KeyValuePair<string, int>> FilterFrequency = new List<KeyValuePair<string, int>>();
            DateTime dateTime = DateTime.Today.AddMonths(-2); // The log will only show the last 2 months of filters 01-27-2020

            string SQL;
            if (excludeDevelopers)
            {
                SQL = "SELECT count(*) as frequency, arguments " +
                      "FROM action_logs " +
                      "where function_called NOT LIKE 'Action_Log%' " +
                      "and function_called not in(" + string.Join(",", FunctionsToExclude) + ") " +
                      "AND user_name NOT LIKE '%gpi%' " +
                      "AND user_name NOT LIKE '%gpinet%' " +
                      "AND execution_date >= '" + dateTime.ToString("yyyy-MM-dd") + "' " +
                      "group by arguments";
            }
            else
            {
                SQL = "SELECT count(*) as frequency, arguments " +
                      "FROM action_logs " +
                      "where function_called NOT LIKE 'Action_Log%' " +
                      "and function_called not in(" + string.Join(",", FunctionsToExclude) + ") " +
                      "group by arguments";
            }




  DataTable filterData = new DataTable();
            Dictionary<string, int> filterFrequencies = new Dictionary<string, int>();

            using (NpgsqlConnection SCN = new NpgsqlConnection(ConnectionString))
            {
                SCN.Open();
                using (Npgsql.NpgsqlCommand CMD = new Npgsql.NpgsqlCommand(SQL, SCN))
                {
                    using (Npgsql.NpgsqlDataReader NDR = CMD.ExecuteReader())
                    {
                        while (NDR.Read())
                        {
                            try
                            {
                                int frequency = NDR.GetInt32(0);
                                string arguments = NDR.GetString(1);
                                var objectPropertiesDictionary = JsonConvert.DeserializeObject<Dictionary<string, object>>(arguments);

                                foreach (KeyValuePair<string, object> property in objectPropertiesDictionary)
                                {
                                    string dictionaryKey = property.Key;
                                    object dictionaryValue = property.Value;


                                    //if (dictionaryKey == "token")
                                    //{

                                    //    Console.WriteLine("things");
                                    //}


                                    if (dictionaryValue != null)
                                    {
                                        if (filterFrequencies.ContainsKey(dictionaryKey))
                                        {
                                            filterFrequencies[dictionaryKey] += frequency;
                                        }
                                        else
                                        {
                                            filterFrequencies[dictionaryKey] = frequency;
                                        }
                                    }
                                }
                            }
                            catch(Exception ex)
                            {
                                Console.WriteLine(ex.ToString());
                            }
                        }

                        return filterFrequencies.ToList().OrderByDescending(p => p.Value).ToList();
                    }

```

## Users Per day

PURPOSE: This function counts the number of requests submitted by users and groups the result by the date
VARIABLES:
excludeDevelopers => if true, the function will not consider records created by administrators
endDate, startDate => end, start date for the request
FunctionsToExclude => functions to be excluded from the request
RETURNS: a list of request counts
SIMILAR METHODS: ActionLog_UserFrequency

```sql
SQL = "select execution_date, count(*) as frequency from (" +
        "SELECT date_trunc('day', execution_date)::date::varchar as execution_date " +
        "FROM public.action_logs " +
        "WHERE execution_date > @start_date " +
        "AND execution_date < @end_date " +
        "AND function_called NOT LIKE 'ActionLog%' " +
        "AND function_called not in(" + string.Join(",", FunctionsToExclude) + ") " +
        "AND user_name NOT LIKE '%gpi%' " +
        "AND user_name NOT LIKE '%gpinet%' " +
        ") as ExecutionDates " +
        "group by execution_date " +
        "order by execution_date";
}
else
{
SQL = "select execution_date, count(*) as frequency from (" +
        "SELECT date_trunc('day', execution_date)::date::varchar as execution_date " +
        "FROM public.action_logs " +
        "WHERE execution_date > @start_date " +
        "AND execution_date < @end_date " +
        "AND function_called NOT LIKE 'ActionLog%' " +
        "AND function_called not in(" + string.Join(",", FunctionsToExclude) + ") " +
        ") as ExecutionDates " +
        "group by execution_date " +
        "order by execution_date";
```

## Module Use

There are two components to this service. The first is a view that shows the number of requests for all modules. The second is the service itself to return the data. This is much easier that querying all tables in the schema and parameterizing them into the query (also the internet thinks that is anti-pattern).

### Service View

To get a list of all the tables in the schema, this query can be used:

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'traffic';
```

Then this result can be used to formulate the view query accordingly:

```sql
select 'admin'::text as module, count(*) as count from traffic.admin
union all
select 'crash_map'::text as module, count(*) as count from traffic.crash_map
union all
select 'jurisdiction'::text as module, count(*) as count from traffic.jurisdiction
union all
select 'maintenance'::text as module, count(*) as count from traffic.maintenance
union all
select 'sunglare'::text as module, count(*) as count from traffic.sunglare
union all
select 'weather'::text as module, count(*) as count from traffic.weather;
```

### Service Query

The service query at this point is very straighforward.

```sql
select * from traffic.aggregate_counts;
```
