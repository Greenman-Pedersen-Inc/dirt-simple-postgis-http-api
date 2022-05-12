// add_user_query: Adds a custom made query by the user to the voyagerAdmin.user_queries table

// *---------------*
// route query
// *---------------*
const getQuery = (queryArgs) => {
    const params = [
        'user_name',
        'x_min',
        'x_max',
        'y_min',
        'y_max',
        'filters',
        'filters_description',
        'filters_title',
        'results_text',
        'min_mp',
        'max_mp',
        'zoom_level',
        'rotation',
        'pitch',
        'quick_filter_menu'
    ];
    var valuesParams = [];
    for (let index = 0; index < params.length; index++) {
        valuesParams.push('$' + (index + 1));
    }
    const values = [
        queryArgs.userName,
        queryArgs.boundingBoxMinX,
        queryArgs.boundingBoxMaxX,
        queryArgs.boundingBoxMinY,
        queryArgs.boundingBoxMaxY,
        queryArgs.filters,
        queryArgs.filtersDescription,
        decodeURI(queryArgs.filtersTitle),
        queryArgs.resultsText,
        queryArgs.minMp,
        queryArgs.maxMp,
        queryArgs.zoomLevel,
        queryArgs.rotation,
        queryArgs.pitch,
        queryArgs.isQuickFilter
    ];

    var sql = `
    INSERT INTO usermanagement.user_queries_new 
    (${params.join(',')}) 
    VALUES (
        ${valuesParams.join(',')}
    )
    `;

    //console.log(sql)
    return {
        query: sql,
        values: values
    };
};

// *---------------*
// route schema
// *---------------*
const schema = {
    description: 'Adds a custom made query by the user to the public.user_queries table.',
    tags: ['crash-map'],
    summary: 'Adds a custom made query by the user to the public.user_queries table.',
    querystring: {
        userName: {
            type: 'string',
            description: 'User email to log into SV'
        },
        filtersTitle: {
            type: 'string',
            description: 'User inputted title for query.'
        },
        filtersDescription: {
            type: 'string',
            description: 'SV generated filter description.'
        },
        filters: {
            type: 'string',
            description: 'JSON string of selected filters.'
        },
        rotation: {
            type: 'string',
            description: 'Map rotation when user saves query.'
        },
        pitch: {
            type: 'string',
            description: 'Map pitch when user saves query.'
        },
        zoomLevel: {
            type: 'string',
            description: 'current zoom level of the map.'
        },
        resultsText: {
            type: 'string',
            description: 'the queried SRI name.'
        },
        minMp: {
            type: 'string',
            description: 'min milepost of query.'
        },
        maxMp: {
            type: 'string',
            description: 'max milepost of query.'
        },
        boundingBoxMinX: {
            type: 'string',
            description: 'top left corner x position'
        },
        boundingBoxMinY: {
            type: 'string',
            description: 'bottom right y value'
        },
        boundingBoxMaxX: {
            type: 'string',
            description: 'bottom right x value'
        },
        boundingBoxMaxY: {
            type: 'string',
            description: 'top left y value'
        },
        isQuickFilter: {
            type: 'boolean',
            description: 'is the query from the quick filter?'
        }
    }
};

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'POST',
        url: '/crash-map/add-user-query',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            const queryArgs = request.query;

            function onConnect(err, client, release) {
                if (err) {
                    release();
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server'
                    });
                } else if (queryArgs.userName == undefined) {
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'need user name'
                    });
                } else {
                    try {
                        const queryParams = getQuery(queryArgs);
                        client.query(queryParams.query, queryParams.values, function onResult(err, result) {
                            release();
                            var result = {};
                            if (err) result = { success: false, error: err };
                            else result = { success: true };
                            reply.send(err || result);

                            // client.query(sql(queryArgs), function onResult(err, result) {
                            //     release();

                            //     reply.send(err || result.rows);
                        });
                    } catch (error) {
                        release();

                        reply.send({
                            statusCode: 500,
                            error: 'issue with query',
                            message: request
                        });
                    }
                }
            }

            fastify.pg.connect(onConnect);
        },
        onRequest: async (req, res) => {
            req.controller = new AbortController();
            res.raw.setTimeout(typeof customTimeout == 'undefined' ? fastify.globalTimeout : customTimeout, () => {
                req.controller.abort();
                res.send(new Error('Server Timeout'));
                res.send = (payload) => res;
            });
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
