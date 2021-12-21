// si_by_year: gets serious injury count by year
const burgerHelper = require('../../helper_functions/trends_helper');

// *---------------*
// route schema
// *---------------*
const schema = {
    description: 'gets serious injury count by year.',
    tags: ['trends'],
    summary: 'gets serious injury count by year',
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
            default: 'municipality'
        },
        jurisdictionValue: {
            type: 'string',
            description: 'nj for state, njtpa for mpo, 2 digit for county, 4 digit for muni',
            default: '1330'
        },
        startTime: {
            type: 'string',
            description: '24 hr time; 0700 = 7 am',
            default: '0700'
        },
        endTime: {
            type: 'string',
            description: '24 hr time; 1300 = 1pm',
            default: '2100'
        },
        crashType: {
            type: 'string',
            description: 'crash type code based on the NJTR-1 form',
            default: '01'
        },
        attribute: {
            type: 'string',
            description: 'occupant or pedestrian',
            default: 'occupant'
        }
    }
}

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/trends/si-by-year',
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
                if (queryArgs.startYear == undefined) {
                    return reply.send({
                        "statusCode": 500,
                        "error": "Internal Server Error",
                        "message": "need startyear"
                    });
                } else if (queryArgs.endYear == undefined) {
                    return reply.send({
                        "statusCode": 500,
                        "error": "Internal Server Error",
                        "message": "need start year"
                    });
                }

                const table = `trends.crash_${queryArgs.attribute}_physcl_cndtn_code_02`;
                var reportQueries = burgerHelper.getTrendsQueryObject(queryArgs, table);
                var returnData = {};

                var promises = [];
                for (var key in reportQueries) {
                    if (reportQueries.hasOwnProperty(key)) {
                        const promise = new Promise((resolve, reject) => {
                            try {
                                //console.log(reportQueries[key].query)
                                const res = client.query(reportQueries[key].query);
                                return resolve(res);
                            }
                            catch(err) {
                                console.log("promise creation error");
                                console.log(err);
                                return reject(error);
                            }  
                        });
                        promises.push(promise);
                    }
                }

                Promise.all(promises).then((reportDataArray) => {
                    for (let i = 0; i < reportDataArray.length; i++) {
                        var data = reportDataArray[i].rows;
                        var category = Object.keys(reportQueries)[i];
                        returnData[category] = data;
                    }
                    reply.send({ GraphData: returnData });
                    release();
                }).catch((error) => {
                    console.log("promise error");
                    console.log(error);
                });

            }
        }
    })
    next()
}

module.exports.autoPrefix = '/v1'