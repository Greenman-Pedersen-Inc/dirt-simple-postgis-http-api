// crashes_by_attribute: gets crash count by attribute (cellphone use, intersection)
const trendsHelper = require('../../helper_functions/trends_helper');

// *---------------*
// route schema
// *---------------*
const schema = {
    description: 'gets crash count by attribute (cellphone use, intersection).',
    tags: ['trends'],
    summary: 'gets crash count by attribute (cellphone use, intersection)',
    querystring: {
        user: {
            type: 'string',
            description: 'The user name.',
        },
        startYear: {
            type: 'string',
            description: 'The start year for crashes.',
            example: '2015'
        },
        endYear: {
            type: 'string',
            description: 'The end year for crashes.',
            example: '2020'
        },
        jurisdictionLevel: {
            type: 'string',
            description: 'state, mpo, county, municipality',
            example: 'municipality'
        },
        jurisdictionValue: {
            type: 'string',
            description: 'nj for state, njtpa for mpo, 2 digit for county, 4 digit for muni',
            example: '1330'
        },
        startTime: {
            type: 'string',
            description: '24 hr time; 0700 = 7 am',
            default: '0000'
        },
        endTime: {
            type: 'string',
            description: '24 hr time; 1300 = 1pm',
            default: '2400'
        },
        crashType: {
            type: 'string',
            description: 'crash type code based on the NJTR-1 form',
            example: '01'
        },
        attribute: {
            type: 'string',
            description: 'cellphones, intersections',
            example: 'cellphones'
        }
    }
};

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/trends/crashes-by-attribute',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            request.tracker = new fastify.RequestTracker(
                request.headers.credentials,
                'trends',
                'crashes_by_attribute',
                JSON.stringify(request.query),
                reply
            );

            fastify.pg.connect(onConnect);

            function onConnect(err, client, release) {
                if (err) {
                    release();
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server'
                    });
                }
                var queryArgs = request.query;
                if (queryArgs.startYear == undefined) {
                    release();
                    return reply.send({
                        statusCode: 400,
                        error: 'Internal Server Error',
                        message: 'need start year'
                    });
                } else if (queryArgs.endYear == undefined) {
                    release();
                    return reply.send({
                        statusCode: 400,
                        error: 'Internal Server Error',
                        message: 'need end year'
                    });
                } else if (queryArgs.attribute == undefined) {
                    release();
                    return reply.send({
                        statusCode: 400,
                        error: 'Internal Server Error',
                        message: 'need attribute'
                    });
                }

                request.tracker.start();

                const table = trendsHelper.getTableNameByAttribute(queryArgs.attribute);
                var reportQueries = trendsHelper.getTrendsQueryObject(queryArgs, table);
                var returnData = {};

                var promises = [];
                for (var key in reportQueries) {
                    if (reportQueries.hasOwnProperty(key)) {
                        const promise = new Promise((resolve, reject) => {
                            try {
                                //console.log(reportQueries[key].query)
                                const res = client.query(reportQueries[key].query);
                                return resolve(res);
                            } catch (err) {
                                //console.log(err.stack);
                                //console.log(reportQueries[key].query);
                                return reject(error);
                            }
                        });
                        promises.push(promise);
                    }
                }

                Promise.all(promises)
                    .then((reportDataArray) => {
                        for (let i = 0; i < reportDataArray.length; i++) {
                            var data = reportDataArray[i].rows;
                            var category = Object.keys(reportQueries)[i];
                            returnData[category] = data;
                        }

                        request.tracker.complete();
                        release();
                        reply.send({ GraphData: returnData });
                    })
                    .catch((error) => {
                        request.tracker.error(error);
                        release();
                        reply.send({
                            statusCode: 500,
                            error: error
                        });
                    });
            }
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
