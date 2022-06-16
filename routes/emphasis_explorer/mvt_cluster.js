const { makeCrashFilterQuery } = require('../../helper_functions/crash_filter_helper');

const metersPerPixel = function (zoomLevel) {
    const earthCircumference = 40075017;
    const latitudeRadians = 40.0583 * (Math.PI / 180);

    return (earthCircumference * Math.cos(latitudeRadians)) / Math.pow(2, zoomLevel + 9);
};

// route query
const sql = (params, query) => {
    // when the map is zoomed really tight, only group the clusters that are very close together (5ft)
    if (params.z > 15) {
        queryText = `
                with crash_data as (
                    SELECT 
                        ST_Transform(crash_data.geom, 3857) as geom,
                        crash_data.crashid,
                        crash_data.sri
                    FROM ${params.table} crash_data
                    WHERE ST_Intersects(geom, ST_Transform(ST_TileEnvelope(${params.z}, ${params.x}, ${
            params.y
        }), 4326))
                    -- Optional filter for the query input
                    ${query.filter ? ` AND ${query.filter}` : ''}
                    and geom is not null
                ), cluster_data AS (
                    SELECT
                        crashid,
                        sri,
                        geom as cluster_geometry,
                        ST_ClusterDBSCAN(geom, ${metersPerPixel(params.z) * 15 * 2}, 1) OVER () AS cluster_id
                    FROM crash_data
                ), complete_data as (
                    SELECT
                        cast(concat(cluster_id, ${params.z}::text, ${params.x}::text, ${
            params.y
        }::text) as bigint) as cluster_reference,
                        array_to_json(array_agg(crashid)) as crash_array,
                        array_to_json(array_agg(sri)) as sri_array,
                        count(*)::int as crash_count,
                        ST_AsMVTGeom(
                            st_centroid(ST_Collect(cluster_geometry)),
                            ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
                        ) as geom
                    FROM cluster_data
                    GROUP BY cluster_id
                )
                SELECT ST_AsMVT(complete_data.*, 'ard_accidents', 4096, 'geom', 'cluster_reference') AS mvt from complete_data;
            `;
    } else {
        queryText = `
                with crash_data as (
                    SELECT
                    crash_data.crashid,
                    crash_data.sri,
                    crash_data.geom
                    FROM ${params.table} crash_data
                    WHERE ST_Intersects(geom, ST_Transform(ST_TileEnvelope(${params.z}, ${params.x}, ${
            params.y
        }), 4326))
                    -- Optional filter for the query input
                    ${query.filter ? ` AND ${query.filter}` : ''}
                ), crash_count as (
                    select count(*)
                    from crash_data
                    union all
                    select ${22 - params.z}
                ), cluster_data as (
                    SELECT
                        crashid,
                        sri,
                        ST_ClusterKMeans(geom, (select min(count) from crash_count)::INTEGER) OVER() AS kmean,
                        geom
                    FROM crash_data
                ), kmean_clusters as(
                    SELECT
                        kmean,
                        count(*) as crash_count,
                        string_agg(DISTINCT sri, ',') sri_array,
                        string_agg(DISTINCT crashid, ',') crash_array,
                        ST_Centroid(ST_Extent(st_transform(st_setsrid(geom, 4326), 3857))) as geom
                    FROM cluster_data
                    GROUP BY kmean
                ), merged_cluster_data as (
                    SELECT
                        crash_count,
                        ST_ClusterDBSCAN(geom, ${metersPerPixel(params.z) * 15 * 2}, 1) OVER () AS cluster_id,
                        crash_array,
                        sri_array,
                        geom
                    FROM kmean_clusters
                ), complete_data as (
                    SELECT
                        sum(crash_count)::int as crash_count,
                        cast(concat(cluster_id, ${params.z}::text, ${params.x}::text, ${
            params.y
        }::text) as bigint) as cluster_reference,
                        ST_AsMVTGeom(
                            ST_Centroid(ST_Extent(geom)),
                            ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
                        ) as geom,
                        array_to_json(string_to_array(string_agg(crash_array, ','), ',')) as crash_array,
                        array_to_json(string_to_array(string_agg(sri_array, ','), ',')) as sri_array
                    FROM merged_cluster_data
                    GROUP BY cluster_id
                )
                SELECT ST_AsMVT(complete_data.*, 'ard_accidents', 4096, 'geom' ${
                    query.id_column ? `, '${query.id_column}'` : ''
                }) AS mvt from complete_data;
            `;
    }

    // console.log(queryText);
    return queryText;
};

// route schema
const schema = {
    description: 'Return table as Mapbox Vector Tile (MVT) for Cluster level',
    tags: ['mvt'],
    summary: 'return Cluster MVT',
    params: {
        table: {
            type: 'string',
            description: 'The name of the table or view.'
        },
        z: {
            type: 'integer',
            description: 'Z value of ZXY tile.'
        },
        x: {
            type: 'integer',
            description: 'X value of ZXY tile.'
        },
        y: {
            type: 'integer',
            description: 'Y value of ZXY tile.'
        }
    },
    querystring: {
        geom_column: {
            type: 'string',
            description: 'Optional geometry column of the table. The default is geom.',
            default: 'geom'
        },
        columns: {
            type: 'string',
            description: 'Optional columns to return with MVT. The default is no columns.'
        },
        id_column: {
            type: 'string',
            description:
                'Optional id column name to be used with Mapbox GL Feature State. This column must be an integer a string cast as an integer.'
        },
        filter: {
            type: 'string',
            description: 'Optional filter parameters for a SQL WHERE statement.'
        }
    }
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/mvt-cluster/:table/:z/:x/:y',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            request.tracker = new fastify.RequestTracker(
                request.headers,
                'crash_map',
                'mvt_cluster',
                JSON.stringify(Object.assign(request.query, request.params))
            );

            function onConnect(err, client, release) {
                if (err) {
                    release();
                    reply.code(500).send(error);
                    request.tracker.error(error);
                } else {
                    if (request.query.filter == undefined) {
                        release();

                        reply.code(400).send('no crash filter submitted');
                        request.tracker.error('no crash filter submitted');
                    } else {
                        try {
                            client.query(sql(request.params, request.query), function onResult(err, result) {
                                release();

                                if (err) {
                                    reply.code(500).send(err);
                                    request.tracker.error(err);
                                } else {
                                    if (result) {
                                        if (result.rows && result.rows.length > 0) {
                                            if (result.rows[0].mvt) {
                                                const mvt = result.rows[0].mvt;

                                                if (mvt.length === 0) {
                                                    reply.code(204);
                                                }

                                                reply.header('Content-Type', 'application/x-protobuf').send(mvt);
                                                request.tracker.complete();
                                            } else {
                                                reply.code(500).send(error);
                                                request.tracker.error(error);
                                            }
                                        } else {
                                            reply.code(500).send(error);
                                            request.tracker.error(error);
                                        }
                                    } else {
                                        reply.code(500).send(error);
                                        request.tracker.error(error);
                                    }
                                }
                            });
                        } catch (error) {
                            release();

                            reply.code(500).send(error);
                            request.tracker.error(error);
                        }
                    }
                }
            }

            fastify.pg.connect(onConnect);
        }
    });
    next();
};

module.exports.autoPrefix = '/emphasis_explorer';
