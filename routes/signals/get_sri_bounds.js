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
            fastify.pg.connect(onConnect);

            function onConnect(err, client, release) {
                if (err) {
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server'
                    });
                } else if (request.query.sri == undefined) {
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'SRI code not submitted'
                    });
                } else {
                    try {
                        const query = sql();
                        client.query(query, [request.query.sri], function onResult(err, result) {
                            release();

                            if (err) {
                                reply.send(err);
                            } else if (result.rows && result.rows.length > 0) {
                                reply.send(result.rows);
                            } else {
                                reply.code(204);
                            }
                        });
                    } catch (error) {
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
