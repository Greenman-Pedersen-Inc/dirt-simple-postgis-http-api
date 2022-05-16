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
        queryArgs.userName,
        queryArgs.label,
        decodeURI(queryArgs.title),
        queryArgs.openLocation,
        queryArgs.boundingBoxMaxY,
        decodeURI(queryArgs.description),
        decodeURI(queryArgs.crashDescription),
        queryArgs.crashFilter,
        'Not Started'
    ];

    if (queryArgs.hasImage) { 
        params.push('image_byte_array');
        valuesParams.push('$' + (valuesParams.length));
        values.push(queryArgs['imageUri']);
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
    params: {
        username: {
            type: 'string',
            description: 'User email to log into SV',
            example: 'snopachinda@gpinet.com'
        },
        label: {
            type: 'string',
            description: 'Category tag: bug, wrong location, help wanted, question, enchancement, other',
            example: 'bug'
        },
        title: {
            type: 'string',
            description: 'Title of the feedback form',
            example: 'Incorrect location in NJTR-1 form data'
        },
        open_location: {
            type: 'string',
            description: 'Location where the user opened the feedback form',
            example: 'Crash Map'
        },
        description: {
            type: 'string',
            description: 'Detailed description of the feedback or bug',
            example: 'The county should be Atlantic, not burlington.'
        },
        crash_description: {
            type: 'string',
            description: 'list of crash IDs',
            example: '13-19-2021-21-39253-AC, ...'
        },
        filter_description: {
            type: 'string',
            description: 'human readable string of applied filters',
            example: 'Date: (2017,2018,2019,2020,2021)'
        },
        crash_filter: {
            type: 'string',
            description:
                'stringified JSON of crash filter object. ex: {"mp_start": "0", "mp_end": "11.6", "year": "2017,2018,2019", "contr_circum_code_vehicles": "01"}',
            example: '{"mp_start": "0", "mp_end": "11.6", "year": "2017,2018,2019", "contr_circum_code_vehicles": "01"}'
        },
        imageUri: {
            type: 'string',
            description: 'screenshot URI',
            default: ''
        },
        hasImage: {
            type: 'boolean',
            description: 'a screenshot is attached',
            default: false
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
            const queryArgs = request.query;

            function onConnect(err, client, release) {
                if (err) {
                    release();
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server'
                    });
                } else if (queryArgs.username == undefined) {
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
