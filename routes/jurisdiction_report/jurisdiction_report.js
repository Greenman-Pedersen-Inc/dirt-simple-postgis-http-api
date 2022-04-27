// jurisdiction_report: generates the jurisdiction report pdf based on county, muni, start year, and end year inputs
const fs = require('fs');
const juriHelper = require('../../helper_functions/jurisdiction_report_helper');

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
            default: '1102'
        }
    }
};

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/jurisidiction/report',
        schema: schema,
        handler: function (request, reply) {
            fastify.pg.connect(onConnect);

            function onConnect(err, client, release) {
                var queryArgs = request.query;

                if (err) {
                    reply.send(err);
                    release();
                } else {
                    if (queryArgs.startYear == undefined) {
                        return reply.send({
                            statusCode: 500,
                            error: 'Internal Server Error',
                            message: 'need start or end year'
                        });
                    } else if (queryArgs.endYear == undefined) {
                        return reply.send({
                            statusCode: 500,
                            error: 'Internal Server Error',
                            message: 'need start or end year'
                        });
                    } else if (queryArgs.jurisdictionCode == undefined) {
                        return reply.send({
                            statusCode: 500,
                            error: 'Internal Server Error',
                            message: 'need jurisdiction code'
                        });
                    } else {
                        try {
                            const reportQueries = juriHelper.getReportQueries(queryArgs);
                            const promises = [];
                            const categories = [];

                            for (var key in reportQueries) {
                                if (reportQueries.hasOwnProperty(key)) {
                                    reportQueries[key].forEach((queryObj) => {
                                        const promise = new Promise((resolve, reject) => {
                                            try {
                                                const res = client.query(queryObj.query);
                                                return resolve(res);
                                            } catch (err) {
                                                console.log(err.stack);
                                                console.log(queryObj.query);
                                                return reject(error);
                                            }
                                        });
                                        promises.push(promise);
                                        categories.push({
                                            [queryObj.category]: queryObj.name
                                        });
                                    });
                                }
                            }

                            Promise.all(promises).then((reportDataArray, error) => {
                                var reportData = {
                                    pedestrians: [],
                                    drivers: [],
                                    vehicles: [],
                                    crashes: [],
                                    police: [],
                                    police2: []
                                };

                                release();

                                if (error) {
                                    console.log(error);
                                } else {
                                    for (let i = 0; i < reportDataArray.length; i++) {
                                        const data = reportDataArray[i].rows;
                                        const category = Object.keys(categories[i])[0];
                                        const tableTitle = Object.values(categories[i])[0];

                                        reportData[category].push({
                                            [tableTitle]: data
                                        });
                                    }

                                    // create report pdf
                                    const fileInfo = juriHelper.makeJurisdictionReport(queryArgs, reportData);
                                    fileInfo
                                        .then((createdFile) => {
                                            const stream = fs.createReadStream(createdFile.savePath, 'binary');

                                            reply.header('Content-Type', 'application/pdf');
                                            reply.send(stream).type('application/pdf').code(200);
                                        })
                                        .catch((error) => {
                                            console.log('report error');
                                            console.log(error);
                                        });
                                }
                            });
                        } catch (error) {
                            console.log(error);
                            release();
                        }
                    }
                }
            }
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
