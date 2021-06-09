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