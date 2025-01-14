// get_statistics: gets stats based on category and subcategory
const {
    makeWhereClause,
    getTableQuery,
    calculateRollingAverage
} = require('../../helper_functions/emphasis_explorer_helper');
const customTimeout = 60000;

// *---------------*
// route query
// *---------------*
const getQueries = (queryArgs) => {
    let filterJson = JSON.parse(JSON.stringify(queryArgs));

    const clauses = makeWhereClause(filterJson);
    const clausesRollingAvg = makeWhereClause(filterJson, true);
    const queries = getTableQuery(
        filterJson.category,
        filterJson.hasOwnProperty('subCategory') ? filterJson['subCategory'] : null,
        filterJson.hasOwnProperty('chartType') ? filterJson['chartType'] : null,
        clauses.whereClauses.join(' AND '),
        clausesRollingAvg.whereClauses.join(' AND ')
    );

    return {
        values: clauses.values,
        values_rolling_avg: clausesRollingAvg.values,
        queries: queries
    };
};

// *---------------*
// route schema
// *---------------*
const schema = {
    description: 'gets stats based on category and subcategory.',
    tags: ['emphasis-explorer'],
    summary: 'gets stats based on category and subcategory.',
    querystring: {
        category: {
            type: 'string',
            description: 'Emphasis Area category',
            example: 'lane_departure, ped_cyclist, intersection, driver_behavior, road_users'
        },
        subCategory: {
            type: 'string',
            description: 'Emphasis Area subcategory',
            example:
                'aggressive, drowsy_distracted, impaired, unlicensed, unbelted, heavy_vehicle, mature, younger, motorcyclist, work_zone'
        },
        chartType: {
            type: 'string',
            description: 'chart type',
            example:
                'annual_bodies, annual_bodies_rolling_average, crash_type, related_behavior, null'
        },
        startYear: {
            type: 'string',
            description: 'The start year.',
            example: '2016'
        },
        endYear: {
            type: 'string',
            description: 'The end year.',
            example: '2020'
        },
        sri: {
            type: 'string',
            description: 'SRI code.'
        },
        mun_cty_co: {
            type: 'string',
            description: 'County Code.',
            example: '02'
        },
        mun_mu: {
            type: 'string',
            description: 'Municipality code.',
            example: '13'
        }
    }
};

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/emphasis-explorer/get-statistics',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            request.tracker = new fastify.RequestTracker(
                request.headers.credentials,
                'emphasis_explorer',
                'get_statistics',
                JSON.stringify(request.query),
                reply
            );

            fastify.pg.connect(onConnect);

            function onConnect(err, client, release) {
                client.connectionParameters.query_timeout = customTimeout;

                if (err) {
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server'
                    });
                }

                var queryArgs = request.query;
                if (queryArgs.startYear == undefined) {
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'need start year'
                    });
                } else if (queryArgs.endYear == undefined) {
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'need end year'
                    });
                } else if (queryArgs.category == undefined) {
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'need category'
                    });
                }
                else {
                    request.tracker.start();

                    let filterJson = JSON.parse(JSON.stringify(queryArgs));
                    const queriesObject = getQueries(filterJson);

                    try {
                        let crashData = {};
                        let promises = []; // store all promises to be queried on
                        if (queriesObject.queries === undefined) {
                            reply.send({
                                statusCode: 500,
                                error: 'Invalid category or subcategory',
                                message: 'Please check category or subcategory input and try again.'
                            });
                        }

                        if (queryArgs.chartType === 'related_behavior') {
                            for (const [category, values] of Object.entries(queriesObject.queries)) {
                                const promise = new Promise((resolve, reject) => {
                                    try {
                                        const queryString = values.query();
                                        //console.log(queryString)
                                        if (category === 'annual_bodies_rolling_average') {
                                            const res = client.query(queryString, queriesObject.values_rolling_avg);
                                            return resolve(res);
                                        } else {
                                            const res = client.query(queryString, queriesObject.values);
                                            return resolve(res);
                                        }
                                    } catch (err) {
                                        return reject(err);
                                    }
                                });

                                promises.push(promise);
                            }
                        }
                        else {
                            const promise = new Promise((resolve, reject) => {
                                try {
                                    const queryString = queriesObject.queries.query();
                                    //console.log(queryString)
                                    if (queryArgs.chartType === 'annual_bodies_rolling_average') {
                                        const res = client.query(queryString, queriesObject.values_rolling_avg);
                                        return resolve(res);
                                    } else {
                                        const res = client.query(queryString, queriesObject.values);
                                        return resolve(res);
                                    }
                                } catch (err) {
                                    return reject(err);
                                }
                            });

                            promises.push(promise);
                        }

                        Promise.all(promises)
                            .then((returnData) => {
                                for (let i = 0; i < returnData.length; i++) {
                                    let data = returnData[i].rows;
                                    let table = `${queryArgs.chartType ? queryArgs.chartType : queryArgs.subCategory}`;

                                    if (data.length === 0) {
                                        crashData[table] = [];
                                    } else {
                                        if (table === 'related_behavior') {
                                            let relatedBehaviorTable = Object.keys(queriesObject.queries)[i];
                                            crashData[relatedBehaviorTable] = data;
                                        }
                                        else {
                                            if (data && data.length > 0) {
                                                if (table && table === 'annual_bodies_rolling_average') {
                                                    const rollingAvgData = calculateRollingAverage(
                                                        data,
                                                        parseInt(filterJson.startYear),
                                                        parseInt(filterJson.endYear)
                                                    );
                                                    crashData[table] = rollingAvgData;
                                                } else {
                                                    crashData[table] = data;
                                                }
                                            }
                                        }
                                    }
                                }

                                // console.log({ [filterJson.category]: crashData })

                                request.tracker.complete();
                                release();
                                reply.send({ [filterJson.category]: crashData });
                            })
                            .catch((error) => {
                                request.tracker.error(error);
                                release();
                                reply.send({
                                    statusCode: 500,
                                    error: error.message,
                                    message: 'Query Error'
                                });
                            });
                    } catch (error) {
                        request.tracker.error(error);
                        release();
                        reply.send({
                            statusCode: 500,
                            error: error.message,
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
