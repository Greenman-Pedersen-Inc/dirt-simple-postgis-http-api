// export_records: Returns a URL link to a zipped folder of a CSV containing ard_accidents data. 
// Crashes are specified by a string array of crashIDs.

const fs = require('fs');
const path = require('path');
var zipper = require("zip-local");

// use a converter to make CSV from data rows
const { convertArrayToCSV } = require('convert-array-to-csv');
const converter = require('convert-array-to-csv');

const { formatCodes } = require('../../helper_functions/code_translations/query_maker');
const { transcribeKeysArray } = require('../../helper_functions/code_translations/translator_helper');

// basePath to store CSV
const basePath = 'C:/AppDev/NJDOT/voyager.server/api/helper_functions/report_maker/output/';
const csvFileName = 'Voyager_Crash_Record_Export_' + Date.now();
const filePath = path.join(basePath + csvFileName);

// *---------------*
// route query
// *---------------*
const sql = (queryArgs) => {
    const formattedCrashids = formatCodes(queryArgs.crashids);
    var sql = `
    SELECT * FROM public.ard_accidents WHERE crashid IN (${formattedCrashids});
    `;
    return sql;
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
                if (queryArgs.crashids == undefined) {
                    return reply.send({
                        "statusCode": 500,
                        "error": "Internal Server Error",
                        "message": "need crashid list"
                    });
                }

                client.query(
                    sql(queryArgs),
                    function onResult(err, result) {
                        release();
                        let returnRows = [];
                        //let header = [];
                        if (result) {
                            if (result.hasOwnProperty('rows')) {
                                //header = Object.keys(result.rows[0]);
                                returnRows = transcribeKeysArray(result.rows);
                            }  
                        }

                        const csvFromArrayOfObjects = convertArrayToCSV(returnRows, {
                            seperator: ';'
                        });


                        fs.writeFile(filePath + '.csv', csvFromArrayOfObjects, 'utf8', function (err) {
                            if (err) {
                                console.log('Some error occured - file either not saved or corrupted file saved.');
                                reply.send(err);
                            }
                        });

                        // zipping a file
                        zipper.zip(filePath + '.csv', function (error, zipped) {
                            if (!error) {
                                zipped.compress(); // compress before exporting

                                // var buff = zipped.memory(); // get the zipped file as a Buffer

                                // or save the zipped file to disk
                                zipped.save(filePath + ".zip", function (error) {
                                    if (!error) {
                                        reply.send({ url: csvFileName + '.zip' });
                                    }
                                    else reply.send(error);
                                });
                            }
                            else reply.send(error);
                        });
                    }
                )
            }
        }
    })
    next()
}

module.exports.autoPrefix = '/v1'