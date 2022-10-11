// custom_export_records: FOR INTERNAL USE ONLY
// Crashes are specified by a string array of crashIDs.

const fs = require('fs');
const path = require('path');
const fastifyStatic = require('fastify-static');

// use a converter to make CSV from data rows
const { convertArrayToCSV } = require('convert-array-to-csv');
const { transcribeKeysArray } = require('../../helper_functions/code_translations/translator_helper');
const { makeCrashFilterQuery } = require('../../helper_functions/crash_filter_helper');
const { viewableAttributes } = require('../../helper_functions/code_translations/accidents');

const customTimeout = 30000;

// outputPath to store CSV
const folderName = 'custom-records';
const outputPath = path.join(__dirname, '../../output', folderName);
// *---------------*
// route query
// *---------------*
const sql = (queryArgs) => {

    const query = `SELECT ${viewableAttributes.join(', ')} FROM public.ard_accidents_geom_partition WHERE ${queryArgs.whereClause}`;

    //console.log(query)
    return query;
};

// *---------------*
// route schema
// *---------------*
const schema = {
    description: 'INTERNAL USE - exports CSV of human readable table data',
    tags: ['general'],
    summary: 'INTERNAL USE - exports CSV of human readable table data',
    querystring: {
        whereClause: {
            type: 'string',
            description: 'SQL where clause',
        },
        fileName : {
            type: 'string',
            description: 'name of the file to be exported',
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
        url: '/general/custom-export-records',
        schema: schema,
        // preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            const queryArgs = request.query;

            // // remove all reports older than 10 minutes from output directory
            // fs.readdir(outputPath, function (error, files) {
            //     if (error) {
            //         reply.code(500).send(error);
            //         request.tracker.error(error);
            //     }
            //     files.forEach(function (file) {
            //         fs.stat(path.join(outputPath, file), function (error, stat) {
            //             let now = new Date().getTime();
            //             let endTime = new Date(stat.ctime).getTime() + 600000;

            //             if (error) {
            //                 reply.code(500).send(error);
            //                 request.tracker.error(error);
            //             } else {
            //                 if (now > endTime) {
            //                     fs.unlink(path.join(outputPath, file), function (response) {
            //                         console.log(`${file} deleted!`);
            //                     });
            //                 }
            //             }
            //         });
            //     });
            // });

            function onConnect(err, client, release) {
                client.connectionParameters.query_timeout = customTimeout;

                if (err) {
                    release();

                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server'
                    });
                }
                else if (queryArgs.whereClause === undefined) {
                    release();

                    reply.send({
                        statusCode: 400,
                        error: 'Bad request',
                        message: 'missing where clause'
                    });
                }
                else {
                    try {
                        client.query(sql(queryArgs), function onResult(err, result) {
                            release();
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
                                // // remove all reports older than 10 minutes from output directory
                                // fs.readdir(outputPath, function (err, files) {
                                //     //handling error
                                //     if (err) {
                                //         return console.log('Unable to scan directory: ' + err);
                                //     }
                                //     //listing all files using forEach
                                //     // files.forEach(function (file) {
                                //     //     fs.stat(path.join(outputPath, file), function (err, stat) {
                                //     //         let now = new Date().getTime();
                                //     //         let endTime = new Date(stat.ctime).getTime() + 600000;
                                //     //         if (err) {
                                //     //             return console.error(err);
                                //     //         } else {
                                //     //             if (now > endTime) {
                                //     //                 fs.unlink(path.join(outputPath, file), function (response) {
                                //     //                     console.log(`${file} deleted!`);
                                //     //                 });
                                //     //             }
                                //     //         }
                                //     //     });
                                //     // });
                                // });

                                if (result.hasOwnProperty('rows')) {
                                    returnRows = transcribeKeysArray(result.rows);
                                }

                                const csvFromArrayOfObjects = convertArrayToCSV(returnRows, {
                                    seperator: ';'
                                });

                                const AdmZip = require('adm-zip');

                                fs.writeFile(
                                    path.join(outputPath, queryArgs.fileName + '.csv'),
                                    csvFromArrayOfObjects,
                                    'utf8',
                                    function (err) {
                                        if (err) {
                                            console.log(
                                                'Some error occurred - file either not saved or corrupted file saved.'
                                            );
                                            reply.send({
                                                statusCode: 400,
                                                error: 'Unable to zip',
                                                message: err
                                            });
                                        } else {
                                            // const zip = new AdmZip();
                                            // const outputFile = path.join(outputPath, zipFileName);
                                            // zip.addLocalFile(path.join(outputPath, csvFileName));
                                            // zip.writeZip(outputFile);
                                            // console.log(`Created ${outputFile} successfully`);
                                            reply.code(200);
                                            reply.header('exportCount', result.rows.length);
                                            reply.sendFile(queryArgs.fileName, outputPath)
                                        }
                                    }
                                );
                            } else {
                                reply.code(204);
                                reply.send(result);
                            }
                        });
                    } catch (error) {
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
