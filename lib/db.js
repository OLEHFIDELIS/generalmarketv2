// Single place that builds the MongoDB connection string (used by server.js and scripts/)
module.exports.mongoUri = () =>
  `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASWORD}@cluster0.1fb4jph.mongodb.net/e-commerce`;
