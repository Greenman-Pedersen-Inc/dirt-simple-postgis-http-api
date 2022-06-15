// get_crashes_radius: gets crashes within a user-specified radius (in feet) of a signal based on signal id

// *---------------*
// route query
// *---------------*
const sql = (params, query) => {
    const feetToMeters = parseInt(query.radius) / 3.28084;
    var sql = `
    WITH signal_geom AS (
        SELECT geom_latlong from signals.signals_data
        WHERE internal_id = ${query.signalId}
    )
    SELECT * FROM public.ard_accidents_geom_partition accidents, signal_geom 
    WHERE ST_DWithin(signal_geom.geom_latlong::geography, accidents.geom::geometry, ${feetToMeters});
    `;
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
        filter: {
            type: 'string',
            description: 'a filter',
            example: ''
        }
    }
};

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/signals/get-crashes/',
        schema: schema,
        // preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {

            function onConnect(err, client, release) {
                if (err) {
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server'
                    });
                } 
                else if (request.query.signalId == undefined) {
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'need signal id'
                    });
                } 
                else if (request.query.radius == undefined) {
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'need radius (ft)'
                    });
                } 
                else {
                    try {
                        client.query(sql(request.params, request.query), function onResult(err, result) {
                            release();

                            if (err) {
                                reply.send(err);
                            } else if (result && result.rows) {
                                reply.send(result.rows);
                            } else {
                                reply.code(204);
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
