// jurisdiction_report: generates the jurisdiction report pdf based on county, muni, start year, and end year inputs

const burgerHelper = require('../../helper_functions/sunglare_helper');

// *---------------*
// route schema
// *---------------*
const schema = {
    description: 'generates a sunglare report pdf.',
    tags: ['sunglare'],
    summary: 'generates a sunglare report pdf.',
    querystring: {
        user: {
            type: 'string',
            description: 'The user name.',
            default: ''
        },
        moduleType: {
            type: 'string',
            description: 'The type of predictive module.',
            default: 'sunglare'
        },
        sort: {
            type: 'string',
            description: 'The sorting method used in the report PDF.',
            default: 'sri-sort'
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
        crashAttributes: {
            type: 'string',
            description: 'Comma seperated list of Crash Attribute codes based on the NJTR-1 form.',
            default: "surf_cond_code,road_surf_code,road_horiz_align_code,road_grade_code"
        },
        travelDirectionCodes: {
            type: 'string',
            description: 'Comma seperated list of Travel Direction codes based on the NJTR-1 form.',
        },
        timeOfDayCodes: {
            type: 'string',
            description: 'Comma seperated list of Time of Day codes based on the NJTR-1 form.',
        },
        signalizedIntersectionCodes: {
            type: 'string',
            description: 'Comma seperated list of Signalized Intersection codes based on the NJTR-1 form.'
        },
        sri: {
            type: 'string',
            description: 'SRI code.',
            default: '00000010__'
        },
        countyCode: {
            type: 'string',
            description: 'County Code.',
        },
        muniCode: {
            type: 'string',
            description: 'Municipality code.'
        }
    }
}

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/sunglare/report',
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
                } else {
                    var reportQueries = burgerHelper.GetReportQueries(queryArgs);

                    var promises = [];
                    for (var key in reportQueries) {
                        if (reportQueries.hasOwnProperty(key)) {
                            const promise = new Promise((resolve, reject) => {
                                try {
                                    console.log(reportQueries[key].query)
                                    const res = client.query(reportQueries[key].query);
                                    return resolve(res);
                                }
                                catch(err) {
                                    console.log(err.stack);
                                    console.log(reportQueries[key].query);
                                    return reject(error);
                                }  
                            });
                            promises.push(promise);
                        }
                    }

                    if (queryArgs.sri) {
                        const promise = new Promise((resolve, reject) => {
                            try {
                                const res = client.query(burgerHelper.GetSriNameQuery(queryArgs.sri));
                                return resolve(res);
                            }
                            catch(err) {
                                console.log(err.stack);
                                return reject(error);
                            }  
                        });
                        promises.push(promise);
                    }

                    Promise.all(promises).then((reportDataArray) => {
                        //console.log(reportDataArray);
                        for (let i = 0; i < reportDataArray.length; i++) {
                            if (queryArgs.sri && i === reportDataArray.length - 1) {
                                queryArgs.sriName = reportDataArray[i].rows[0].name;
                            }
                            else {
                                var data = reportDataArray[i].rows;
                                var category = Object.keys(reportQueries)[i];
                                reportQueries[category]["data"] = data;
                            }
                        }

                        // create report pdf
                        const fileInfo = burgerHelper.MakeSunglareReport(queryArgs, reportQueries);
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