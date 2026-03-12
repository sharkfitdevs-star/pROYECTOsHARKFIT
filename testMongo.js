const mongoose = require('mongoose');

const uri = "mongodb://sharkfit_app:ipKrMceQNPCqWxG3@ac-y0qacoa-shard-00-00.kxa73ub.mongodb.net:27017,ac-y0qacoa-shard-00-01.kxa73ub.mongodb.net:27017,ac-y0qacoa-shard-00-02.kxa73ub.mongodb.net:27017/sharkfit?tls=true&retryWrites=true&w=majority&authSource=admin";

const opts = { useNewUrlParser: true, useUnifiedTopology: true, serverSelectionTimeoutMS:10000, connectTimeoutMS:10000 };

mongoose.connect(uri, opts)
  .then(() => { console.log('connected'); process.exit(0); })
  .catch(e => { console.error('error', e.message); process.exit(1); });
