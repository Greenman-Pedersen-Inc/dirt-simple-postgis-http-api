// killed_by_year: gets killed count by year
const trendsHelper = require('../../helper_functions/trends_helper');

// *---------------*
// route schema
// *---------------*
const schema = {
    description: 'gets killed count by year.',
    tags: ['trends'],
    summary: 'gets killed count by year',
    querystring: {
        user: {
            type: 'string',
            description: 'The user name.'
            // example: ''
        },
        startYear: {
            type: 'string',
            description: 'The start year for crashes.'
            // example: '2015'
        },
        endYear: {
            type: 'string',
            description: 'The end year for crashes.'
            // example: '2020'
        },
        jurisdictionLevel: {
            type: 'string',
            description: 'state, mpo, county, municipality'
            // example: 'municipality'
        },
        jurisdictionValue: {
            type: 'string',
            description: 'nj for state, njtpa for mpo, 2 digit for county, 4 digit for muni'
            // example: '1330'
        },
        startTime: {
            type: 'string',
            description: '24 hr time; 0700 = 7 am'
            // example: '0700'
        },
        endTime: {
            type: 'string',
            description: '24 hr time; 1300 = 1pm'
            // example: '2100'
        },
        crashType: {
            type: 'string',
            description: 'crash type code based on the NJTR-1 form'
            // example: '01'
        },
        attribute: {
            type: 'string',
            description: 'occupant or pedestrian'
            // example: 'occupant'
        }
    }
};

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/trends/killed-by-year',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            request.tracker = new fastify.RequestTracker(
                request.headers.credentials,
                'trends',
                'killed_by_year',
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
                }

                request.tracker.start();

                const table = `trends.crash_${queryArgs.attribute}_physcl_cndtn_code_01`;
                var reportQueries = trendsHelper.getTrendsQueryObject(queryArgs, table);
                var returnData = {};

                var promises = [];
                for (var key in reportQueries) {
                    if (reportQueries.hasOwnProperty(key)) {
                        const promise = new Promise((resolve, reject) => {
                            try {
                                // console.log(reportQueries[key].query)
                                const res = client.query(reportQueries[key].query);
                                return resolve(res);
                            } catch (err) {
                                // console.log(err.stack);
                                // console.log(reportQueries[key].query);
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
