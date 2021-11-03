// jurisdiction_report: generates the jurisdiction report pdf based on county, muni, start year, and end year inputs

const burgerHelper = require('../../helper_functions/jurisdiction_report_helper');

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
            default: '2015'
        },
        endYear: {
            type: 'integer',
            description: 'unique end year',
            default: '2019'
        },
        jurisdictionCode: {
            type: 'string',
            description: 'county code and muni code together',
            default: "0101"
        }
    }
}

async function getReportData(query) {
    try {
        const res = await client.query(query)
        console.log(res.rows[0])
    } catch (err) {
        console.log(err.stack)
    }
}

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/jurisidiction/report',
        schema: schema,
        handler: function (request, reply) {
            fastify.pg.connect(onConnect)

            function onConnect(err, client, release) {
                var queryArgs = request.query;
                if (queryArgs.startYear == undefined) {
                    return reply.send({
                        "statusCode": 500,
                        "error": "Internal Server Error",
                        "message": "need start or end year"
                    });
                } else if (queryArgs.endYear == undefined) {
                    return reply.send({
                        "statusCode": 500,
                        "error": "Internal Server Error",
                        "message": "need start or end year"
                    });
                } else if (queryArgs.jurisdictionCode == undefined) {
                    return reply.send({
                        "statusCode": 500,
                        "error": "Internal Server Error",
                        "message": "need jurisdiction code"
                    });
                } else {
                    const nestedWhere = burgerHelper.getNestedWhere(queryArgs.jurisdictionCode);
                    var pedQueries = burgerHelper.getPedestrianQueries(nestedWhere, queryArgs.startYear, queryArgs.endYear);
                    var reportData = {};


                    const promise = new Promise((resolve, reject) => {
                        try {
                            for (const queryObj of pedQueries) {
                                console.log(queryObj.name);
                                const res = client.query(queryObj.query);
                                return resolve(res);
                                //reportData[queryObj.name] = res.rows;
                            }
                        }
                        catch(err) {
                            console.log(err.stack);
                            return reject(error);
                        }

                        //return resolve(reportData);
                    });

                    Promise.all([promise]).then((values) => {
                        console.log("promise done");
                        console.log(values[0].rows);
                        
                    });

                    // for (const queryObj of pedQueries) {}

                    // pedQueries.forEach(queryObj => {
                    //     console.log(queryObj.name);
                    //     client.query(queryObj.query)
                    //         .then(res => {
                    //             reportData[queryObj.name] = res.rows;
                    //         })
                    //         .catch(e => console.error(e.stack))
                    //         .finally(() => {
                    //             console.log(reportData);
                    //         });
                    // });


                    // client.query(
                    //     sql(request.query),
                    //     function onResult(err, result) {
                    //         release();
    
                    //         if (err) {
                    //             reply.send(err)
                    //         } else if (result && result.rowCount > 0) {
                    //             const queryStrings = request.query;
                    //             const fileInfo = burgerHelper.FileExport(queryStrings, result);
    
                    //             fileInfo.then((createdFile) => {
                    //                 console.log(createdFile)
                    //                 reply.send({ url: createdFile.fileName });
    
                    //             }).catch((error) => {
                    //                 console.log(error);
                    //             })
                    //         } else {
                    //             reply.code(204).send()
                    //         }
                    //     }
                    // );



                }
            }
        }
    })
    next();
}

module.exports.autoPrefix = '/v1'
