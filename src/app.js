require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const morgan = require('morgan')
const app = express()
const mongoose = require('mongoose')

// data models
const Shoot = require('../models/shoot')
const Model = require('../models/model')

app.use(morgan('combined'))
app.use(bodyParser.json())
app.use(cors())

// mongoose.set('debug', true)

mongoose.connect(process.env.DB_HOST, {
  user: process.env.DB_USER,
  pass: process.env.DB_PASS,
  auth: { authdb: process.env.DB_AUTH }
})
var db = mongoose.connection
db.on('error', console.error.bind(console, 'connection error'))
db.once('open', function (callback) {
  console.log('MongoDB connection to ' + process.env.DB_HOST + ' succeeded')
})

app.get('/', (req, res) => {
  res.send('Nothing here.')
})

// Fetch all shooots
app.get('/shoots', (req, res) => {
  console.log('\n Query: \n')
  console.log(req.query)

  var filter = { $and: [{ status: 'online' }] }

  // model filter | todo: handle an array of multiple

  if (req.query.modelId) {
    filter.$and.push({ 'models.id': Number(req.query.modelId) })
  }

  // orientation tags

  if (req.query.tags && req.query.tags.length > 0) {
    if (req.query.tags.indexOf('straight') > -1) {
      filter.$and.push({ tags: { $ne: 'gay' } })
    } else if (req.query.tags.indexOf('gay') > -1) {
      filter.$and.push({ tags: { $ne: 'straight' } })
    }
  }

  // if searching for title, all other filters are disregarded
  if (req.query.title && req.query.title !== '') {
    filter.$text = { $search: req.query.title }
  } else {
    // tags

    if (req.query.tags && req.query.tags.length > 0) {
      for (const tag of req.query.tags) {
        filter.$and.push({ tags: tag })
      }
    }

    // sitenames

    if (req.query.siteNames && req.query.siteNames.length > 0) {
      filter.$or = []

      for (const siteName of req.query.siteNames) {
        filter.$or.push({ siteName: siteName })
      }
    }
  }

  // sorts

  var sortQuery = {}

  if (req.query.sortBy === 'rating') {
    filter.$and.push({ 'rating.avgRating': { $ne: NaN } }) // todo: unrated should be included, just at the bottom
    sortQuery = { 'rating.avgRating': Number(req.query.sortOrder), 'rating.numRatings': Number(req.query.sortOrder) }
  } else if (req.query.sortBy === 'votes') {
    filter.$and.push({ 'rating.avgRating': { $ne: NaN } })
    sortQuery = { 'rating.numRatings': Number(req.query.sortOrder) }
  } else if (req.query.sortBy === 'date') {
    sortQuery = { 'date': Number(req.query.sortOrder) }
  } else {
    sortQuery = { 'title': Number(req.query.sortOrder) }
  }

  // console.log('Filter: \n')
  // console.log(JSON.stringify(filter))
  // console.log('\n')

  // Shoot.find(filter)
  //   .skip(Number(req.query.skip))
  //   .limit(12)
  //   .sort(sortQuery)
  //   .lean()
  //   .exec(function (error, shoots) {
  //     if (error) { console.error(error) }
  //     res.send({
  //       shoots: shoots
  //     })
  //   })

  Shoot.aggregate()
    .match(filter)
    .sort(sortQuery)
    .skip(Number(req.query.skip))
    .limit(12)
    .lookup({
      'localField': 'models',
      'from': 'models',
      'foreignField': 'id',
      'as': 'models'
    })
    .exec(function (error, shoots) {
      if (error) { console.error(error) }
      res.send({
        shoots: shoots
      })
    })
})

app.get('/tags', (req, res) => {
  Shoot.aggregate([
    { $project: { tags: 1 } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]
  ).exec(function (error, tags) {
    if (error) { console.error(error) }
    res.send({
      tags: tags
    })
  })
})

app.get('/sites', (req, res) => {
  Shoot.aggregate([
    { $project: { siteName: 1 } },
    { $unwind: '$siteName' },
    { $group: { _id: '$siteName', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]
  ).exec(function (error, sites) {
    if (error) { console.error(error) }
    res.send({
      sites: sites
    })
  })
})

app.get('/models', (req, res) => {
  var filter = req.query.filter ? req.query.filter : {}
  var fields = req.query.fields ? req.query.fields : {}
  var sortQuery = req.query.sort ? req.query.sort : {}

  if (req.query.id) {
    if (filter.$and) {
      filter.$and.push({ id: Number(req.query.id) })
    } else {
      filter.$and = [{ id: Number(req.query.id) }]
    }
  }

  // todo: use querystring

  if (typeof fields === 'string') {
    var fieldsArray = fields.split(',')
    fields = {}
    for (const field of fieldsArray) {
      fields[field] = 1
    }
  }

  fields._id = false
  fields.__v = false

  console.log(req.query)
  // console.log(fields);

  Model.find(filter)
  // .collation({
  //     locale: 'en_US',
  //     strength: 3
  // })
    .sort(sortQuery)
    .limit(12)
    .select(fields)
    .lean()
    .exec(function (error, models) {
      if (error) { console.error(error) }
      res.send({
        models: models
      })
    })
})

console.log('Will be listening on port ' + (process.env.PORT || 8081))

app.listen(process.env.PORT || 8081)
