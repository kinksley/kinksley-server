var mongoose = require('mongoose')
var MongooseUniqueValidator = require('mongoose-unique-validator')

var Schema = mongoose.Schema

var schema = new Schema({
  id: { type: Number, required: true, unique: true },
  auditTrail: { type: Array, 'default': [] }
}, { strict: false })

schema.plugin(MongooseUniqueValidator)

module.exports = mongoose.model('Model', schema)
