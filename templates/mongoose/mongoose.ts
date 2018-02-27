import * as express from "express";
// NOTE mongoose cannot be imported because gives a type error. require instead.
const mongoose = require("mongoose");

mongoose.Promise = require("bluebird");
mongoose.set("debug", true);

// Not every definition is a mongoose model, just import those you need.
//<import-models>
//</import-models>

export default function (app: express.Application) {
  mongoose.connect(
    app.get("mongodb"),
    {
      promiseLibrary: require("bluebird"),
    },
    function(err) {
      if (err) {
        throw err;
      }

      console.log("connected to mongodb:", app.get("mongodb"));
    },
  );
}
// close the Mongoose connection when process ends
process.on('SIGINT', function() {
  mongoose.connection.close(function () {
    console.log('mongoose default connection disconnected through app termination');
  });
});
