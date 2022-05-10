// weather_report: generates the weather report
const fs = require('fs');
const path = require('path');
const outputPath = path.join(__dirname, '../../output', 'weather');
const reportHelper = require('../../helper_functions/report_maker/predictive_report_layout');

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
            fastify.pg.connect(onConnect);

            function onConnect(err, client, release) {
                if (err) {
                    reply.send(err);
                    return;
                }

                var queryArgs = request.query;
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
                } else if (queryArgs.environmentCodes == undefined) {
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'need enviornmental codes'
                    });
                } else {
                    var reportQueries = reportHelper.getReportQueries(queryArgs);
                    var promises = [];

                    if (!fs.existsSync(outputPath)) {
                        try {
                            fs.mkdirSync(outputPath, { recursive: true });
                        } catch (error) {
                            console.log(error);
                        }
                    }

                    fs.readdir(outputPath, function (err, files) {
                        //handling error
                        if (err) {
                            console.log('Unable to scan directory: ' + err);
                        }
                        //listing all files using forEach
                        files.forEach(function (file) {
                            fs.stat(path.join(outputPath, file), function (err, stat) {
                                let now = new Date().getTime();
                                let endTime = new Date(stat.ctime).getTime() + 600000;

                                if (err) {
                                    console.error(err);
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

                    if (queryArgs.sri) {
                        const promise = new Promise((resolve, reject) => {
                            try {
                                const res = client.query(reportHelper.getSriNameQuery(queryArgs.sri));
                                return resolve(res);
                            } catch (err) {
                                //console.log(err.stack);
                                return reject(error);
                            }
                        });
                        promises.push(promise);
                    }

                    Promise.all(promises).then((reportDataArray) => {
                        ////console.log(reportDataArray);
                        for (let i = 0; i < reportDataArray.length; i++) {
                            if (queryArgs.sri && i === reportDataArray.length - 1) {
                                queryArgs.sriName = reportDataArray[i].rows[0].name;
                            } else {
                                var data = reportDataArray[i].rows;
                                var category = Object.keys(reportQueries)[i];
                                reportQueries[category]['data'] = data;
                            }
                        }

                        // create report pdf
                        const fileInfo = reportHelper.makePredictiveReport(
                            queryArgs,
                            reportQueries,
                            'Top SRI & Mileposts by Weather Conditions',
                            'weather_report.pdf',
                            'weather'
                        );

                        fileInfo
                            .then((createdFile) => {
                                reply.code(200);
                                reply.sendFile(createdFile.fileName, outputPath);
                            })
                            .catch((error) => {
                                console.log('report error');
                                console.log(error);
                            });
                    });
                }
            }
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';