const axios = require("axios");
const cheerio = require("cheerio");
const { writeFileSync } = require("fs");
const createWriteStream = require("fs").createWriteStream;
const existsSync = require("fs").existsSync;
const readDir = require("fs").readdirSync;
const writeFile = require("fs").writeFileSync;

const OPTIFINE_URL = "https://optifine.net";
async function downloadFile(fileUrl, outputLocationPath) {
  const writer = createWriteStream(outputLocationPath);

  return axios({
    method: "get",
    url: fileUrl,
    responseType: "stream",
  }).then((response) => {
    //ensure that the user can call `then()` only when the file has
    //been downloaded entirely.

    return new Promise((resolve, reject) => {
      response.data.pipe(writer);
      let error = null;
      writer.on("error", (err) => {
        error = err;
        writer.close();
        reject(err);
      });
      writer.on("close", () => {
        if (!error) {
          resolve(true);
        }
        //no need to call the reject here, as it will have been called in the
        //'error' stream;
      });
    });
  });
}
async function main() {
  const htmlData = (await axios.get(OPTIFINE_URL + "/downloads")).data;
  const $ = cheerio.load(htmlData);
  const urls = $(".colDownload").toArray().map((x) => {
    return $(x).find("a").attr("href");
  });

  for (const url of urls) {
    const fileName = url.split("?f=")[1].split("&")[0];

    console.log(fileName);
    if (!existsSync(`files/${fileName}`)) {
      const hData = (await axios.get(url)).data;
      const $1 = cheerio.load(hData);
      const u = $1("#Download > a").attr("href");
      await downloadFile(`${OPTIFINE_URL}/${u}`, `files/${fileName}`);
    }
  }

  let manifest = {};
  const allMcVersions = Array.from(
    new Set([
      ...readDir("files")
        .filter((i) => i !== ".gitkeep" && i !== "manifest.json")
        .map((i) => i.replaceAll("preview_", ""))
        .map((i) => i.split("_")[1]),
    ]),
  );
  console.log(allMcVersions);
  allMcVersions.forEach((i) =>
    manifest[i] = [
      readDir("files")
        .filter((j) => j !== ".gitkeep" && j !== "manifest.json")
        .filter((j) => j.split("_")[1] === i || j.split("_")[2] === i),
    ]
  );

  writeFile("files/manifest.json", JSON.stringify(manifest, null, 2), {
    encoding: "utf8",
  });
}

main();
