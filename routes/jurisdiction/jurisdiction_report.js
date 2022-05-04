// jurisdiction_report: generates the jurisdiction report pdf based on county, muni, start year, and end year inputs
const fs = require('fs');
const path = require('path');
const outputPath = path.join(__dirname, '../../output', 'jurisdiction');
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
            fastify.pg.connect(onConnect);

            function onConnect(err, client, release) {
                try {
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
                            const reportQueries = juriHelper.getReportQueries(queryArgs);
                            const promises = [];
                            const categories = [];
                            // create output folder for route if one doesn't exist
                            if (!fs.existsSync(outputPath)) {
                                try {
                                    fs.mkdirSync(outputPath, { recursive: true });
                                } catch (error) {
                                    console.log(error);
                                }
                            }
                            // remove all reports older than 10 minutes from output directory
                            fs.readdir(outputPath, function (err, files) {
                                //handling error
                                if (err) {
                                    return console.log('Unable to scan directory: ' + err);
                                }
                                //listing all files using forEach
                                files.forEach(function (file) {
                                    fs.stat(path.join(outputPath, file), function (err, stat) {
                                        let now = new Date().getTime();
                                        let endTime = new Date(stat.ctime).getTime() + 600000;
                                        if (err) {
                                            return console.error(err);
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
                                release();

                                var reportData = {
                                    pedestrians: [],
                                    drivers: [],
                                    vehicles: [],
                                    crashes: [],
                                    police: [],
                                    police2: []
                                };

                                if (error) {
                                    console.error(error);
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
                                            reply.code(200);
                                            reply.sendFile(createdFile.fileName, outputPath);
                                        })
                                        .catch((error) => {
                                            console.error(error);
                                        });
                                }
                            });
                        }
                    }
                } catch (error) {
                    release();
                    console.error(error);
                }
            }
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
