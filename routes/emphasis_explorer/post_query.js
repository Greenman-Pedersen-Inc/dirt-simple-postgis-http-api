// route query
const sql = (params, query) => {
  let parsedQuery =  `
  SELECT
    ${query.columns}

  FROM
  ${params.table}

  -- Optional Filter
  ${query.filter ? `WHERE ${query.filter}` : '' }

  -- Optional Group
  ${query.group ? `GROUP BY ${query.group}` : '' }

  -- Optional sort
  ${query.sort ? `ORDER BY ${query.sort}` : '' }

  -- Optional limit
  ${query.limit ? `LIMIT ${query.limit}` : '' }

  `
  // console.log(parsedQuery);
  return parsedQuery;
}

// route schema
const schema = {
  description: 'Query a table or view.',
  tags: ['emphasis-explorer'],
  summary: 'table query',
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
      default: '*'
    },
    filter: {
      type: 'string',
      description: 'Optional filter parameters for a SQL WHERE statement.'
    },
    sort: {
      type: 'string',
      description: 'Optional sort by column(s).'
    },
    limit: {
      type: 'integer',
      description: 'Optional limit to the number of output features.',
      default: 5000
    },
    group: {
      type: 'string',
      description: 'Optional column(s) to group by.'
    }
  }
}

// create route
module.exports = function (fastify, opts, next) {
  fastify.route({
    method: 'POST',
    url: '/emphasis-explorer/post-query/:table',
    schema: schema,
    handler: function (request, reply) {


      // console.log(request.body)


      if (request.query.filter) {
        request.query.filter +=  `and crashid IN ('${request.body.join(`','`)}')`;
      } else {
        request.query.filter = `crashid IN ('${request.body.join(`','`)}')`
      }
      
      fastify.pg.connect(onConnect)

      function onConnect(err, client, release) {
        if (err) return reply.send({
          "statusCode": 500,
          "error": "Internal Server Error",
          "message": "unable to connect to database server"
        })

        client.query(
          sql(request.params, request.query),
          function onResult(err, result) {
            release()
            reply.send(err || result.rows)
          }
        )
      }
    }
  })
  next()
}

module.exports.autoPrefix = '/v1'