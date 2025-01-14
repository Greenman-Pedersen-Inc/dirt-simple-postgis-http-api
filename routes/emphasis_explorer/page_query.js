// route query
const customTimeout = 30000;

const sql = (params, query) => {
    let queryText = `
    select 
      count(*),
      (
        select array_to_json(array_agg(bbq))
        from (
          select ${query.columns}
          from ${params.table}
          ${query.filter ? `WHERE ${query.filter}` : ''}
          ${query.group ? `GROUP BY ${query.group}` : ''}
          ${query.sort ? `ORDER BY ${query.sort}` : ''}
          ${query.limit ? `LIMIT ${query.limit}` : ''}
          ${query.offset ? `OFFSET ${query.offset}` : ''}
        ) bbq
      ) results
    from ${params.table}
    ${query.filter ? `WHERE ${query.filter}` : ''}
  `;
    // console.log(queryText);
    return queryText;
};

// route schema
const schema = {
    description: 'Query a table or view.',
    tags: ['emphasis-explorer'],
    summary: 'table query',
    params: {
        table: {
            type: 'string',
            description: 'The name of the table or view.'
        }
    },
    querystring: {
        columns: {
            type: 'string',
            description: 'Columns to return.',
            default: '*'
        },
        filter: {
            type: 'string',
            description: 'Optional filter parameters for a SQL WHERE statement.'
        },
        sort: {
            type: 'string',
            description: 'Optional sort by column(s).'
        },
        limit: {
            type: 'integer',
            description: 'Optional limit to the number of output features.',
            default: 100
        },
        group: {
            type: 'string',
            description: 'Optional column(s) to group by.'
        },
        offset: {
            type: 'string',
            description: 'offset the beginning of the query by a set number of rows.'
        }
    }
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/emphasis-explorer/page-query/:table',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            request.tracker = new fastify.RequestTracker(
                request.headers.credentials,
                'emphasis_explorer',
                'page_query',
                JSON.stringify(request.query),
                reply
            );

            fastify.pg.connect(onConnect);

            function onConnect(err, client, release) {
                client.connectionParameters.query_timeout = customTimeout;
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
                else {
                    try {
                        client.query(sql(request.params, request.query), function onResult(err, result) {
                            if (err) {
                                reply.code(500).send(err);
                                request.tracker.error(err);
                                release();
                            }
                            else {
                                request.tracker.complete();
                                reply.send(result.rows[0]);                                
                                release();
                            }
                        });
                    }
                    catch (error) {
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
