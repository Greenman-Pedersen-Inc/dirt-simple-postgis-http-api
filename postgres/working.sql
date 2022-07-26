--   SELECT json_build_object(
--             'type', 'FeatureCollection',
--             'crs',  json_build_object(
--                 'type',      'name',
--                 'properties', json_build_object(
--                     'name', 'EPSG:4326'
--                 )
--             ),
--             'features', json_agg(
--                 json_build_object(
--                     'type',       'Feature',
--                     'geometry',   ST_AsGeoJSON(geom)::json,
--                     'properties', json_build_object(
--                         'sri', sri,
--                         'mile_post', mp,
--                         'crashes', crashes
--                     )
--                 )
--             )
--         )
--         FROM (
--             SELECT
--                 grouped_crash_data.*,
--                 ST_Transform(geometry_join.geom, 4326) as geom
--             FROM (
--                 SELECT segment_polygons.sri, segment_polygons.mp, count(*) as crashes from segment_polygons
--                 left join ard_accidents_geom_partition
--                 on segment_polygons.sri = ard_accidents_geom_partition.calc_sri
--                 and segment_polygons.mp = ard_accidents_geom_partition.calc_milepost
--                 where segment_polygons.sri = '00000078__'
--                 AND year > 2015
--                 group by segment_polygons.sri, segment_polygons.mp
--             ) grouped_crash_data
--             left join segment_polygons geometry_join
--             on geometry_join.sri = grouped_crash_data.sri
--             and geometry_join.mp = grouped_crash_data.mp
--         ) features
		
--             SELECT
--                 grouped_crash_data.*,
--                 ST_Transform(geometry_join.geom, 4326) as geom
--             FROM (
--                 SELECT 
-- 					route_municipal_buffer.sri, 
-- 					count(*) as crashes
-- 				from route_municipal_buffer
--                 left join ard_accidents_geom_partition
--                 on route_municipal_buffer.sri = ard_accidents_geom_partition.calc_sri
--                 where route_municipal_buffer.sri = '00000078__'
-- 				and ard_accidents_geom_partition.calc_milepost is null
-- --                 AND year > 2015
--                 group by route_municipal_buffer.sri
				
-- 				select ard_accidents_geom_partition.calc_milepost, count(*)
-- 				from ard_accidents_geom_partition
-- 				where year > 2015
-- 				and ard_accidents_geom_partition.calc_sri = '00000078__'
-- -- 				and calc_milepost is null
-- 				group by 1
-- 				order by 2 desc
				
-- 				select count(*) from ard_accidents_geom_partition where sri = '00000078__'
-- 				union all
-- 				select count(*) from ard_accidents_geom_partition where calc_sri = '00000078__'
-- 				and calc_milepost is not null
				
				
--             ) grouped_crash_data
--             left join segment_polygons geometry_join
--             on geometry_join.sri = grouped_crash_data.sri
--             and geometry_join.mp = grouped_crash_data.mp		
		

with crash_data as (
	select sri, milepost, mun_cty_co, mun_mu, count(*) from ard_accidents_geom_partition
	where sri = '00000078__'
	and year = 2016
	group by sri, milepost, mun_cty_co, mun_mu
)
-- select segment_polygons.sri, segment_polygons.mp, crash_data.count, segment_polygons.geom from crash_data
-- left join segment_polygons
-- on segment_polygons.sri = crash_data.sri
-- and segment_polygons.mp = crash_data.milepost

select * from crash_data 
left join route_municipal_buffer
on crash_data.sri = route_municipal_buffer.sri
and crash_data.mun_cty_co = route_municipal_buffer.mun_cty_co
-- split the mun_code into mun_mu and mun_cty_co




-- where milepost is null and mun_cty_co is not null and mun_mu is not null



--      SELECT json_build_object(
--             'type', 'FeatureCollection',
--             'crs',  json_build_object(
--                 'type',      'name', 
--                 'properties', json_build_object(
--                     'name', 'EPSG:4326'  
--                 )
--             ), 
--             'features', json_agg(
--                 json_build_object(
--                     'type',       'Feature',
--                     'geometry',   ST_AsGeoJSON(geom)::json,
--                     'properties', json_build_object(
--                         'sri', sri,
--                         'mile_post', mp,
--                         'crashes', crashes
--                     )
--                 )
--             )
--         ) as geojson
--         FROM (
--             SELECT
--                 grouped_crash_data.*,
--                 ST_Transform(geometry_join.geom, 4326) as geom
--             FROM (
--                 SELECT segment_polygons.sri, segment_polygons.mp, count(*) as crashes from segment_polygons
--                 left join ard_accidents_geom_partition
--                 on segment_polygons.sri = ard_accidents_geom_partition.sri
--                 and segment_polygons.mp = ard_accidents_geom_partition.milepost
--                 where segment_polygons.sri = '00000078__'
--                  AND year =2016
--                 group by segment_polygons.sri, segment_polygons.mp
--             ) grouped_crash_data
--             left join segment_polygons geometry_join
--             on geometry_join.sri = grouped_crash_data.sri
--             and geometry_join.mp = grouped_crash_data.mp
--         ) features



		