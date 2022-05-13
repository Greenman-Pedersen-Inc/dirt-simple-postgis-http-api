// jurisdiction_report: generates the jurisdiction report pdf based on county, muni, start year, and end year inputs
const fs = require('fs');
const path = require('path');
const outputPath = path.join(__dirname, '../../output', 'jurisdiction');
const juriHelper = require('../../helper_functions/jurisdiction_report_helper');
const customTimeout = 20000;

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
            example: '2015'
        },
        endYear: {
            type: 'integer',
            description: 'unique end year',
            example: '2019'
        },
        jurisdictionCode: {
            type: 'string',
            description: 'county code and muni code together',
            example: '1102'
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
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            const reportQueries = juriHelper.getReportQueries(request.query);
            const promises = [];
            const categories = [];
            request.tracker = new fastify.RequestTracker(
                request.headers.credentials,
                'jurisidiction',
                'report',
                JSON.stringify(request.params)
            );

            // create output folder for route if one doesn't exist
            if (!fs.existsSync(outputPath)) {
                try {
                    fs.mkdirSync(outputPath, { recursive: true });
                } catch (error) {
                    reply.code(500).send(error);
                    request.tracker.error(error);
                }
            }

            // remove all reports older than 10 minutes from output directory
            fs.readdir(outputPath, function (error, files) {
                if (error) {
                    reply.code(500).send(error);
                    request.tracker.error(error);
                }
                files.forEach(function (file) {
                    fs.stat(path.join(outputPath, file), function (error, stat) {
                        let now = new Date().getTime();
                        let endTime = new Date(stat.ctime).getTime() + 600000;

                        if (error) {
                            reply.code(500).send(error);
                            request.tracker.error(error);
                        } else {
                            if (now > endTime) {
                                fs.unlink(path.join(outputPath, file), function (response) {
                                    console.log(`${file} deleted!`);
                                });
                            }
                        }
                    });
                });
            });

            if (request.query.startYear == undefined) {
                reply.code(400).send('need start or end year');
                request.tracker.error('need start or end year');
            } else if (request.query.endYear == undefined) {
                reply.code(400).send('need start or end year');
                request.tracker.error('need start or end year');
            } else if (request.query.jurisdictionCode == undefined) {
                reply.code(400).send('need jurisdiction code');
                request.tracker.error('need jurisdiction code');
            } else {
                fastify.pg
                    .connect()
                    .then((client) => {
                        request.tracker.start();
                        client.connectionParameters.query_timeout = 20000;

                        for (let key in reportQueries) {
                            if (reportQueries.hasOwnProperty(key)) {
                                reportQueries[key].forEach((queryObj) => {
                                    const promise = new Promise((resolve, reject) => {
                                        try {
                                            const res = client.query(queryObj.query);
                                            resolve(res);
                                        } catch (error) {
                                            reply.code(500).send(error);
                                            request.tracker.error(error);
                                            reject(error);
                                        }
                                    });
                                    promises.push(promise);
                                    categories.push({
                                        [queryObj.category]: queryObj.name
                                    });
                                });
                            }
                        }

                        Promise.all(promises)
                            .then((reportDataArray) => {
                                const reportData = {
                                    pedestrians: [],
                                    drivers: [],
                                    vehicles: [],
                                    crashes: [],
                                    police: [],
                                    police2: []
                                };

                                for (let i = 0; i < reportDataArray.length; i++) {
                                    const data = reportDataArray[i].rows;
                                    const category = Object.keys(categories[i])[0];
                                    const tableTitle = Object.values(categories[i])[0];
                                    reportData[category].push({
                                        [tableTitle]: data
                                    });
                                }
                                // create report pdf
                                const fileInfo = juriHelper.makeJurisdictionReport(request.query, reportData);

                                return fileInfo
                                    .then((createdFile) => {
                                        reply.code(200);
                                        reply.sendFile(createdFile.fileName, outputPath);
                                    })
                                    .catch((error) => {
                                        console.error(error);
                                    });
                            })
                            .catch((error) => {
                                reply.code(500).send(error);
                                request.tracker.error(error);
                            })
                            .then(() => {
                                client.end();
                            });
                    })
                    .catch((error) => {
                        reply.code(500).send(error);
                        request.tracker.error(error);
                    });
            }
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
