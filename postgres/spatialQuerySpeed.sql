DROP MATERIALIZED VIEW ard_accidents_2015;
DROP MATERIALIZED VIEW ard_accidents_2016;
DROP MATERIALIZED VIEW ard_accidents_2017;
DROP MATERIALIZED VIEW ard_accidents_2018;
DROP MATERIALIZED VIEW ard_accidents_2019;
DROP MATERIALIZED VIEW ard_accidents_2020;
DROP MATERIALIZED VIEW ard_accidents_2021;

CREATE MATERIALIZED VIEW ard_accidents_2015 AS SELECT * FROM ard_accidents_geom where year = 2015 and geom is not null;
CREATE MATERIALIZED VIEW ard_accidents_2016 AS SELECT * FROM ard_accidents_geom where year = 2016 and geom is not null;
CREATE MATERIALIZED VIEW ard_accidents_2017 AS SELECT * FROM ard_accidents_geom where year = 2017 and geom is not null;
CREATE MATERIALIZED VIEW ard_accidents_2018 AS SELECT * FROM ard_accidents_geom where year = 2018 and geom is not null;
CREATE MATERIALIZED VIEW ard_accidents_2019 AS SELECT * FROM ard_accidents_geom where year = 2019 and geom is not null;
CREATE MATERIALIZED VIEW ard_accidents_2020 AS SELECT * FROM ard_accidents_geom where year = 2020 and geom is not null;
CREATE MATERIALIZED VIEW ard_accidents_2021 AS SELECT * FROM ard_accidents_geom where year = 2021 and geom is not null;

CREATE INDEX ON ard_accidents_2015 USING GIST (geom);
CREATE INDEX ON ard_accidents_2016 USING GIST (geom);
CREATE INDEX ON ard_accidents_2017 USING GIST (geom);
CREATE INDEX ON ard_accidents_2018 USING GIST (geom);
CREATE INDEX ON ard_accidents_2019 USING GIST (geom);
CREATE INDEX ON ard_accidents_2020 USING GIST (geom);
CREATE INDEX ON ard_accidents_2021 USING GIST (geom);

CLUSTER ard_accidents_2015 USING ard_accidents_2015_geom_idx;
CLUSTER ard_accidents_2016 USING ard_accidents_2016_geom_idx;
CLUSTER ard_accidents_2017 USING ard_accidents_2017_geom_idx;
CLUSTER ard_accidents_2018 USING ard_accidents_2018_geom_idx;
CLUSTER ard_accidents_2019 USING ard_accidents_2019_geom_idx;
CLUSTER ard_accidents_2020 USING ard_accidents_2020_geom_idx;
CLUSTER ard_accidents_2021 USING ard_accidents_2021_geom_idx;

SELECT ST_AsGeoJSON(subq.*, '', 9) AS geojson
FROM (
        SELECT geom,
            crashid,
            severity_rating5,
            year
        FROM ard_accidents_geom_last_5
        WHERE geom && ST_MakeEnvelope(
                -75.11535525726136,
                39.94669787743965,
                -75.01288139608705,
                39.98633502856583,
                4326
            )
    ) as subq

explain analyze SELECT ST_AsGeoJSON(subq.*, '', 9) AS geojson
FROM (
        SELECT geom,
            crashid,
            severity_rating5,
            year
        FROM ard_accidents_2015
        WHERE geom && ST_MakeEnvelope(
                -75.11535525726136,
                39.94669787743965,
                -75.01288139608705,
                39.98633502856583,
                4326
            )
        union all
        SELECT geom,
            crashid,
            severity_rating5,
            year
        FROM ard_accidents_2016
        WHERE geom && ST_MakeEnvelope(
                -75.11535525726136,
                39.94669787743965,
                -75.01288139608705,
                39.98633502856583,
                4326
            )
        union all
        SELECT geom,
            crashid,
            severity_rating5,
            year
        FROM ard_accidents_2017
        WHERE geom && ST_MakeEnvelope(
                -75.11535525726136,
                39.94669787743965,
                -75.01288139608705,
                39.98633502856583,
                4326
            )
        union all
        SELECT geom,
            crashid,
            severity_rating5,
            year
        FROM ard_accidents_2018
        WHERE geom && ST_MakeEnvelope(
                -75.11535525726136,
                39.94669787743965,
                -75.01288139608705,
                39.98633502856583,
                4326
            )
        union all
        SELECT geom,
            crashid,
            severity_rating5,
            year
        FROM ard_accidents_2019
        WHERE geom && ST_MakeEnvelope(
                -75.11535525726136,
                39.94669787743965,
                -75.01288139608705,
                39.98633502856583,
                4326
            )
        union all
        SELECT geom,
            crashid,
            severity_rating5,
            year
        FROM ard_accidents_2020
        WHERE geom && ST_MakeEnvelope(
                -75.11535525726136,
                39.94669787743965,
                -75.01288139608705,
                39.98633502856583,
                4326
            )
    ) as subq


-- EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON)
-- SELECT ST_AsGeoJSON(subq.*, '', 9) AS geojson
-- FROM (
--         SELECT geom,
--             crashid,
--             severity_rating5
--         FROM ard_accidents_geom_clean
--         WHERE geom && ST_MakeEnvelope(
-- 			-76.06355701822629,39.41185560341128,-73.95426040502001,40.3078348433699,
--             -75.11535525726136,39.94669787743965,-75.01288139608705,39.98633502856583,
--                 4326
--             )
--     ) as subq

EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON)
SELECT ST_AsGeoJSON(subq.*, '', 9) AS geojson
FROM (
        SELECT geom,
            crashid,
            severity_rating5
        FROM ard_accidents_last_5_geom
        WHERE geom && ST_MakeEnvelope(
				-76.06355701822629,39.41185560341128,-73.95426040502001,40.3078348433699,
                -75.11535525726136,
                39.94669787743965,
                -75.01288139608705,
                39.98633502856583,
                4326
            )
    ) as subq

-- EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON)
-- SELECT ST_AsGeoJSON(subq.*, '', 9) AS geojson
-- FROM (
--         SELECT geom,
--             crashid,
--             severity_rating5,
--             year
--         FROM ard_accidents_geom_last_5
--         WHERE geom && ST_MakeEnvelope(
--                 -75.11535525726136,
--                 39.94669787743965,
--                 -75.01288139608705,
--                 39.98633502856583,
--                 4326
--             )
--     ) as subq

-- EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON) SELECT ST_AsGeoJSON(subq.*, '', 9) AS geojson
-- FROM (
-- --         EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON) 
-- 		SELECT geom,
--             crashid,
--             severity_rating5,
--             year
--         FROM ard_accidents_2015
--         WHERE geom && ST_MakeEnvelope(
--                 -75.11535525726136,
--                 39.94669787743965,
--                 -75.01288139608705,
--                 39.98633502856583,
--                 4326
--             )
--         union all
--         SELECT geom,
--             crashid,
--             severity_rating5,
--             year
--         FROM ard_accidents_2016
--         WHERE geom && ST_MakeEnvelope(
--                 -75.11535525726136,
--                 39.94669787743965,
--                 -75.01288139608705,
--                 39.98633502856583,
--                 4326
--             )
--         union all
--         SELECT geom,
--             crashid,
--             severity_rating5,
--             year
--         FROM ard_accidents_2017
--         WHERE geom && ST_MakeEnvelope(
--                 -75.11535525726136,
--                 39.94669787743965,
--                 -75.01288139608705,
--                 39.98633502856583,
--                 4326
--             )
--         union all
--         SELECT geom,
--             crashid,
--             severity_rating5,
--             year
--         FROM ard_accidents_2018
--         WHERE geom && ST_MakeEnvelope(
--                 -75.11535525726136,
--                 39.94669787743965,
--                 -75.01288139608705,
--                 39.98633502856583,
--                 4326
--             )
--         union all
--         SELECT geom,
--             crashid,
--             severity_rating5,
--             year
--         FROM ard_accidents_2019
--         WHERE geom && ST_MakeEnvelope(
--                 -75.11535525726136,
--                 39.94669787743965,
--                 -75.01288139608705,
--                 39.98633502856583,
--                 4326
--             )
--         union all
--         SELECT geom,
--             crashid,
--             severity_rating5,
--             year
--         FROM ard_accidents_2020
--         WHERE geom && ST_MakeEnvelope(
--                 -75.11535525726136,
--                 39.94669787743965,
--                 -75.01288139608705,
--                 39.98633502856583,
--                 4326
--             )
--     ) as subq