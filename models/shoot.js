var mongoose = require('mongoose')
var MongooseUniqueValidator = require('mongoose-unique-validator')
var Schema = mongoose.Schema

var schema = new Schema({
  id: { type: Number, required: true, unique: true },
  models: { type: Array, 'default': [] },
  tags: { type: Array, 'default': [] },
  auditTrail: { type: Array, 'default': [] }
}, { strict: false })

schema.plugin(MongooseUniqueValidator)

module.exports = mongoose.model('Shoot', schema)
