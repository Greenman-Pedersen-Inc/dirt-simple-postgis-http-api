// route query
const sql = (params, query) => {
  var query = `
  SELECT ${query.columns}
  FROM geo_project

  -- filter by project number(s)
  ${query.project_id ? `WHERE projectnumber in ('${query.project_id.split(',').join('\',\'')}')` : '' }

  -- Optional Filter - if not project id is specified it should be a WHERE rather than an AND
  ${query.project_id ? (query.filter ? `AND ${query.filter}` : '') : (query.filter ? `WHERE ${query.filter}` : '') }

  -- Optional Group
  ${query.group ? `GROUP BY ${query.group}` : '' }

  -- Optional sort
  ${query.sort ? `ORDER BY ${query.sort}` : '' }

  -- Optional limit
  ${query.limit ? `LIMIT ${query.limit}` : '' }

  `
  // console.log(query);
  return query;
}

// route schema
const schema = {
  description: 'Query a table or view.',
  tags: ['api'],
  summary: 'table query',
  querystring: {
    project_id: {
      type: 'string',
      description: 'A project ID or list of project ID\'s.'
    },
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
      default: 100
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
    method: 'GET',
    url: '/projects',
    schema: schema,
    handler: function (request, reply) {
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
