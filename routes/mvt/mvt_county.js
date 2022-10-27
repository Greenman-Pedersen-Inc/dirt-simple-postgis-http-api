const customTimeout = 10000;

const { makeCrashFilterQuery } = require('../../helper_functions/crash_filter_helper');

// route query
// require the funciton
const sql = (params, query) => {
    const accidentsTableName = 'ard_accidents_geom_partition';
    const parsed_filter = JSON.parse(query.selected_filters);
    const filter = makeCrashFilterQuery(parsed_filter, accidentsTableName);
    const whereClause = filter.whereClause;
    const fromClause = filter.fromClause;
    const queryText = `
        with selected_counties as (
            select
                ogc_fid,
                mun_cty_co,
                county_label,
                centroid,
                bounding_box,
                ST_AsMVTGeom(
                    geom_simplified,
                    ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
                ) as geom
            from county_boundaries_of_nj_3857
            where st_intersects(
                geom_simplified,
                ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
            )
        ), filtered_crash_data as (
            select
                ard_accidents_geom_partition.mun_cty_co, 
                COUNT(*) crash_count
            from selected_counties
            INNER JOIN ard_accidents_geom_partition
            ON ard_accidents_geom_partition.mun_cty_co = selected_counties.mun_cty_co
            ${fromClause ? ` ${fromClause}` : ''}
            ${whereClause ? `WHERE ${whereClause}` : ''}
            group by ard_accidents_geom_partition.mun_cty_co
        ), clipped_results as (
            select 
                CASE 
                WHEN filtered_crash_data.crash_count > 0 THEN filtered_crash_data.crash_count
                WHEN filtered_crash_data.crash_count IS NULL THEN 0
                ELSE 0
                END AS crash_count,
                selected_counties.*
            from selected_counties
            left join filtered_crash_data
            using (mun_cty_co)
        )
        SELECT ST_AsMVT(clipped_results.*, 'county_boundaries_of_nj_3857', 4096, 'geom', 'ogc_fid') AS mvt from clipped_results;
    `;
    return queryText;
};

// route schema
const schema = {
    description: 'Return table as Mapbox Vector Tile (MVT) for County level',
    tags: ['mvt'],
    summary: 'return County MVT',
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
        selected_filters: {
            type: 'string',
            description:
                'stringified JSON of crash filter object. ex: {"mp_start": "0", "mp_end": "11.6", "year": "2017,2018,2019", "contr_circum_code_vehicles": "01"}'
        }
    }
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/mvt/county/:z/:x/:y',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            request.tracker = new fastify.RequestTracker(
                request.headers,
                'crash_map',
                'mvt_county',
                JSON.stringify(Object.assign(request.query, request.params)),
                reply
            );

            function onConnect(error, client, release) {
                client.connectionParameters.query_timeout = customTimeout;
                request.tracker.start();

                if (error) {
                    reply.code(500).send(error);
                    request.tracker.error(error);
                    release();
                } else {
                    if (request.query.selected_filters == undefined) {
                        reply.code(400).send('no crash filter submitted');
                        request.tracker.error('no crash filter submitted');
                        release();
                    } else {
                        try {
                            client.query(sql(request.params, request.query), function onResult(error, result) {
                                if (error) {
                                    reply.code(500).send(error);
                                    request.tracker.error(error);
                                    release();
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
                                                release();
                                            } else {
                                                reply.code(500).send(error);
                                                request.tracker.error(error);
                                                release();
                                            }
                                        } else {
                                            reply.code(500).send(error);
                                            request.tracker.error(error);
                                            release();
                                        }
                                    } else {
                                        reply.code(500).send(error);
                                        request.tracker.error(error);
                                        release();
                                    }
                                }
                            });
                        } catch (error) {
                            reply.code(500).send(error);
                            request.tracker.error(error);
                            release();
                        }
                    }
                }
            }
            fastify.pg.connect(onConnect);
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
