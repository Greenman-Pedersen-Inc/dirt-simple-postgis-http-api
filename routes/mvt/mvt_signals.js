const { makeCrashFilterQuery } = require('../../helper_functions/signals_filter_helper');

// route query
// require the funciton
const sql = (params, query) => {
    const accidentsTableName = 'signals.signals_data';
    const parsed_filter = JSON.parse(query.selected_filters);
    const filter = makeCrashFilterQuery(parsed_filter, accidentsTableName);
    const whereClause = filter.whereClause;
    const fromClause = filter.fromClause;

    const queryText = `
        with selected_signals as (
            select
            cs,
            sri,
            mp,
            mun_cty_co,
            mun_mu,
            sig,
            type,
            intersection,
            jurisdiction_type_code,
            tr_reg,
            el_reg,
            signal_offset,
            notes,
            row_1,
            row_2,
            row_3,
            row_4,
            via,
            internal_id,
            agreement,
            directive,
            lat,
            long,
            acc,
            draw,
            tm,
            cd,
            mn,
            prefix,
            search,
            ad_12_1,
            ad_12_2,
            ad_12_3,
            ad_12_4,
            ad_12_5,
            ad_12_6,
            ad_12_7,
            ad_12_8,
            ad_12_9,
            ad_12_10,
            plan_date,
            plan_1,
            plan_2,
            plan_3,
            plan_4,
            plan_5,
            plan_6,
            plan_7,
            plan_8,
            plan_9,
            plan_10,
            parent_signal,
            parent_id,
            signal_timer,
            child_record,
                internal_id "internal_id",
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
    tags: ['mvt'],
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
        url: '/mvt/signals/:z/:x/:y',
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
            
            fastify.pg.connect(onConnect);

            function onConnect(error, client, release) {
                request.tracker.start();

                if (error) {
                    reply.code(500).send(error);
                    request.tracker.error(error);
                    release();
                } else {
                        try {
                            client.query(sql(request.params, request.query), function onResult(error, result) {
                                if (error) {
                                    reply.code(500).send(error);
                                    request.tracker.error(error);
                                    release();
                                } 
                                else {
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
    });
    next();
};

module.exports.autoPrefix = '/v1';
