// route query
const { makeCrashFilterQuery } = require('../../helper_functions/crash_filter_helper');

const sql = (params, query) => {
    const accidentsTableName = 'ard_accidents_geom_partition';
    let parsed_filter = JSON.parse(query.selected_filters);
    const selectedSRI = parsed_filter.sri;

    delete parsed_filter.sri;

    const filter = makeCrashFilterQuery(parsed_filter, accidentsTableName);
    const queryText = `
                with selected_segment_polygons as (
                    select 
                        internal_id, 
                        sri, 
                        mp
                    from segment_polygon
                    where sri = '${selectedSRI}'
                    and st_intersects(
                        geom,
                        ST_TileEnvelope(
                            ${params.z}, 
                            ${params.x}, 
                            ${params.y}
                        )
                    )
                ), filtered_crash_data as (
                    select 
                        selected_segment_polygons.internal_id,
                        count(*) as crash_count,
                        array_to_json(array_agg(ard_accidents_geom_partition.crashid)) as crash_array
                    from ard_accidents_geom_partition
                    inner join selected_segment_polygons
                    on ard_accidents_geom_partition.sri = selected_segment_polygons.sri
                    and ard_accidents_geom_partition.rounded_mp = selected_segment_polygons.mp
                    ${filter.fromClause ? ` ${filter.fromClause}` : ''}
                    
                    -- including the SRI here makes the query MUCH slower
                    ${filter ? ` where ${filter.whereClause}` : ''}
                    
                    group by selected_segment_polygons.internal_id
                ), clipped_results as (
                    select 
                        filtered_crash_data.*,
                        segment_polygon.sri,
                        segment_polygon.mp,
                        ST_AsMVTGeom(
                            segment_polygon.geom,
                            ST_TileEnvelope(
                                ${params.z}, 
                                ${params.x}, 
                                ${params.y}
                            )
                        ) as geom
                    from filtered_crash_data
                    inner join segment_polygon
                    on filtered_crash_data.internal_id = segment_polygon.internal_id
                )
                SELECT ST_AsMVT(clipped_results.*, 'segment_polygon', 4096, 'geom', 'internal_id') AS mvt from clipped_results;
            `;

    //console.log(queryText);

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
        url: '/mvt/route/:z/:x/:y',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            function onConnect(err, client, release) {
                if (err) {
                    release();

                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server'
                    });
                } else if (request.query.selected_filters == undefined) {
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
                            } else {
                                if (result) {
                                    if (result.rows && result.rows.length > 0) {
                                        if (result.rows[0].mvt) {
                                            const mvt = result.rows[0].mvt;

                                            if (mvt.length === 0) {
                                                reply.code(204);
                                            }

                                            reply.header('Content-Type', 'application/x-protobuf').send(mvt);
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
                            }
                        });
                    } catch (error) {
                        release();

                        reply.send({
                            statusCode: 500,
                            error: error,
                            message: request
                        });
                    }
                }
            }

            fastify.pg.connect(onConnect);
        }
    });

    next();
};

module.exports.autoPrefix = '/v1';
