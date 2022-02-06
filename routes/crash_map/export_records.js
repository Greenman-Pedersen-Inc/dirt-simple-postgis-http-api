// export_records: Returns a URL link to a zipped folder of a CSV containing ard_accidents data. 
// Crashes are specified by a string array of crashIDs.

const fs = require('fs');
const path = require('path');
var zipper = require("zip-local");

// use a converter to make CSV from data rows
const { convertArrayToCSV } = require('convert-array-to-csv');

const { transcribeKeysArray } = require('../../helper_functions/code_translations/translator_helper');
const { makeCrashFilterQuery } = require('../../helper_functions/crash_filter_helper');

// basePath to store CSV
const basePath = 'C:/AppDev/NJDOT/voyager.server/api/helper_functions/report_maker/output/';
// const basePath = 'C:/Users/stryk/Documents/Sue/dirt-simple-postgis-http-api/helper_functions/report_maker/output/';
// *---------------*
// route query
// *---------------*
const sql = (queryArgs) => {
    const accidentsTableName = "ard_accidents_geom_partition";
    const parsed_filter = JSON.parse(queryArgs.crashFilter);
    const filter = makeCrashFilterQuery(parsed_filter, accidentsTableName);
    const whereClause = filter.whereClause;
    const fromClause = filter.fromClause;

    const query = `
        SELECT * FROM public.ard_accidents_geom_partition 
        ${fromClause ? ` ${fromClause}` : ''}
        WHERE geom && ST_MakeEnvelope (${queryArgs.boundingBoxMinX}, ${queryArgs.boundingBoxMinY}, ${queryArgs.boundingBoxMaxX}, ${queryArgs.boundingBoxMaxY}, 4326)
        ${whereClause ? ` AND ${whereClause}` : ''}
        LIMIT 50000;
    `;

    //console.log(query)
    return query;
}

// *---------------*
// route schema
// *---------------*
const schema = {
    description: "Generates a URL for a zipped folder of a CSV file containing data from the ard_accidents table.",
    tags: ['crash-map'],
    summary: "Generates a URL for a zipped folder of a CSV file containing data from the ard_accidents table.",
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
}

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/crash-map/export-records',
        schema: schema,
        handler: function (request, reply) {
            fastify.pg.connect(onConnect)

            function onConnect(err, client, release) {
                if (err) return reply.send({
                    "statusCode": 500,
                    "error": "Internal Server Error",
                    "message": "unable to connect to database server"
                });

                var queryArgs = request.query;

                // console.log(queryArgs.crashFilter);

                if (queryArgs.crashFilter === undefined) {
                    return reply.send({
                        "statusCode": 400,
                        "error": "Bad request",
                        "message": "missing crashFilter"
                    });
                }

                client.query(
                    sql(queryArgs),
                    function onResult(err, result) {
                        release();
                        let returnRows = [];
                        if (result) {

                            var csvFileName = 'Voyager_Crash_Record_Export_' + Date.now() + '_' + Math.floor(1000 + Math.random() * 9000).toString();
                            console.log(csvFileName)
                            var filePath = path.join(basePath + csvFileName);

                            if (result.hasOwnProperty('rows')) {
                                returnRows = transcribeKeysArray(result.rows);
                            }


                            const csvFromArrayOfObjects = convertArrayToCSV(returnRows, {
                                seperator: ';'
                            });

                            fs.writeFile(filePath + '.csv', csvFromArrayOfObjects, 'utf8', function (err) {
                                if (err) {
                                    console.log('Some error occured - file either not saved or corrupted file saved.');
                                    reply.send({
                                        "statusCode": 400,
                                        "error": "Unable to zip",
                                        "message": err
                                    });
                                }
                                else {
                                    // zipping a file                        
                                    zipper.zip(filePath + '.csv', function (error, zipped) {
                                        if (!error) {
                                            zipped.compress(); // compress before exporting

                                            // or save the zipped file to disk
                                            zipped.save(filePath + ".zip", function (error) {
                                                if (!error) {
                                                    reply.send({
                                                        url: csvFileName + '.zip',
                                                        count: result.rows.length
                                                    });

                                                    // file removed
                                                    fs.unlink(filePath + '.csv', (err) => {
                                                        if (err) {
                                                            console.error(err)
                                                            return
                                                        }
                                                    })
                                                }
                                                else reply.send({
                                                    "statusCode": 400,
                                                    "error": "Unable to save zipped file to disk",
                                                    "message": error
                                                });
                                            });
                                        }
                                        else reply.send({
                                            "statusCode": 400,
                                            "error": "Unable to zip file",
                                            "message": error
                                        });
                                    });
                                }
                            })
                        }
                        else {
                            reply.send({
                                "url": "",
                                "count": 0
                            });
                        }
                    }
                )
            }
        }
    })
    next()
}

module.exports.autoPrefix = '/v1'