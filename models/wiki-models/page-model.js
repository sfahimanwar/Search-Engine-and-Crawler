const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let pageSchema = new Schema({
  pageID: {
    type: Number,
  },
  title: {
    type: String,
  },
  url: {
    type: String,
  },
  text: {
    type: String,
  },
  outgoing: {
    type: [String],
  },
  incoming: {
    type: [String],
  },
  numIncoming: {
    type: Number,
    default: 0,
  },
  pagerank: {
    type: Number,
  },
  wordFrequency: {
    type: Object,
  },
});

pageSchema.query.byID = function (pageID) {
  return this.where("pageID").equals(pageID);
};

pageSchema.query.byURL = function (URL) {
  return this.where("url").equals(URL);
};

module.exports = mongoose.model("wikipages", pageSchema);
