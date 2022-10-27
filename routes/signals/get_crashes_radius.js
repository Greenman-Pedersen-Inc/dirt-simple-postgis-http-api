// get_crashes_radius: gets crashes within a user-specified radius (in feet) of a signal based on signal id
const { transcribeKeysArray } = require('../../helper_functions/code_translations/translator_helper');
const { viewableAttributes } = require('../../helper_functions/code_translations/accidents');
const { makeCrashFilterQuery } = require('../../helper_functions/crash_filter_helper');

// *---------------*
// route query
// *---------------*
const sql = (params, query) => {
    const accidentsTableName = 'ard_accidents_geom_partition';
    const parsed_filter = JSON.parse(query.selected_filters);
    const filter = makeCrashFilterQuery(parsed_filter, accidentsTableName);
    const whereClause = filter.whereClause;
    const fromClause = filter.fromClause;
    const feetToMeters = parseInt(query.radius) / 3.28084;

    var sql = `
    WITH signal_geom AS (
        SELECT geom_latlong from signals.signals_data
        WHERE internal_id = ${query.signalId}
    )
    SELECT ${viewableAttributes.join(', ')} FROM public.${accidentsTableName}, signal_geom 
    ${fromClause ? `${fromClause}` : ''}
    WHERE ST_DWithin(signal_geom.geom_latlong::geography, public.${accidentsTableName}.geom::geometry, ${feetToMeters})
    ${whereClause ? ` AND ${whereClause}` : ''}
    ;`;
    return sql;
};

// *---------------*
// route schema
// *---------------*
const schema = {
    description: "gets crashes within a user-specified radius (in feet) of a signal based on signal id",
    tags: ['signals'],
    summary: "gets crashes within a user-specified radius (in feet) of a signal based on signal id",
    params: {},
    querystring: {
        signalId: {
            type: 'string',
            description: 'signal idr',
            example: '3213'
        },
        radius: {
            type: 'string',
            description: 'radius applies around the signal; in feet',
            example: '250, 500'
        },
        selected_filters: {
            type: 'string',
            description: 'stringified JSON of crash filter object',
            example: '{"mp_start": "0", "mp_end": "11.6", "year": "2017,2018,2019", "contr_circum_code_vehicles": "01"}'
        }
    }
};

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/signals/get-crashes',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            request.tracker = new fastify.RequestTracker(
                request.headers.credentials,
                'signals',
                'get_crashes_radius',
                JSON.stringify(request.query),
                reply
            );

            fastify.pg.connect(onConnect);

            function onConnect(err, client, release) {
                request.tracker.start();

                if (err) {
                    request.tracker.error(err);
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server'
                    });
                }
                else if (request.query.signalId == undefined) {
                    reply.code(400).send('need signal ID');
                    request.tracker.error('need signal ID');
                    release();
                } 
                else if (request.query.radius == undefined) {
                    reply.code(400).send('need radius');
                    request.tracker.error('need radius');
                    release();
                } 
                else {
                    try {
                        client.query(sql(request.params, request.query), function onResult(err, result) {
                            if (err) {
                                reply.code(500).send(err);
                                request.tracker.error(err);
                                release();
                            } else if (result && result.rows) {
                                request.tracker.complete();
                                const crashData = transcribeKeysArray(result.rows);
                                reply.send(crashData);
                                release();
                            } else {
                                reply.code(204);
                                release();
                            }
                        });
                    } 
                    catch (error) {
                        request.tracker.error(error);
                        release();
                        reply.send({
                            statusCode: 500,
                            error: error,
                            message: request
                        });
                    }
                }
            }
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
