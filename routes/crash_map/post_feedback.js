// post_feedback: POSTs user feedback and data to the database

// *---------------*
// route query
// *---------------*
const getQuery = (queryArgs) => {
    // SQL column names
    const params = [
        'user_name',
        'label',
        'title',
        'open_location',
        'description',
        'crash_description',
        'filter_description',
        'crash_filter',
        'status'
    ];

    // value placeholders for each param
    var valuesParams = [];
    for (let index = 0; index < params.length; index++) {
        valuesParams.push('$' + (index + 1));
    }

    // values to be input
    const values = [
        queryArgs.username,
        queryArgs.label,
        decodeURI(queryArgs.title),
        queryArgs.open_location,
        decodeURI(queryArgs.description),
        decodeURI(queryArgs.crash_description),
        decodeURI(queryArgs.filter_description),
        queryArgs.crash_filter,
        'Not Started'
    ];

    if (queryArgs.hasImage) {
        const valuesParamLength = valuesParams.length;
        params.push('image_byte_array_string');
        valuesParams.push('$' + (valuesParamLength + 1));
        values.push(decodeURI(queryArgs['imageUri']));
    }

    var sql = `
    INSERT INTO admin.user_feedback 
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
    description: 'POSTs user feedback and data to the database',
    tags: ['crash-map'],
    summary: 'POSTs user feedback and data to the database',
    body: {
        type: 'object',
        properties: {
            imageUri: { type: 'string' },
            username: {
                type: 'string',
                description: 'User email to log into SV'
                // example: 'snopachinda@gpinet.com'
            },
            label: {
                type: 'string',
                description: 'Category tag: bug, wrong location, help wanted, question, enchancement, other'
                // example: 'bug'
            },
            title: {
                type: 'string',
                description: 'Title of the feedback form'
                // example: 'Incorrect location in NJTR-1 form data'
            },
            open_location: {
                type: 'string',
                description: 'Location where the user opened the feedback form'
                // example: 'Crash Map'
            },
            description: {
                type: 'string',
                description: 'Detailed description of the feedback or bug'
                // example: 'The county should be Atlantic, not burlington.'
            },
            crash_description: {
                type: 'string',
                description: 'list of crash IDs'
                // example: '13-19-2021-21-39253-AC, ...'
            },
            filter_description: {
                type: 'string',
                description: 'human readable string of applied filters'
                // example: 'Date: (2017,2018,2019,2020,2021)'
            },
            crash_filter: {
                type: 'string',
                description:
                    'stringified JSON of crash filter object. ex: {"mp_start": "0", "mp_end": "11.6", "year": "2017,2018,2019", "contr_circum_code_vehicles": "01"}'
                // example: '{"mp_start": "0", "mp_end": "11.6", "year": "2017,2018,2019", "contr_circum_code_vehicles": "01"}'
            },
            hasImage: {
                type: 'boolean',
                description: 'a screenshot is attached',
                default: false
            }
            // image_type: {
            //     type: 'string',
            //     description: 'header when getting the image base64 value',
            //     // example: 'data:image/png;base64'
            // }
        }
    }
};

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'POST',
        url: '/crash-map/post-feedback',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            request.tracker = new fastify.RequestTracker(
                request.headers.credentials,
                'crash_map',
                'post_feedback',
                JSON.stringify(request.query),
                reply
            );
            const queryArgs = request.body;
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
                } else if (queryArgs.username == undefined) {
                    request.tracker.error('need user name');
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'need user name'
                    });
                } else {
                    try {
                        const queryParams = getQuery(queryArgs);
                        client.query(queryParams.query, queryParams.values, function onResult(err, result) {
                            var result = {};

                            if (err) {
                                result = { success: false, error: err };
                                reply.send(result);
                                request.tracker.error(err);
                                release();
                            } else {
                                result = { success: true };
                                reply.send(result);
                                request.tracker.complete();
                                release();
                            }
                        });
                    } catch (error) {
                        request.tracker.error(error);
                        release();
                        reply.send({
                            statusCode: 500,
                            error: 'issue with query',
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
