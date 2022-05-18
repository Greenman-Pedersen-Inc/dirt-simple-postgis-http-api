// weather_report: generates the weather report
const fs = require('fs');
const path = require('path');
const outputPath = path.join(__dirname, '../../output', 'weather');
const reportHelper = require('../../helper_functions/report_maker/predictive_report_layout');
const customTimeout = 20000;

// *---------------*
// route schema
// *---------------*
const schema = {
    description: 'generates a weather report pdf.',
    tags: ['weather'],
    summary: 'generates a weather report pdf.',
    querystring: {
        user: {
            type: 'string',
            description: 'The user name.',
            default: ''
        },
        moduleType: {
            type: 'string',
            description: 'The type of predictive module.',
            default: 'weather'
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
            default: 'light_cond_code,surf_cond_code,road_surf_code,road_horiz_align_code,road_grade_code'
        },
        environmentCodes: {
            type: 'string',
            description: 'Comma seperated list of enviornment codes based on the NJTR-1 form.',
            default: '03,02'
        },
        sri: {
            type: 'string',
            description: 'SRI code.'
        },
        countyCode: {
            type: 'string',
            description: 'County Code.'
        },
        muniCode: {
            type: 'string',
            description: 'Municipality code.'
        }
    }
};

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/weather/report',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            const reportQueries = reportHelper.getReportQueries(request.query);
            const promises = [];
            request.tracker = new fastify.RequestTracker(
                request.headers.credentials,
                'weather',
                'report',
                JSON.stringify(request.query)
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
            } else if (request.query.environmentCodes == undefined) {
                reply.code(400).send('need environment codes');
                request.tracker.error('need environment codes');
            } else {
                fastify.pg
                    .connect()
                    .then((client) => {
                        request.tracker.start();
                        client.connectionParameters.query_timeout = 30000;

                        for (let key in reportQueries) {
                            if (reportQueries.hasOwnProperty(key)) {
                                const promise = new Promise((resolve, reject) => {
                                    try {
                                        const res = client.query(reportQueries[key].query);
                                        resolve(res);
                                    } catch (error) {
                                        reply.code(500).send(error);
                                        request.tracker.error(error);
                                        reject(error);
                                    }
                                });
                                promises.push(promise);
                            }
                        }

                        if (request.query.sri) {
                            const promise = new Promise((resolve, reject) => {
                                try {
                                    const res = client.query(reportHelper.getSriNameQuery(request.query.sri));
                                    resolve(res);
                                } catch (error) {
                                    reply.code(500).send(error);
                                    request.tracker.error(error);
                                    reject(error);
                                }
                            });
                            promises.push(promise);
                        }
                        Promise.all(promises)
                            .then((reportDataArray) => {
                                for (let i = 0; i < reportDataArray.length; i++) {
                                    if (request.query.sri && i === reportDataArray.length - 1) {
                                        request.query.sriName = reportDataArray[i].rows[0].name;
                                    } else {
                                        const data = reportDataArray[i].rows;
                                        const category = Object.keys(reportQueries)[i];
                                        reportQueries[category]['data'] = data;
                                    }
                                }

                                // create report pdf
                                const fileInfo = reportHelper.makePredictiveReport(
                                    request.query,
                                    reportQueries,
                                    'Top SRI & Mileposts by Weather Conditions',
                                    'weather_report.pdf',
                                    'weather'
                                );

                                return fileInfo
                                    .then((createdFile) => {
                                        reply.code(200);
                                        reply.sendFile(createdFile.fileName, outputPath);
                                        request.tracker.complete();
                                    })
                                    .catch((error) => {
                                        reply.code(500).send(error);
                                        request.tracker.error(error);
                                    });
                            })
                            .catch((error) => {
                                reply.code(500).send(error);
                                request.tracker.error(error);
                            })
                            .then(() => client.end());
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
