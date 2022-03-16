
-- add simple field to contain bounding box geometry for zooming to jurisdiction
ALTER TABLE municipal_boundaries_of_nj_3857 DROP COLUMN bounding_box; 
alter table municipal_boundaries_of_nj_3857 add bounding_box text;
-- calculate bounding coordinates then format them into a string
with text_bbox as (
    select
        objectid, 
        concat(
            '[[', 
            round(ST_XMin(ST_Extent(st_transform(wkb_geometry, 4326)))::numeric, 4), 
            ',' , 
            round(ST_YMax(ST_Extent(st_transform(wkb_geometry, 4326)))::numeric, 4),
            '],[', 
            round(ST_XMax(ST_Extent(st_transform(wkb_geometry, 4326)))::numeric, 4), 
            ',' , 
            round(ST_YMin(ST_Extent(st_transform(wkb_geometry, 4326)))::numeric, 4), 
            ']]'
        ) concat_string
    from county_boundaries_of_nj_3857
    group by 1
)
-- update the new field and by joining the concatenated strings
UPDATE public.county_boundaries_of_nj_3857
SET bounding_box = text_bbox.concat_string
from text_bbox
where county_boundaries_of_nj_3857.objectid = text_bbox.objectid
