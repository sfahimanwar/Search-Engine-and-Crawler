# README

Author: Sheikh Fahim Anwar

## Project Description

This project obtained a limited dataset of Wikipedia webpages by crawling and scraping the site which were then indexed, sorted and stored in a MongoDB database based on their calculated PageRank values. The project also implemented a REST API using Express.js to interface with a search engine developed using Elasticlunr.js to provide clients with indexed and ranked search results from the dataset.

## Technologies Used

- JavaScript
- Node.js/Express
- MongoDB/Mongoose
- Crawler.js
- Elasticlunr.js

## API Documentation

### `GET /wiki/:pageID`

This route is used to get a specific Wikipedia page.

#### Request

- Path Parameters
  - `pageID`: The page ID of the page to be retrieved

#### Response

- On success:
  - Status code: 200
  - Content: The page object as rendered by the `wiki-page` view

- On failure:
  - Status code: 404
  - Content: "Page does not exist"

### `GET /wiki`

This route is used to search for pages on Wikipedia.

#### Request

- Query Parameters
  - `q`: The search query
  - `boost`: A boolean value indicating whether to boost search results by their PageRank (default: `false`)
  - `limit`: The number of results to return (default: `10`, maximum: `50`)

#### Response

- On success:
  - Status code: 200
  - Content: A list of search results as rendered by the `search` view

## Mongoose Model for Wiki Pages

```javascript
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

const WikiPage = mongoose.model("WikiPage", pageSchema);

module.exports = WikiPage;
```

## Crawling Process

The crawling process starts by connecting to a MongoDB database using the `mongoose` library. A `Crawler` object is then created and used to crawl Wikipedia pages. The crawled pages are then stored in the database.

Once all pages are crawled, a `calcPagerank` function is called to calculate the PageRank values for each page. This function does the following:

1. Retrieves all pages from the database as an array of `Page` objects.
2. Iterates over the array of pages, and for each page it does another iteration to check if they link. This is done by checking the `incoming` and `outgoing` links arrays of each page.
3. If a page links to another page, a `1` is added to an adjacency matrix. Otherwise, a `0` is added to the matrix.
4. After all pages have been iterated over, the adjacency matrix is used to create a transition probability matrix. This is done by dividing each `1` in the matrix by the number of `1`'s in its row.
5. The transition probability matrix is then multiplied by a constant `1 - alpha`, and `alpha / N` is added to each element.
6. The resulting matrix is multiplied by an initial PageRank vector to get the PageRank values for each page. This multiplication is repeated until the PageRank values converge.
7. Once the PageRank values are calculated, they are stored in the database along with the other page data.

## How to Run the Project

1. Clone or download the project repository.
2. Open a terminal or command prompt and navigate to the project directory.
3. Run `npm install` to install all required dependencies.
4. Run `node server.js` to start the server.
5. Once the server is running, you can access the API by making requests to `localhost:3000`.
