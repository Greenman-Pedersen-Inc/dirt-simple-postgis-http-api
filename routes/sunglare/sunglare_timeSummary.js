// sunglare_timeSummary: Computes crash and person counts grouped by the hour.

const burgerHelper = require('../../helper_functions/sunglare_helperFunctions');

// *---------------*
// route query
// *---------------*
const sql = (params, query) => {
  var locationClause = burgerHelper.CreateLocationClause(query);
  var filterClause = burgerHelper.CreateFilterClause(query);

  var sqlQuery = `
  SELECT 
  (SUBSTRING ( acc_time, 1, 2 ))::INTEGER crash_hour,
  (COUNT(sunglare.ard_accidents_sunglare.crashid))::INTEGER crash_count, 
  (SUM(CASE WHEN severity_rating5 = '05' THEN 1 ELSE 0 END))::INTEGER  fatal,
  (SUM(CASE WHEN severity_rating5 = '04' THEN 1 ELSE 0 END))::INTEGER  incapacitated,
  (SUM(CASE WHEN severity_rating5 = '03' THEN 1 ELSE 0 END))::INTEGER  mod_inj,
  (SUM(CASE WHEN severity_rating5 = '02' THEN 1 ELSE 0 END))::INTEGER  comp_pain,
  (SUM(CASE WHEN severity_rating5 = '01' THEN 1 ELSE 0 END))::INTEGER  prop_dmg

  FROM

  sunglare.ard_accidents_sunglare
  WHERE year BETWEEN ${query.startYear} AND ${query.endYear} 
  ${locationClause !== "" ? ` AND ${locationClause}` : '' }
  ${filterClause  !== "" ? ` AND ${filterClause}` : '' }

  GROUP BY crash_hour
  ORDER BY crash_hour;
  `

  console.log(sqlQuery);
  return sqlQuery;
}

// *---------------*
// route schema
// *---------------*

const schema = {
  description: 'Computes crash and person counts grouped by the hour.',
  tags: ['sunglare'],
  summary: 'Computes crash and person counts grouped by the hour.',
  querystring: burgerHelper.GetQueryStrings()
}

// *---------------*
// create route
// *---------------*

module.exports = function (fastify, opts, next) {
  fastify.route({
    method: 'GET',
    url: '/sunglare/time-summary',
    schema: schema,
    handler: function (request, reply) {
      fastify.pg.connect(onConnect)

      function onConnect(err, client, release) {
        if (err) return reply.send({
          "statusCode": 500,
          "error": "Internal Server Error",
          "message": "unable to connect to database server"
        })
        console.log(request.params);
        client.query(
          sql(request.params, request.query),
          function onResult(err, result) {
            release()
            reply.send(err || {"TimeData": result.rows})
          }
        )
      }
    }
  })
  next()
}

module.exports.autoPrefix = '/v1'