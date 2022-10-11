// graph_data: gets graph data for each EA category
const eaHelper = require('../../helper_functions/legacy_ea_helper');

// *---------------*
// route schema
// *---------------*
const schema = {
    description: 'gets graph data for each EA category',
    tags: ['legacy-ea'],
    summary: 'gets graph data for each EA category',
    querystring: {
        user: {
            type: 'string',
            description: 'The user name.',
            default: ''
        },
        startYear: {
            type: 'string',
            description: 'The start year for crashes.',
            default: '2015'
        },
        endYear: {
            type: 'string',
            description: 'The end year for crashes.',
            default: '2020'
        },
        jurisdictionLevel: {
            type: 'string',
            description: 'state, mpo, county, municipality',
            default: 'state'
            //default: 'municipality'
        },
        jurisdictionValue: {
            type: 'string',
            description: 'nj for state, njtpa for mpo, 2 digit for county, 4 digit for muni',
            default: 'nj'

            //default: '1330'
        }
    }
};

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/legacy-ea/graph-data',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            request.tracker = new fastify.RequestTracker(
                request.headers.credentials,
                'legacy_ea',
                'graph_data',
                JSON.stringify(request.query),
                reply
            );
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
                }
                else if (request.query.startYear == undefined) {
                    reply.code(400).send('need start year');
                    request.tracker.error('need start year');
                    release();
                } 
                else if (request.query.endYear == undefined) {
                    reply.code(400).send('need end year');
                    request.tracker.error('need end year');
                    release();
                } 
                else {
                    var queryArgs = request.query;
                    var reportQueries = eaHelper.getQueryObject(queryArgs);
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

                    // add the HMVMT query
                    const promise = new Promise((resolve, reject) => {
                        try {
                            const res = client.query(eaHelper.getHmvmtsQuery());
                            return resolve(res);
                        } catch (err) {
                            //console.log(err.stack);
                            return reject(error);
                        }
                    });
                    promises.push(promise);

                    Promise.all(promises)
                        .then((reportDataArray) => {
                            const hmvmtsValues = reportDataArray[reportDataArray.length - 1].rows;
                            //console.log(hmvmtsValues);
                            for (let i = 0; i < reportDataArray.length - 1; i++) {
                                var data = reportDataArray[i].rows;
                                data = eaHelper.cleanData(data, queryArgs.startYear, queryArgs.endYear); // fill in years that have no data

                                var category = Object.keys(reportQueries)[i];
                                returnData[category] = [];

                                data.forEach((row, rowIndex) => {
                                    if (row['year'] >= queryArgs.startYear && row['year'] <= queryArgs.endYear) {
                                        var rowObj = {};
                                        rowObj['Year'] = parseInt(row.year);
                                        rowObj['Raw'] = {
                                            Incapacitated: parseInt(row['total_incapacitated']),
                                            Killed: parseInt(row['total_killed'])
                                        };
                                        rowObj['Average'] = eaHelper.calculateAverageData(data, rowIndex);
                                        const hmvmtValue = hmvmtsValues.find((e) => e.year === row['year']);
                                        rowObj['HMVMT'] = eaHelper.calculateHmvmtData(
                                            rowObj['Average'],
                                            hmvmtValue['hmvmts']
                                        );
                                        returnData[category].push(rowObj);
                                    }
                                });
                            }
                            request.tracker.complete();
                            reply.send({ GraphData: returnData });
                            release();
                        })
                        .catch((error) => {
                            request.tracker.error(error);
                            reply.send({
                                statusCode: 500,
                                error: error,
                                message: request
                            });
                            release();
                        });                    
                }
            }
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
