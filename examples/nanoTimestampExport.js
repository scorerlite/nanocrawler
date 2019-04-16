const fs = require("fs");
const util = require("util");
const redis = require("redis").createClient();
const scan = util.promisify(redis.scan).bind(redis);
const get = util.promisify(redis.get).bind(redis);

const stream = fs.createWriteStream("timestamps.csv");
const HASH_REGEX = /^block_timestamp\/([A-F0-9]{64})$/;

let nextCursor;
async function fetchNext(cursor) {
  console.log(`Fetching cursor ${cursor}`);
  const resp = await scan(
    cursor,
    "MATCH",
    "block_timestamp/*",
    "COUNT",
    "5000"
  );

  nextCursor = resp[0];
  const keys = resp[1];
  const done = nextCursor === "0";

  const outputString = await getTimestamps(keys);
  if (!stream.write(outputString, "utf-8") && !done) {
    stream.once("drain", () => fetchNext(nextCursor));
  } else if (!done) {
    fetchNext(nextCursor);
  } else {
    console.log("Done!");
    stream.end();
  }
}

async function getTimestamps(keys) {
  const filteredKeys = keys.filter(key => HASH_REGEX.test(key));

  return new Promise((resolve, reject) => {
    let returnValue = [];
    redis.multi(filteredKeys.map(key => ["get", key])).exec((err, replies) => {
      if (err) return resolve([]);

      filteredKeys.forEach((key, index) => {
        const hash = key.match(/^block_timestamp\/([A-F0-9]{64})/)[1];
        returnValue.push([hash, replies[index]].join(","));
      });

      resolve(`${returnValue.join("\n")}\n`);
    });
  });
}

fetchNext(0);
