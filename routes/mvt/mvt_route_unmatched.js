// route query
const { makeCrashFilterQuery } = require('../../helper_functions/crash_filter_helper');

const sql = (params, query) => {
    const accidentsTableName = 'ard_accidents_geom_partition';
    let parsed_filter = JSON.parse(query.selected_filters);
    const selectedSRI = parsed_filter.sri;

    delete parsed_filter.sri;

    const filter = makeCrashFilterQuery(parsed_filter, accidentsTableName);
    const queryText = `
            with juridiction_polygons as (
                select 
                    internal_id,
                    mun_cty_co,
                    mun_mu,
                    sri,
                    ST_AsMVTGeom(
                        geom,
                        ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
                    ) as geom
                from route_municipal_buffer
                where sri = '${selectedSRI}'
                and st_intersects(
                    geom,
                    ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
                )
            ), filtered_crash_data as (
                select 
                    juridiction_polygons.internal_id,
                    count(*) as crash_count,
                    array_to_json(array_agg(crashid)) crash_array
                from ard_accidents_geom_partition
                inner join juridiction_polygons
                on ard_accidents_geom_partition.sri = juridiction_polygons.sri
                and ard_accidents_geom_partition.mun_cty_co = juridiction_polygons.mun_cty_co
                and ard_accidents_geom_partition.mun_mu = juridiction_polygons.mun_mu
                where milepost is null
                
                -- including the SRI here makes the query MUCH slower
                ${filter ? ` AND ${filter.whereClause}` : ''}
                
                group by juridiction_polygons.internal_id
            ), clipped_results as (
                select
                    filtered_crash_data.crash_count,
                    filtered_crash_data.crash_array,
                    juridiction_polygons.*
                from juridiction_polygons
                left join filtered_crash_data
                using(internal_id)
            )
            SELECT ST_AsMVT(clipped_results.*, 'route_municipal_buffer', 4096, 'geom', 'internal_id') AS mvt from clipped_results;
    `;
    //console.log(queryText)
    return queryText;
};

// route schema
const schema = {
    description: 'Return table as Mapbox Vector Tile (MVT) for route level',
    tags: ['mvt'],
    summary: 'return route MVT',
    params: {
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
        url: '/mvt/route-unmatched/:z/:x/:y',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            request.tracker = new fastify.RequestTracker(
                request.headers,
                'crash_map',
                'mvt_route_unmatched',
                JSON.stringify(Object.assign(request.query, request.params)),
                reply
            );

            function onConnect(error, client, release) {
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
                            client.query(sql(request.params, request.query), function onResult(err, result) {
                                if (err) {
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
