// get-mp-range: gets the max and min MP range for an SRI

// *---------------*
// route query
// *---------------*
const sql = () => {
    var sql = `
    WITH sri_extent AS (
        SELECT MIN(mp) start_mp, MAX(mp) end_mp, ST_Extent(geom_latlong) extent
        FROM public.segment_polygon
        WHERE sri = $1
    )

    SELECT ST_XMin(extent) as min_x,
    ST_YMax(extent) as max_y,
    ST_XMax(extent) as max_x,
    ST_YMin(extent) as min_y,
    start_mp, end_mp
    FROM sri_extent;

    `;
    return sql;
};

// *---------------*
// route schema
// *---------------*
const schema = {
    description: "gets the max and min MP range for an SRI",
    tags: ['general'],
    summary: "gets the max and min MP range for an SRI",
    querystring: {
        sri: {
            type: 'string',
            description: 'an SRI code',
            example: '12000684__'
        }
    }
};

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/general/get-mp-range',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            fastify.pg.connect(onConnect);

            function onConnect(err, client, release) {
                if (err)
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server'
                    });

                var queryArgs = request.query;
                if (queryArgs.sri == undefined) {
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'need DLN'
                    });
                }

                client.query(sql(), [queryArgs.sri], function onResult(err, result) {
                    release();
                    if (err) {
                        reply.send(err);
                    } else if (result && result.rows) {
                        reply.send(result.rows);
                    } else {
                        reply.code(204);
                    }
                });
            }
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
