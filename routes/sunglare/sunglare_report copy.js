// sunglare_report: generates the sunglare report
const reportHelper = require('../../helper_functions/report_maker/predictive_report_layout');
const fs = require('fs');
const path = require('path');
const outputPath = path.join(__dirname, '../../output', 'sunglare');
const customTimeout = 20000;
const schema = {
    description: 'generates a sunglare report pdf.',
    tags: ['sunglare'],
    summary: 'generates a sunglare report pdf.',
    querystring: {
        user: {
            type: 'string',
            description: 'The user name.',
            example: 'mcollins'
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
            example: 'surf_cond_code,road_surf_code,road_horiz_align_code,road_grade_code'
        },
        travelDirectionCodes: {
            type: 'string',
            description: 'Comma seperated list of Travel Direction codes based on the NJTR-1 form.'
        },
        timeOfDayCodes: {
            type: 'string',
            description: 'Comma seperated list of Time of Day codes based on the NJTR-1 form.'
        },
        signalizedIntersectionCodes: {
            type: 'string',
            description: 'Comma seperated list of Signalized Intersection codes based on the NJTR-1 form.'
        },
        sri: {
            type: 'string',
            description: 'SRI code.',
            example: '00000010__'
        },
        countyCode: {
            type: 'string',
            description: 'County Code.',
            example: '01'
        },
        muniCode: {
            type: 'string',
            description: 'Municipality code.',
            example: '13'
        }
    }
};

if (!fs.existsSync(outputPath)) {
    try {
        fs.mkdirSync(outputPath, { recursive: true });
    } catch (error) {
        console.error(error);
    }
}

fastify.register(fastifyStatic, {
    root: outputPath,
    prefix: '/sunglare/', // optional: default '/'
    decorateReply: false // the reply decorator has been added by the first plugin registration
});

module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/sunglare/report',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            const reportQueries = reportHelper.getReportQueries(request.query);
            const promises = [];
            request.tracker = new fastify.RequestTracker(
                request.headers.credentials,
                'sunglare',
                'report',
                JSON.stringify(request.query)
            );

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
            } else {
                fastify.pg
                    .connect()
                    .then((client) => {
                        request.tracker.start();
                        client.connectionParameters.query_timeout = customTimeout;

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
                                    'Top SRI & Mileposts by Sun Glare',
                                    'sunglare_report.pdf',
                                    'sunglare'
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
