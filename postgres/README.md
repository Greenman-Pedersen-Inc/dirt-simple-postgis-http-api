# Creation of Jurisdiction Boundary Layers

[OSGeoShell](https://trac.osgeo.org/osgeo4w/)

Installing this after installing postgres, postgis 3, then running the following commands will import a geojson into the database. No need to create table beforehand. It will fail if it is already there.

```
ogr2ogr -f "PostgreSQL" PG:"host=34.229.63.174 dbname=ard_data user=postgres password=GPI2021!" "C:\Users\mcollins\OneDrive - Greenman-Pedersen, Inc\Downloads\Municipal_Boundaries_of_NJ.geojson" -nln municipal_boundaries_of_nj -append

ogr2ogr -f "PostgreSQL" PG:"host=34.229.63.174 dbname=ard_data user=postgres password=GPI2021!" "C:\Users\mcollins\OneDrive - Greenman-Pedersen, Inc\Downloads\County_Boundaries_of_NJ.geojson" -nln county_boundaries_of_nj -append
```