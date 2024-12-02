const csv = require("csv-parser");
const fs = require("fs");

/**
 * 
 * @param {string} file - Path to the CSV file
 * @returns {Promise<Array>} - Returns an array of domain names
 */


function getDomains(file) {
  return new Promise((resolve, reject) => {
    const domains = [];
    const readStream = fs.createReadStream(file).pipe(csv());

    readStream
      .on("data", (row) => {
        if (row.domain && row.id) {
          domains.push({ id: parseInt(row.id), domain: row.domain });
        }
      })
      .on("end", () => resolve(domains))
      .on("error", (err) => reject(err));
  });
}


module.exports = getDomains;
