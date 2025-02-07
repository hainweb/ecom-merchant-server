const { MongoClient } = require('mongodb');
const state = { db: null };

module.exports.connect = async function (done) {
  const url = process.env.MONGO_URI;
  const dbname = 'shopping';  

  try {
    const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
    state.db = client.db(dbname);
    done();
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    done(err);
  }
};

module.exports.get = function () {
  return state.db;
};
