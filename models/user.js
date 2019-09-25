var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
    name: String,
    sizeOnDisk: Number,
    empty:Boolean
} ,{ collection: 'user' });

module.exports = mongoose.model('user', userSchema);