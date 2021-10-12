// sunglare_topSriSummary: Computes crash and person counts grouped by SRI and milepost. Limited to top 25 

const burgerHelper = require('../../helper_functions/sunglare_helperFunctions');

// *---------------*
// route query
// *---------------*
const sql = (params, query) => {
    var locationClause = burgerHelper.CreateLocationClause(query);
    var filterClause = burgerHelper.CreateFilterClause(query);

    var sqlQuery = `
    SELECT DISTINCT UPPER(public.srilookupname.name), accidents.* FROM
    (
        SELECT calc_sri, 
        ROUND(FLOOR(calc_milepost * 10) / 10, 1) AS milepost,
        CONCAT(CAST (ROUND(FLOOR(calc_milepost * 10) / 10, 1) AS DECIMAL(5,2)), ' - ', ROUND(FLOOR(calc_milepost * 10) / 10, 1) + .09) AS mp_range,
        COUNT(ard_accidents_sunglare.crashid), 
        SUM(CASE WHEN severity_rating5 = '05' THEN 1 ELSE 0 END) fatal,
        SUM(CASE WHEN severity_rating5 = '04' THEN 1 ELSE 0 END) incapacitated,
        SUM(CASE WHEN severity_rating5 = '03' THEN 1 ELSE 0 END) mod_inj,
        SUM(CASE WHEN severity_rating5 = '02' THEN 1 ELSE 0 END) comp_pain,
        SUM(CASE WHEN severity_rating5 = '01' THEN 1 ELSE 0 END) prop_dmg
        FROM 
        sunglare.ard_accidents_sunglare
        WHERE year BETWEEN ${query.startYear} AND ${query.endYear} 
        ${locationClause !== "" ? ` AND ${locationClause}` : '' }
        ${filterClause  !== "" ? ` AND ${filterClause}` : '' }
        GROUP BY calc_sri, milepost
    ) accidents
    LEFT JOIN public.srilookupname ON public.srilookupname.stndrd_rt_id = accidents.calc_sri
    ORDER BY fatal DESC, incapacitated DESC, mod_inj DESC, count DESC
    LIMIT 25;
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
      url: '/sunglare/sri-summary',
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
              reply.send(err || {"SriData": result.rows})
            }
          )
        }
      }
    })
    next()
  }
  
  module.exports.autoPrefix = '/v1'