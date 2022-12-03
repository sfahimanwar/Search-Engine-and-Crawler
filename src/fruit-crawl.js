const mongoose = require("mongoose");
const Crawler = require("crawler");
const { Matrix } = require("ml-matrix");
const euclidean = require("compute-euclidean-distance"); //Package to calculate Euclidean distance
const wordFrequency = require("words-frequency");
const Page = require("../models/fruit-models/page-model.js");
//const uri = "mongodb+srv://admin:root@cluster0.f3jy4.mongodb.net/fruitCrawl?retryWrites=true&w=majority";
const uri = "mongodb://127.0.0.1:27017/lab3";

let nextPageID = 0;
let db;

mongoose
  .connect(uri, { useNewUrlParser: true })
  .then(() => {
    console.log("Connected to DB successfully");
  })
  .catch((err) => {
    console.log("Connection error: " + err);
  });

db = mongoose.connection;

async function calcPagerank() {
  console.log("Calculating PageRank values for the fruit pages crawled");
  //Constants
  const N = 1000;
  const alpha = 0.1;

  //Initial PageRank vector
  let x0 = new Matrix([[1, 0, 0]]);

  //Adjacency matrix, will be N X N after calculation
  let adjMatrix = [];

  //Retrieves array of Page objects from MongoDB database
  let pages = await Page.find().lean().exec();

  //Iterates over all the pages, and for each page does another iteration to check if they link
  //by checking incoming and outgoing links array
  for (let i = 0; i < pages.length; i++) {
    let row = [];
    for (let j = 0; j < pages.length; j++) {
      if (
        pages[i].outgoing.includes(pages[j].url) ||
        pages[i].incoming.includes(pages[j].url)
      ) {
        row.push(1); // 1 if links
      } else {
        row.push(0); // 0 if it doesn't link
      }
    }
    //Adds a row to adjacency matrix for each page
    adjMatrix.push(row);
  }

  //Iterates over the adjacency matrix to check if a row contains 1
  for (let i = 0; i < adjMatrix.length; i++) {
    if (!adjMatrix[i].includes(1)) {
      //If it doesn't contain a 1 in the row, map function is used to replace all values in row to 1/N
      adjMatrix[i] = adjMatrix[i].map((x) => 1 / N);
    } else {
      //Uses the filter function create and array with just the 1's from the row and checks the length
      //to count the number of 1's in the row
      let count = adjMatrix[i].filter((x) => x === 1).length;
      //If the row contains 1's it will replace all 1's with 1/count
      adjMatrix[i] = adjMatrix[i].map((x) => {
        if (x === 1) {
          return 1 / count;
        } else {
          return x;
        }
      });
    }
  }

  //Transition Probability Matrix
  let P = new Matrix(adjMatrix);

  //Multiplies the transition probability matrix with 1-alpha and then adds alpha/N to it
  P = Matrix.mul(P, 1 - alpha);
  P = Matrix.add(P, alpha / N);

  //First iteration multiplication
  x0 = x0.mmul(P);

  //Continuously loops and multiplies the PageRank vector with the transition probability matrix
  // until the values converge
  while (true) {
    //Uses the compute-euclidean-distance package to calculate euclidean distance between the the most
    //recent and previous value. Breaks out of loop once euclidean distance is less than 0.0001
    let euclidDistance = euclidean(x0.to1DArray(), x0.mmul(P).to1DArray());
    if (euclidDistance < 0.0001) {
      break;
    }
    x0 = x0.mmul(P);
  }

  //Converts Matrix object to a 1D array
  let finalArray = x0.to1DArray();

  //console.log(finalArray.sort((a, b) => b - a).slice(0, 25));

  console.log("Calculation done, PageRank values are being added to DB");

  for (let i = 0; i < finalArray.length; i++) {
    let fruitPage = await Page.findOne().byID(i).exec();
    fruitPage.pagerank = finalArray[i];
    await fruitPage.save();
  }
  console.log("PageRank values have been added");
}

db.on("error", console.error.bind(console, "Console error: "));
db.on("open", () => {
  mongoose.connection.db
    .dropCollection("pages")
    .then(() => {
      console.log("Fruit pages dropped, crawling and reinitializing it.");

      const c = new Crawler({
        rateLimit: 100,
        skipDuplicates: true,
        callback: async function (error, res, done) {
          if (error) {
            console.log("Error while crawling");
          } else {
            let id = nextPageID++;
            let uri = res.request.uri.href;
            let $ = res.$;
            let outgoingLinks = $("a");
            let outgoingLinksArr = [];
            let pText = $("p").text();
            let title = $("title").text();
            $(outgoingLinks).each(function (i, link) {
              let href = $(link).attr("href");
              let string =
                "https://people.scs.carleton.ca/~davidmckenney/fruitgraph" +
                href.slice(1);
              outgoingLinksArr.push(string);
              c.queue(string);
            });
            let page = {
              pageID: id,
              title: title,
              url: uri,
              text: pText,
              outgoing: outgoingLinksArr,
            };
            page.wordFrequency = wordFrequency(page.text).data;
            await Page.create(page);
          }
          done();
        },
      });

      c.on("drain", async function () {
        console.log("Done crawling");
        console.log("Adding incoming links now");

        let numPages = await Page.countDocuments({}).exec();
        for (let i = 0; i < numPages; i++) {
          let outgoingPage = await Page.findOne().byID(i).exec();
          let outgoingLinks = outgoingPage.outgoing;
          for (let j = 0; j < outgoingLinks.length; j++) {
            let incomingPage = await Page.findOne()
              .byURL(outgoingLinks[j])
              .exec();
            incomingPage.incoming.push(outgoingPage.url);
            incomingPage.numIncoming += 1;
            await incomingPage.save();
          }
        }
        console.log("Incoming Links added");

        await calcPagerank();
      });

      c.queue(
        "https://people.scs.carleton.ca/~davidmckenney/fruitgraph/N-0.html"
      );
    })
    .catch((err) => {
      console.log("Error dropping database: " + err);
    });
});
