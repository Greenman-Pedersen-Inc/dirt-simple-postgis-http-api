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

            fastify.pg.connect(onConnect);

            function onConnect(err, client, release) {
                if (err) {
                    release();

                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server'
                    });
                } else {
                    if (request.query.selected_filters == undefined) {
                        release();

                        reply.send({
                            statusCode: 500,
                            error: 'Internal Server Error',
                            message: 'crash filter not submitted'
                        });
                    } else {
                        try {
                            client.query(sql(request.params, request.query), function onResult(err, result) {
                                release();

                                if (err) {
                                    reply.send(err);
                                    //here
                                } else {
                                    if (result) {
                                        if (result.rows && result.rows.length > 0) {
                                            if (result.rows[0].mvt) {
                                                const mvt = result.rows[0].mvt;

                                                if (mvt.length === 0) {
                                                    reply.code(204);
                                                }

                                                reply.header('Content-Type', 'application/x-protobuf').send(mvt);
                                                // here
                                            } else {
                                                reply.send({
                                                    statusCode: 500,
                                                    error: 'no mvt returned',
                                                    message: request
                                                });
                                                // here
                                            }
                                        } else {
                                            reply.send({
                                                statusCode: 500,
                                                error: 'no rows returned',
                                                message: request
                                            });

                                            // here
                                        }
                                    } else {
                                        reply.send({
                                            statusCode: 500,
                                            error: 'no data returned',
                                            message: request
                                        });

                                        // here
                                        fastify.logRequest()
                                    }
                                }
                            });
                        } catch (error) {
                            release();

                            reply.send({
                                statusCode: 500,
                                error: error,
                                message: request
                            });

                            // here
                        }
                    }
                }
            }
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
