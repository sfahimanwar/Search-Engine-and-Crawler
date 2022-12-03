const express = require("express");
const mongoose = require("mongoose");
const elasticlunr = require("elasticlunr");
const fruitPages = require("../models/fruit-models/page-model.js");
const wikiPages = require("../models/wiki-models/page-model.js");
const app = express();

let port = process.env.PORT || 3000;
const dbURI = "mongodb://127.0.0.1:27017/lab3";

app.use(express.static("../public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "pug");
app.set("views", "../views");

mongoose
  .connect(dbURI, { useNewUrlParser: true })
  .then(() => {
    console.log("Connected to DB successfully");
  })
  .catch((err) => {
    console.log("Connection error: " + err);
  });

let db = mongoose.connection;
db.on("error", console.error.bind(console, "Console error: "));

db.on("open", async () => {
  const fruitIndex = elasticlunr(function () {
    this.addField("title");
    this.addField("text");
    this.setRef("pageID");
  });

  const wikiIndex = elasticlunr(function () {
    this.addField("title");
    this.addField("text");
    this.setRef("pageID");
  });

  let results = await fruitPages.find().lean().exec();
  for (let i = 0; i < results.length; i++) {
    fruitIndex.addDoc(results[i]);
  }

  let wikiResults = await wikiPages.find().lean().exec();
  for (let i = 0; i < wikiResults.length; i++) {
    wikiIndex.addDoc(wikiResults[i]);
  }

  app.get("/", function (req, res) {
    res.render("home");
  });

  app.get("/fruits", async function (req, res) {
    let searchType = "fruits";
    let limit = 10;
    let isBoosted = false;
    let searchResults = [];
    let searchObjects = [];
    if (req.query.boost) {
      if (req.query.boost === "true") {
        isBoosted = true;
      }
      //console.log(isBoosted);
    }
    if (req.query.limit) {
      limit = req.query.limit;
      if (limit < 1 || limit > 50) {
        limit = 10;
      }
      //console.log(limit);
    }
    if (req.query.q) {
      //console.log("Querying with Elasticlunr");
      searchResults = fruitIndex.search(req.query.q, {});
      //console.log("Done searching Elasticlunr");
    }
    //console.log("Querying MongoDB and creating object");
    for (let i = 0; i < searchResults.length; i++) {
      let page = await fruitPages.findOne().byID(searchResults[i].ref);
      let pageObj = {
        pageID: page.pageID,
        url: page.url,
        title: page.title,
        pagerank: page.pagerank,
        score: searchResults[i].score,
      };
      searchObjects.push(pageObj);
    }
    //console.log("Done querying MongoDB");

    if (isBoosted) {
      //console.log("Boosting Results");
      for (let i = 0; i < searchObjects.length; i++) {
        searchObjects[i].score =
          searchObjects[i].score * searchObjects[i].pagerank;
      }
      //console.log("Done Boosting");
    }
    let toSend = searchObjects
      .sort((a, b) => {
        return b.score - a.score;
      })
      .slice(0, limit);

    let query = req.query.q;

    res.render("search", { toSend, query, limit, searchType });
  });

  app.get("/fruits/:pageID", async function (req, res) {
    let pageID = parseInt(req.params.pageID);
    if (pageID < 0 || pageID > 999) {
      res.status(404).send("Page does not exist");
    } else {
      let pageObj = await fruitPages.findOne().byID(pageID).lean().exec();
      //console.log(pageObj);
      res.render("fruit-page", { toSend: pageObj });
    }
  });

  app.get("/wiki/:pageID", async function (req, res) {
    let pageID = parseInt(req.params.pageID);
    if (pageID < 0 || pageID > 1000) {
      res.status(404).send("Page does not exist");
    } else {
      let pageObj = await wikiPages.findOne().byID(pageID).lean().exec();
      res.render("wiki-page", { toSend: pageObj });
    }
  });

  app.get("/wiki", async function (req, res) {
    let searchType = "wiki";
    let limit = 10;
    let isBoosted = false;
    let searchResults = [];
    let searchObjects = [];
    if (req.query.boost) {
      if (req.query.boost === "true") {
        isBoosted = true;
      }
      //console.log(isBoosted);
    }
    if (req.query.limit) {
      limit = req.query.limit;
      if (limit < 1 || limit > 50) {
        limit = 10;
      }
      //console.log(limit);
    }
    if (req.query.q) {
      //console.log("Querying with Elasticlunr");
      searchResults = wikiIndex.search(req.query.q, {});
      //console.log("Done searching Elasticlunr");
    }
    //console.log("Querying MongoDB and creating object");
    for (let i = 0; i < searchResults.length; i++) {
      let page = await wikiPages.findOne().byID(searchResults[i].ref);
      let pageObj = {
        pageID: page.pageID,
        url: page.url,
        title: page.title,
        pagerank: page.pagerank,
        score: searchResults[i].score,
      };
      searchObjects.push(pageObj);
    }
    //console.log("Done querying MongoDB");

    if (isBoosted) {
      //console.log("Boosting Results");
      for (let i = 0; i < searchObjects.length; i++) {
        searchObjects[i].score =
          searchObjects[i].score * searchObjects[i].pagerank;
      }
      //console.log("Done Boosting");
    }
    let toSend = searchObjects
      .sort((a, b) => {
        return b.score - a.score;
      })
      .slice(0, limit);

    let query = req.query.q;

    res.render("search", { toSend, query, limit, searchType });
  });

  app.listen(port);
  console.log("Server listening at http://localhost:3000");
});
