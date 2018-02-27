process.env.NODE_ENV = "test";
import test from "ava";
import { app } from "../src/";
import * as supertest from "supertest";
import * as qs from "qs";
import * as mongoose from "mongoose";

// this should be your first test when using mongoose
// this ensure database connection is up in less than 5s (more than enough)
// otherwise each test try to run for 60s (default) timeout and crash
// use it with ava --failt-fast to skip the rest when this fails

test.cb.serial("mongoose conection in 5s", t => {
  let done = false;
  mongoose.connection.addListener("connected", function() {
    done = true;
    t.end();
  });

  mongoose.connection.addListener("error", function(err) {
    t.fail(err.message)
    t.end();
  });

  mongoose.connection.on('disconnected', function () {
    console.error('Mongoose default connection disconnected');
  });

  setTimeout(() => {
    if (!done) {
      t.fail("mongoose connection timeout");
      t.end();
    }
  }, 5000);
});
