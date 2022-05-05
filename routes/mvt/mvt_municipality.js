const { makeCrashFilterQuery } = require('../../helper_functions/crash_filter_helper');

// route query
const sql = (params, query) => {
    const accidentsTableName = 'ard_accidents_geom_partition';
    const parsed_filter = JSON.parse(query.selected_filters);
    const filter = makeCrashFilterQuery(parsed_filter, accidentsTableName);
    const whereClause = filter.whereClause;
    const fromClause = filter.fromClause;
    const queryText = `
        with selected_municipalities as (
            select
                ogc_fid,
                mun_cty_co,
                mun_mu,
                mun_label,
                concat(INITCAP(county), ' County') county,
                centroid,
                bounding_box,
                ST_AsMVTGeom(
                    geom_simplified,
                    ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
                ) as geom
            from municipal_boundaries_of_nj_3857
            where st_intersects(
                geom_simplified,
                ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
            )
        ), filtered_crash_data as (
            select
                selected_municipalities.mun_cty_co,
                selected_municipalities.mun_mu,
                COUNT(*) crash_count
            from selected_municipalities
            left join ard_accidents_geom_partition
            on ard_accidents_geom_partition.mun_cty_co = selected_municipalities.mun_cty_co
            and ard_accidents_geom_partition.mun_mu = selected_municipalities.mun_mu
            ${fromClause ? ` ${fromClause}` : ''}
            ${whereClause ? ` WHERE ${whereClause}` : ''}
            group by selected_municipalities.mun_cty_co, selected_municipalities.mun_mu
        ), clipped_results as (
            select 
                  CASE 
                    WHEN filtered_crash_data.crash_count > 0 THEN filtered_crash_data.crash_count
                    WHEN filtered_crash_data.crash_count IS NULL THEN 0
                  ELSE 0
                END AS crash_count,
                selected_municipalities.*
            from selected_municipalities
            left join filtered_crash_data
            using (mun_cty_co, mun_mu)
        )
        SELECT ST_AsMVT(clipped_results.*, 'municipal_boundaries_of_nj_3857', 4096, 'geom', 'ogc_fid') AS mvt from clipped_results;
    `;

    //console.log(queryText);
    return queryText;
};

// route schema
const schema = {
    description: 'Return table as Mapbox Vector Tile (MVT) for Muni level',
    tags: ['mvt'],
    summary: 'return Muni MVT',
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
            description: 'Optional filter parameters for a SQL WHERE statement.'
        }
    }
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/mvt/municipality/:z/:x/:y',
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
                            const requestTracker = new fastify.RequestTracker(
                                request.headers,
                                'crash_map',
                                'mvt_municipality',
                                JSON.stringify(Object.assign(request.query, request.params))
                            );
                            client.query(sql(request.params, request.query), function onResult(err, result) {
                                release();

                                if (err) {
                                    reply.send(err);
                                    requestTracker.error(err);
                                } else {
                                    if (result) {
                                        if (result.rows && result.rows.length > 0) {
                                            if (result.rows[0].mvt) {
                                                const mvt = result.rows[0].mvt;

                                                if (mvt.length === 0) {
                                                    reply.code(204);
                                                }

                                                reply.header('Content-Type', 'application/x-protobuf');
                                                reply.send(mvt);
                                            } else {
                                                reply.send({
                                                    statusCode: 500,
                                                    error: 'no mvt returned',
                                                    message: request
                                                });
                                            }
                                        } else {
                                            reply.send({
                                                statusCode: 500,
                                                error: 'no rows returned',
                                                message: request
                                            });
                                        }
                                    } else {
                                        reply.send({
                                            statusCode: 500,
                                            error: 'no data returned',
                                            message: request
                                        });
                                    }
                                    requestTracker.complete();
                                }
                            });
                        } catch (error) {
                            release();

                            reply.send({
                                statusCode: 500,
                                error: 'issue with query',
                                message: request
                            });
                        }
                    }
                }
            }
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
