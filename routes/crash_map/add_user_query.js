// add_user_query: Adds a custom made query by the user to the voyagerAdmin.user_queries table

// *---------------*
// route query
// *---------------*
const sql = (queryArgs) => {
    var sql = `
    INSERT INTO voyagerAdmin.user_queries (user_name, x_min, x_max, y_min, y_max, filters, filters_description, filters_title, results_text, min_mp, max_mp, zoom_level, rotation) 
    VALUES ('${queryArgs.userName}', '${queryArgs.minX}', '${queryArgs.maxX}', '${queryArgs.minY}', '${queryArgs.maxX}', '${queryArgs.maxY}', '${queryArgs.crashFilter}', 
    '${queryArgs.filtersDescription}', '${queryArgs.filtersTitle}', '${queryArgs.resultsText}',' ${queryArgs.minMp}', '${queryArgs.maxMp}', 
    '${queryArgs.zoomLevel}', '${queryArgs.rotation}')
    `;
    return sql;
  }

// *---------------*
// route schema
// *---------------*
const schema = {
    description: "Adds a custom made query by the user to the public.user_queries table.",
    tags: ['crash-map'],
    summary: "Adds a custom made query by the user to the public.user_queries table.",
    querystring: {
        userName: {
            type: 'string',
            description: 'User email to log into SV',
        },
        filtersTitle: {
            type: 'string',
            description: 'User inputted title for query.',
        },
        filtersDescription: {
            type: 'string',
            description: 'SV generated filter description.',
        },
        crashFilter: {
            type: 'string',
            description: 'JSON string of selected filters.',
        },
        rotation: {
            type: 'string',
            description: 'Map rotation when user saves query.',
        },
        zoomLevel: {
            type: 'string',
            description: 'current zoom level of the map.',
        },
        resultsText: {
            type: 'string',
            description: 'the queried SRI name.',
        },
        minMp: {
            type: 'string',
            description: 'min milepost of query.',
        },
        maxMp: {
            type: 'string',
            description: 'max milepost of query.',
        },
        minX: {
            type: 'string',
            description: 'min x of map.',
        },
        minY: {
            type: 'string',
            description: 'min y of map.',
        },
        maxX: {
            type: 'string',
            description: 'max x of map.',
        },
        maxY: {
            type: 'string',
            description: 'max y of map.',
        }
    }
}

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'PUT',
        url: '/crash-map/add-user-query',
        schema: schema,
        handler: function (request, reply) {
            fastify.pg.connect(onConnect)

            function onConnect(err, client, release) {
                if (err) return reply.send({
                    "statusCode": 500,
                    "error": "Internal Server Error",
                    "message": "unable to connect to database server"
                });

                var queryArgs = request.query;
                if (queryArgs.userName == undefined) {
                    return reply.send({
                        "statusCode": 500,
                        "error": "Internal Server Error",
                        "message": "need user name"
                    });
                }

                client.query(
                    sql(queryArgs),
                    function onResult(err, result) {
                        release()
                        reply.send(err || result.rows)
                    }
                )
            }
        }
    })
    next()
}

module.exports.autoPrefix = '/v1'