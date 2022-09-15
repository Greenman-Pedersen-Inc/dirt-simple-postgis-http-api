// export_records: Returns a URL link to a zipped folder of a CSV containing ard_accidents data.
// Crashes are specified by a string array of crashIDs.

const fs = require('fs');
const path = require('path');
const fastifyStatic = require('fastify-static');

// use a converter to make CSV from data rows
const { convertArrayToCSV } = require('convert-array-to-csv');
const { transcribeKeysArray } = require('../../helper_functions/code_translations/translator_helper');
const customTimeout = 30000;

// outputPath to store CSV
const folderName = 'emphasis-explorer';
const outputPath = path.join(__dirname, '../../output', folderName);
// *---------------*
// route query
// *---------------*
const sql = (params, query) => {
    let queryText = `
    select ${query.columns}
    from ${params.table}
    ${query.filter ? `WHERE ${query.filter}` : ''}
    ${query.group ? `GROUP BY ${query.group}` : ''}
    ${query.limit ? `LIMIT ${query.limit}` : ''}
  `;
    //console.log(queryText);
    return queryText;
};

// *---------------*
// route schema
// *---------------*
const schema = {
    description: 'Generates a URL for a zipped folder of a CSV file containing data from a specified data table.',
    tags: ['emphasis-explorer'],
    summary: 'Generates a URL for a zipped folder of a CSV file containing data from a specified data table.',
    params: {
        table: {
            type: 'string',
            description: 'The name of the table or view.'
        }
    },
    querystring: {
        columns: {
            type: 'string',
            description: 'Columns to return.',
        },
        filter: {
            type: 'string',
            description: 'Optional filter parameters for a SQL WHERE statement.'
        },
        limit: {
            type: 'integer',
            description: 'Optional limit to the number of output features.',
        },
        group: {
            type: 'string',
            description: 'Optional column(s) to group by.'
        },
        exportType: {
            type: 'string',
            description: 'Table type: crashes, occupants, pedestrians'
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
        url: '/emphasis-explorer/export-table/:table',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            const queryArgs = request.query;

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
                    release();

                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server'
                    });
                } 
                else if (queryArgs.columns === undefined) {
                    release();

                    reply.send({
                        statusCode: 400,
                        error: 'Bad request',
                        message: 'missing columns'
                    });
                } 
                else if (request.params.table === undefined) {
                    release();

                    reply.send({
                        statusCode: 400,
                        error: 'Bad request',
                        message: 'missing table name'
                    });
                } 
                else if (queryArgs.exportType === undefined) {
                    release();

                    reply.send({
                        statusCode: 400,
                        error: 'Bad request',
                        message: 'missing exportType'
                    });
                } 
                else {
                    try {
                        client.query(sql(request.params, queryArgs), function onResult(err, result) {
                            release();
                            let returnRows = [];
                            if (result) {
                                const fileName = `Emphasis_Explorer${queryArgs.exportType}_${Date.now()}_${Math.floor(
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
                                    seperator: ';'
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
                                            reply.send({
                                                statusCode: 400,
                                                error: 'Unable to zip',
                                                message: err
                                            });
                                        } else {
                                            const zip = new AdmZip();
                                            const outputFile = path.join(outputPath, zipFileName);
                                            zip.addLocalFile(path.join(outputPath, csvFileName));
                                            zip.writeZip(outputFile);
                                            console.log(`Created ${outputFile} successfully`);
                                            reply.code(200);
                                            reply.header('exportCount', result.rows.length);
                                            reply.sendFile(zipFileName, outputPath)
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
