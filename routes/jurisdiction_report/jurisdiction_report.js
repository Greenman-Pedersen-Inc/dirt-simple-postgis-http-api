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
                var queryString = request.query;
                if (queryString.startDate == undefined) {
                    return reply.send({
                        "statusCode": 500,
                        "error": "Internal Server Error",
                        "message": "need start or end date"
                    });
                } else if (queryString.endDate == undefined) {
                    return reply.send({
                        "statusCode": 500,
                        "error": "Internal Server Error",
                        "message": "need start or end date"
                    });
                } else if (queryString.jurisdictionCode == undefined) {
                    return reply.send({
                        "statusCode": 500,
                        "error": "Internal Server Error",
                        "message": "need jurisdiction code"
                    });
                } else {

                    const nestedWhere = burgerHelper.getNestedWhere();




                    client.query(
                        sql(request.query),
                        function onResult(err, result) {
                            release();
    
                            if (err) {
                                reply.send(err)
                            } else if (result && result.rowCount > 0) {
                                const queryStrings = request.query;
                                const fileInfo = burgerHelper.FileExport(queryStrings, result);
    
                                fileInfo.then((createdFile) => {
                                    console.log(createdFile)
                                    reply.send({ url: createdFile.fileName });
    
                                }).catch((error) => {
                                    console.log(error);
                                })
                            } else {
                                reply.code(204).send()
                            }
                        }
                    );
                }
            }
        }
    })
    next();
}

module.exports.autoPrefix = '/v1'
