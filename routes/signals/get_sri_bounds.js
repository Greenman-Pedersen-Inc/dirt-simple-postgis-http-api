const sql = () => {
    let formattedQuery = `
    WITH sri_extent AS (
        SELECT ST_Extent(geom_latlong) extent
        FROM signals.signals_data 
        WHERE sri = $1
    )
    
    SELECT ST_XMin(extent) as min_x,
    ST_YMax(extent) as max_y,
    ST_XMax(extent) as max_x,
    ST_YMin(extent) as min_y
    FROM sri_extent;
    `;

    return formattedQuery;
};

// route schema
const schema = {
    description: 'Returns bounding box coordinates for signals based on an SRI',
    tags: ['signals'],
    summary: 'Returns bounding box coordinates for signals based on an SRI',
    params: {},
    querystring: {
        sri: {
            type: 'string',
            description: 'sri code'
        }
    }
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/signals/sri-bounds',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            request.tracker = new fastify.RequestTracker(
                request.headers.credentials,
                'signals',
                'get_sri_bounds',
                JSON.stringify(request.query),
                reply
            );

            fastify.pg.connect(onConnect);

            function onConnect(err, client, release) {
                if (err) {
                    request.tracker.error(err);
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server'
                    });
                } else if (request.query.sri == undefined) {
                    request.tracker.error('SRI code not submitted');
                    release();
                    reply.send({
                        statusCode: 400,
                        error: 'Internal Server Error',
                        message: 'SRI code not submitted'
                    });
                } else {
                    try {
                        request.tracker.start();

                        const query = sql();
                        client.query(query, [request.query.sri], function onResult(err, result) {
                            if (err) {
                                request.tracker.error(err);
                                release();
                                reply.send({
                                    statusCode: 500,
                                    error: err
                                });
                            }
                            else if (result.rows && result.rows.length > 0) {
                                request.tracker.complete();
                                release();
                                reply.send(result.rows);
                            } 
                            else {
                                release();
                                reply.code(204);
                            }
                        });
                    } catch (error) {
                        request.tracker.error(error);
                        release();
                        reply.send({
                            statusCode: 500,
                            error: 'Internal Server Error',
                            message: 'unable to connect to database server'
                        });
                    }
                }
            }
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
