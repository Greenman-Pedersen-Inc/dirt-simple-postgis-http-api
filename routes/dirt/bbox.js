// route query
/**
 * generates the sql statment to make calculate the bounding box
 *
 * @param {*} params
 * @param {*} query
 * @return {*} parsed query for submission to server
 */
const sql = (params, query) => {
    return `
  SELECT 
    ST_Extent(ST_Transform(${query.geom_column}, ${query.srid})) as bbox

  FROM 
    ${params.table}

  -- Optional where filter
  ${query.filter ? `WHERE ${query.filter}` : ''}
  `;
};

// route schema
const schema = {
    description: 'Gets the bounding box of a feature(s).',
    tags: ['api'],
    summary: 'minimum bounding rectangle',
    params: {
        table: {
            type: 'string',
            description: 'The name of the table or view to query.'
        }
    },
    querystring: {
        geom_column: {
            type: 'string',
            description: 'The geometry column of the table.',
            default: 'geom'
        },
        srid: {
            type: 'integer',
            description: 'The SRID for the returned centroid. The default is <em>4326</em> WGS84 Lat/Lng.',
            default: 4326
        },
        filter: {
            type: 'string',
            description: 'Optional filter parameters for a SQL WHERE statement.'
        }
    }
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/bbox/:table',
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

                client.query(sql(request.params, request.query), function onResult(err, result) {
                    release();
                    reply.send(err || result.rows);
                });
            }
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
