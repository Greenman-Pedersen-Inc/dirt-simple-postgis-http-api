const { makeCrashFilterQuery } = require('../../helper_functions/signals_filter_helper');

// route query
// require the funciton
const sql = (params, query) => {
    const accidentsTableName = 'signals.signals_data';
    const parsed_filter = JSON.parse(query.selected_filters);
    const filter = makeCrashFilterQuery(parsed_filter, accidentsTableName);
    const whereClause = filter.whereClause;
    const fromClause = filter.fromClause;

    let whereClauses = [];
    if (parsed_filter.hasOwnProperty("mun_mu")) {

    }

    const queryText = `
        with selected_signals as (
            select
                *,
                internal_id "signal_id",
                ST_AsMVTGeom(
                    geom_mercator,
                    ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
                ) as geom
            from signals.signals_data
            where st_intersects(
                geom_mercator,
                ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
            )
            ${whereClause ? ` AND ${whereClause}` : ''}
        )
        SELECT ST_AsMVT(selected_signals.*, 'signals_data', 4096, 'geom', 'internal_id') AS mvt from selected_signals;
    `;
    return queryText;
};

// route schema
const schema = {
    description: 'Return table as Mapbox Vector Tile (MVT) for signals',
    tags: ['signals'],
    summary: 'return signals MVT',
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
            description:
                'stringified JSON of crash filter object. ex: {"mp_start": "0", "mp_end": "11.6", "year": "2017,2018,2019", "contr_circum_code_vehicles": "01"}'
        }
    }
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/signals/mvt-signals/:z/:x/:y',
        schema: schema,

        // preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            request.tracker = new fastify.RequestTracker(
                request.headers,
                'crash_map',
                'mvt_county',
                JSON.stringify(Object.assign(request.query, request.params))
            );

            function onConnect(error, client, release) {
                if (error) {
                    release();
                    reply.code(500).send(error);
                    request.tracker.error(error);
                } else {
                    // if (request.query.selected_filters == undefined) {
                    //     // release();
                    //     // reply.code(400).send('no crash filter submitted');
                    //     // request.tracker.error('no crash filter submitted');
                    // } 
                    
                    // else {
                        try {
                            client.query(sql(request.params, request.query), function onResult(error, result) {
                                release();

                                if (error) {
                                    reply.code(500).send(error);
                                    request.tracker.error(error);
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
                    // }
                }
            }
            fastify.pg.connect(onConnect);
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
