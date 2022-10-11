// export_records: Returns a URL link to a zipped folder of a CSV containing ard_accidents data.
// Crashes are specified by a string array of crashIDs.

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const fastifyStatic = require('fastify-static');

// use a converter to make CSV from data rows
const { convertArrayToCSV } = require('convert-array-to-csv');
const { transcribeKeysArray } = require('../../helper_functions/code_translations/translator_helper');
const { makeCrashFilterQuery } = require('../../helper_functions/crash_filter_helper');
const customTimeout = 30000;

// outputPath to store CSV
const folderName = 'records';
const outputPath = path.join(__dirname, '../../output', folderName);
// *---------------*
// route query
// *---------------*
const sql = (queryArgs) => {
    const accidentsTableName = 'ard_accidents_geom_partition';
    const parsed_filter = JSON.parse(queryArgs.crashFilter);
    const filter = makeCrashFilterQuery(parsed_filter, accidentsTableName);
    const whereClause = filter.whereClause;
    const fromClause = filter.fromClause;

    const query = `
        SELECT * FROM public.ard_accidents_geom_partition 
        ${fromClause ? ` ${fromClause}` : ''}
        WHERE ${whereClause ? `${whereClause}` : ''}
        ${
            queryArgs.boundingBoxMinX
                ? ` AND geom && ST_MakeEnvelope (${queryArgs.boundingBoxMinX}, ${queryArgs.boundingBoxMinY}, ${queryArgs.boundingBoxMaxX}, ${queryArgs.boundingBoxMaxY}, 4326)`
                : ''
        } 
        LIMIT 50000;
    `;

    //console.log(query)
    return query;
};

// *---------------*
// route schema
// *---------------*
const schema = {
    description: 'Generates a URL for a zipped folder of a CSV file containing data from the ard_accidents table.',
    tags: ['crash-map'],
    summary: 'Generates a URL for a zipped folder of a CSV file containing data from the ard_accidents table.',
    querystring: {
        crashids: {
            type: 'string',
            description: 'list of crashid seperated by comma',
            example: '15-23-2017-17PM02259,13-51-2019-C060-2019-02007A,15-23-2016-I-2016-004176'
        },
        crashFilter: {
            type: 'string',
            description: 'stringified JSON of crash filter object',
            example: '{"mp_start": "0", "mp_end": "11.6", "year": "2017,2018,2019", "contr_circum_code_vehicles": "01"}'
        },
        boundingBoxMinX: {
            type: 'number',
            description: 'left point of the map extent',
            example: -75.18347186057379
        },
        boundingBoxMinY: {
            type: 'number',
            description: 'bottom point of the map extent',
            example: 39.89214724158961
        },
        boundingBoxMaxX: {
            type: 'number',
            description: 'right point of the map extent',
            example: -74.99457847510519
        },
        boundingBoxMaxY: {
            type: 'number',
            description: 'top point of the map extent',
            example: -39.93906091093021
        }
    }
};

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    if (!fs.existsSync(outputPath)) {
        try {
            fs.mkdirSync(outputPath, { recursive: true });
        } catch (error) {
            console.error(error);
        }
    }
    fastify.register(fastifyStatic, {
        root: outputPath,
        prefix: '/' + folderName + '/', // optional: default '/'
        decorateReply: true, // the reply decorator has been added by the first plugin registration
    });

    fastify.route({
        method: 'GET',
        url: '/crash-map/export-records',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            request.tracker = new fastify.RequestTracker(
                request.headers.credentials,
                'crash_map',
                'export_records',
                JSON.stringify(request.query),
                reply
            );

            const queryArgs = request.query;
            request.tracker.start();

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

            function onConnect(err, client, release) {
                client.connectionParameters.query_timeout = customTimeout;

                if (err) {
                    request.tracker.error(err);
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server'
                    });
                } else if (queryArgs.crashFilter === undefined) {
                    request.tracker.error('missing crashFilter');
                    release();
                    reply.send({
                        statusCode: 400,
                        error: 'Bad request',
                        message: 'missing crashFilter'
                    });
                } else {
                    try {
                        client.query(sql(queryArgs), function onResult(err, result) {
                            let returnRows = [];
                            if (result) {
                                const fileName = `Voyager_Crash_Record_Export_${Date.now()}_${Math.floor(
                                    1000 + Math.random() * 9000
                                ).toString()}`;
                                const csvFileName = fileName + '.csv';
                                const zipFileName = fileName + '.zip';

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

                                if (result.hasOwnProperty('rows')) {
                                    returnRows = transcribeKeysArray(result.rows);
                                }

                                const csvFromArrayOfObjects = convertArrayToCSV(returnRows, {
                                    separator: ';'
                                });

                                const AdmZip = require('adm-zip');

                                fs.writeFile(
                                    path.join(outputPath, csvFileName),
                                    csvFromArrayOfObjects,
                                    'utf8',
                                    function (err) {
                                        if (err) {
                                            console.log(
                                                'Some error occurred - file either not saved or corrupted file saved.'
                                            );
                                            request.tracker.error('Some error occurred - file either not saved or corrupted file saved.');
                                            reply.send({
                                                statusCode: 400,
                                                error: 'Unable to zip',
                                                message: err
                                            });
                                            release();
                                        } else {
                                            const zip = new AdmZip();
                                            const outputFile = path.join(outputPath, zipFileName);
                                            zip.addLocalFile(path.join(outputPath, csvFileName));
                                            zip.writeZip(outputFile);
                                            console.log(`Created ${outputFile} successfully`);
                                            reply.code(200);
                                            reply.header('exportCount', result.rows.length);
                                            reply.sendFile(zipFileName, outputPath);
                                            request.tracker.complete();
                                            release();
                                        }
                                    }
                                );
                            } else {
                                reply.code(204);
                                reply.send(result);
                                release();
                            }
                        });
                    } catch (error) {
                        request.tracker.error(err);
                        release();
                        reply.send({
                            statusCode: 500,
                            error: error,
                            message: request
                        });
                    }
                }
            }

            fastify.pg.connect(onConnect);
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
