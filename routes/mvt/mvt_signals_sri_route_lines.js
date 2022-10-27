// route query
const { makeCrashFilterQuery } = require('../../helper_functions/crash_filter_helper');

const sql = (params, query) => {
    const tableName = 'signals.signals_sri_lines';
    const geomName = 'geom';
    //let parsed_filter = JSON.parse(query.selected_filters);
    const queryText = `
                WITH selected_segment_polygons AS (
                    select 
                        internal_id, 
                        sri, 
                        route_name,
                        sri_signals_num,
                        centroid,
                        ST_AsMVTGeom(
                            ST_TRANSFORM(${tableName}.${geomName}, 3857),
                            ST_TileEnvelope(
                                ${params.z}, 
                                ${params.x}, 
                                ${params.y}
                            )
                        ) AS geom
                    FROM ${tableName}
                    WHERE st_intersects(
                        ST_TRANSFORM(${tableName}.${geomName}, 3857),
                        ST_TileEnvelope(
                            ${params.z}, 
                            ${params.x}, 
                            ${params.y}
                        )
                    )
                )

                SELECT ST_AsMVT(selected_segment_polygons.*, 'sri_route_lines', 4096, 'geom', 'internal_id') AS mvt from selected_segment_polygons;
            `;

    return queryText;
};

// route schema
const schema = {
    description: 'Returns the entire SRI route line',
    tags: ['mvt'],
    summary: 'Returns the entire SRI route line',

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
        url: '/mvt/signals-sri-route-lines/:z/:x/:y',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            request.tracker = new fastify.RequestTracker(
                request.headers,
                'crash_map',
                'mvt_route',
                JSON.stringify(Object.assign(request.query, request.params)),
                reply
            );

            function onConnect(error, client, release) {
                request.tracker.start();
                if (error) {
                    reply.code(500).send(error);
                    request.tracker.error(error);
                    release();
                } else if (request.query.selected_filters == undefined) {
                    reply.code(400).send('no crash filter submitted');
                    request.tracker.error('no crash filter submitted');
                    release();
                } else {
                    try {
                        client.query(sql(request.params, request.query), function onResult(err, result) {
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

            fastify.pg.connect(onConnect);
        }
    });

    next();
};

module.exports.autoPrefix = '/v1';
