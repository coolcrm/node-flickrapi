var fs = require("fs"),
    download = require("./download"),
    getSetMetadata = require("./sets"),
    JSON = require("./PJSON"),
    photos = [];

/**
 * Given a photo object, get its info (either from
 * flickr, or from .json file if we already have it)
 * and get all the associated photographs.
 */
function fetchPhotoMetadata(flickr, photo, next) {
  var id = photo.id,
      secret = photo.secret,
      filename = "data/ia/photos/"+id+".json";

  if(fs.existsSync(filename)) {
    photo = JSON.parse(fs.readFileSync(filename));
    return download(photo, next);
  }

  flickr.photos.getInfo({
    photo_id: id,
    secret: secret
  }, function(error, result) {
    if(error) {
      console.log(photo_idx + " returned a query error");
      return console.log(error);
    }
    var photo = result.photo;

    if(!photo) {
      console.log(photo_idx + " is somehow not a photo");
      return console.log(result);
    }

    // TODO: get all comments and notes

    fs.writeFile(filename, JSON.prettyprint(photo), function() {
      return download(photo, next);
    });
  });
}

/**
 * Photographs
 */
function processPhotos(flickr, photo_idx, total) {
  if(photo_idx >= total) {
    console.log("done downloading photo metadata.");
    return setTimeout(function() {
      getSetMetadata(flickr);
    }, 1);
  }

  var photo = photos[photo_idx],
      method = "flickr.photos.getInfo",
      next = (function(flickr, photo_idx, total) {
        var next_idx = photo_idx + 1;
        return function() {
          setTimeout(function() {
            processPhotos(flickr, next_idx, total);
          }, 1);
        };
      }(flickr, photo_idx, total));

  if(!photo) {
    console.log("for some reason, photo " + photo_idx + " is undefined...");
    return next();
  }

  console.log("photo " + photo_idx + ": " + photo.id);
  fetchPhotoMetadata(flickr, photo, next);
}


// this function grabs all photo definitions from Flickr
function aggregatePhotos(flickr, user_id, per_page, page, tally, total) {
  if(tally >= total) {
    console.log("done fetching photo information from Flickr.");
    setTimeout(function() {
      processPhotos(flickr, 0, total);
    }, 1);
    return;
  }

  flickr.photos.search({
    user_id: user_id,
    per_page: per_page,
    page: page
  }, function(error, result) {
    var batch = result.photos.photo;
    tally += batch.length;
    console.log("stored "+tally+"/" + total + " photo records");
    photos = photos.concat(batch);
    aggregatePhotos(flickr, user_id, per_page, page+1, tally, total);
  });
}

/**
 * export just this function
 */
module.exports = aggregatePhotos;