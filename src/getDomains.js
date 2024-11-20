// getDomains.js
const csv = require("csv-parser");
const fs = require("fs");

/**
 * 
 * @param {string} file - 
 * @returns {Promise<Array>}
 */
function getDomains(file) {
  return new Promise((resolve, reject) => {
    const domains = [];
    const readStream = fs.createReadStream(file).pipe(csv());

    readStream
      .on("data", (row) => {
        if (row.domain) {
          domains.push(row.domain);
        }
      })
      .on("end", () => resolve(domains))
      .on("error", (err) => reject(err));
  });
}

module.exports = getDomains;
