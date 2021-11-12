// jurisdiction_report: generates the jurisdiction report pdf based on county, muni, start year, and end year inputs

const burgerHelper = require('../../helper_functions/jurisdiction_report_helper');

// *---------------*
// route schema
// *---------------*
const schema = {
    description: 'generates a jurisdiction report pdf.',
    tags: ['jurisdiction'],
    summary: 'generates a jurisdiction report pdf.',
    querystring: {
        startYear: {
            type: 'integer',
            description: 'unique start year',
            default: '2015'
        },
        endYear: {
            type: 'integer',
            description: 'unique end year',
            default: '2019'
        },
        jurisdictionCode: {
            type: 'string',
            description: 'county code and muni code together',
            default: "1102"
        }
    }
}


// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/jurisidiction/report',
        schema: schema,
        handler: function (request, reply) {
            fastify.pg.connect(onConnect)

            function onConnect(err, client, release) {
                if (err) {
                    reply.send(err);
                    return;
                } 

                var queryArgs = request.query;
                if (queryArgs.startYear == undefined) {
                    return reply.send({
                        "statusCode": 500,
                        "error": "Internal Server Error",
                        "message": "need start or end year"
                    });
                } else if (queryArgs.endYear == undefined) {
                    return reply.send({
                        "statusCode": 500,
                        "error": "Internal Server Error",
                        "message": "need start or end year"
                    });
                } else if (queryArgs.jurisdictionCode == undefined) {
                    return reply.send({
                        "statusCode": 500,
                        "error": "Internal Server Error",
                        "message": "need jurisdiction code"
                    });
                } else {
                    var reportQueries = burgerHelper.getReportQueries(queryArgs);
                    var reportData = {
                        "pedestrians": [],
                        "drivers": [],
                        "vehicles": [],
                        "crashes": [],
                        "police": [],
                        "police2": []
                    };
                    var promises = [];
                    var categories = [];

                    for (var key in reportQueries) {
                        if (reportQueries.hasOwnProperty(key)) {
                            reportQueries[key].forEach(queryObj => {
                                const promise = new Promise((resolve, reject) => {
                                    try {
                                        const res = client.query(queryObj.query);
                                        return resolve(res);
                                    }
                                    catch(err) {
                                        console.log(err.stack);
                                        console.log(queryObj.query);
                                        return reject(error);
                                    }  
                                });
                                promises.push(promise);
                                categories.push({[queryObj.category]: queryObj.name});
                            });
                        }
                    }

                    Promise.all(promises).then((reportDataArray) => {
                        for (let i = 0; i < reportDataArray.length; i++) {
                            var data = reportDataArray[i].rows;
                            var category = Object.keys(categories[i])[0];
                            var tableTitle = Object.values(categories[i])[0];
                            reportData[category].push({[tableTitle]: data});
                        }

                        // create report pdf
                        const fileInfo = burgerHelper.makeJurisdictionReport(queryArgs, reportData);
                        fileInfo.then((createdFile) => {
                            console.log(createdFile)
                            reply.send({ url: createdFile.fileName });
                        }).catch((error) => {
                            console.log("report error");
                            console.log(error);
                        })
                    });
                }
            }
        }
    })
    next();
}

module.exports.autoPrefix = '/v1'
