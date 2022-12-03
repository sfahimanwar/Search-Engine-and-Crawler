let searchTextFruit = document.getElementById("searchTextFruit");
let numResultsFruit = document.getElementById("numResultsFruit");
let boostFruitsOption = document.getElementById("boostFruits");
let searchButtonFruit = document.getElementById("searchButtonFruit");

async function fruitSearch() {
  let searchQuery = searchTextFruit.value;
  let numResults = numResultsFruit.value;
  let isBoosted = boostFruitsOption.value;
  if (searchQuery.trim().length > 0) {
    window.location.href =
      "/fruits?q=" +
      searchQuery +
      "&boost=" +
      isBoosted +
      "&limit=" +
      numResults;
  }
}
if (searchButtonFruit != null) {
  searchButtonFruit.onclick = fruitSearch;
}

let searchTextWiki = document.getElementById("searchTextWiki");
let numResultsWiki = document.getElementById("numResultsWiki");
let boostWikiOption = document.getElementById("boostWiki");
let searchButtonWiki = document.getElementById("searchButtonWiki");

async function wikiSearch() {
  let searchQuery = searchTextWiki.value;
  let numResults = numResultsWiki.value;
  let isBoosted = boostWikiOption.value;
  if (searchQuery.trim().length > 0) {
    window.location.href =
      "/wiki?q=" + searchQuery + "&boost=" + isBoosted + "&limit=" + numResults;
  }
}
if (searchButtonWiki != null) {
  searchButtonWiki.onclick = wikiSearch;
}
