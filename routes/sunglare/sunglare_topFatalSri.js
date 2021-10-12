// sunglare_topSriFatal: Computes the top SRI and MP by Fatal Count. Limited to top 25 

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
        SUM(CASE WHEN severity_rating5 = '05' THEN 1 ELSE 0 END) fatal,
        SUM(CASE WHEN severity_rating5 = '04' THEN 1 ELSE 0 END) incapacitated,
        SUBSTRING ( acc_time, 1, 2 ) crash_hr
        FROM 
        sunglare.ard_accidents_sunglare
        WHERE year BETWEEN ${query.startYear} AND ${query.endYear}  
        ${locationClause !== "" ? ` AND ${locationClause}` : '' }
        ${filterClause  !== "" ? ` AND ${filterClause}` : '' }        
        GROUP BY calc_sri, calc_milepost, crash_hr
    ) accidents
    LEFT JOIN public.srilookupname ON public.srilookupname.stndrd_rt_id = accidents.calc_sri
    WHERE fatal > 0 OR incapacitated > 0 
    ORDER BY fatal DESC, incapacitated DESC LIMIT 25;
    `
  
    console.log(sqlQuery);
    return sqlQuery;
  }
  
  // *---------------*
  // route schema
  // *---------------*
  
  const schema = {
    description: 'Computes the top SRI and MP by Fatal Count.',
    tags: ['sunglare'],
    summary: 'Computes the top SRI and MP by Fatal Count.',
    querystring: burgerHelper.GetQueryStrings()
  }
  
  // *---------------*
  // create route
  // *---------------*
  
  module.exports = function (fastify, opts, next) {
    fastify.route({
      method: 'GET',
      url: '/sunglare/sri-fatal',
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
              reply.send(err || {"FunctionalClassData": result.rows})
            }
          )
        }
      }
    })
    next()
  }
  
  module.exports.autoPrefix = '/v1'