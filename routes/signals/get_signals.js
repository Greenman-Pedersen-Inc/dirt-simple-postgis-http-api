// get_signals: gets signals within a Z X Y tile

// *---------------*
// route query
// *---------------*
const sql = (params, query) => {
    var sql = `
    SELECT * FROM signals.signals_data WHERE 
    ST_Intersects(
        signals.signals_data.geom_mercator, ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
    )
    `;
    return sql;
};

// *---------------*
// route schema
// *---------------*
const schema = {
    description: "gets signals within a Z X Y tile",
    tags: ['signals'],
    summary: "gets signals within a Z X Y tile",
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
        url: '/signals/get-signals/:z/:x/:y',
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
                // else if (request.query.userName == undefined) {
                //     release();
                //     reply.send({
                //         statusCode: 500,
                //         error: 'Internal Server Error',
                //         message: 'need user name'
                //     });
                // } 
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
