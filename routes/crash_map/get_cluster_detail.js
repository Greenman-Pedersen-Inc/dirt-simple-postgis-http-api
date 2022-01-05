// get_cluster_detail: Gets all cases within a crash cluster

// *---------------*
// route query
// *---------------*
const sql = (queryArgs) => {
    const njtr1Root = 'https://voyagernjtr1.s3.amazonaws.com/';
    const splitCrashIdList = queryArgs.crashIDList.split('~');
    const formattedList = "'" + splitCrashIdList.join("','") + "'"
    var sql = `
    SELECT *, directory as report_directory,
    CASE 
        WHEN directory IS NOT NULL OR directory <> '' THEN CONCAT('${njtr1Root}', directory, '/', dln, '.PDF') 
        ELSE NULL
    END AS "URL"
    FROM ard_accidents WHERE crashid IN (${formattedList})
    `;
    // console.log(sql);
    return sql;
  }

// *---------------*
// route schema
// *---------------*
const schema = {
    description: "Gets all cases within a crash cluster.",
    tags: ['crash-map'],
    summary: "Gets all cases within a crash cluster.",
    querystring: {
        crashIDList: {
            type: 'string',
            description: 'list of case IDs within a cluster, seperated by ~',
            default: '11-07-2019-19-19751-AC~11-07-2019-19-2827-AC~11-07-2020-20-21104-AC~11-07-2018-18-34092-AC~11-07-2016-C060-2016-00758A~11-07-2016-16-6761-AC~11-07-2020-20-25934-AC~11-07-2019-19-34845-AC~11-07-2017-17-36756-AC'
        }
    }
}

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/crash-map/get-cluster-detail',
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
                if (queryArgs.crashIDList == undefined) {
                    return reply.send({
                        "statusCode": 500,
                        "error": "Internal Server Error",
                        "message": "need at least one case ID within a cluster"
                    });
                }

                client.query(
                    sql(queryArgs),
                    function onResult(err, result) {
                        release()
                        reply.send(err || {Crashes: result.rows})
                    }
                )
            }
        }
    })
    next()
}

module.exports.autoPrefix = '/v1'