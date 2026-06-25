const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");

const URLS = [
  "https://www.mapcn.dev/docs",
  "https://www.mapcn.dev/docs/installation",
  "https://www.mapcn.dev/docs/basic-map",
  "https://www.mapcn.dev/docs/api-reference",
  "https://www.mapcn.dev/docs/markers",
  "https://www.mapcn.dev/docs/routes",
  "https://www.mapcn.dev/docs/clusters",
  "https://www.mapcn.dev/docs/advanced-usage",
];

const OUTPUT_DIR = path.join(process.cwd(), "docs");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "mapcn-context.md");

function clean(text) {
  return text
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

async function extractPage(url) {
  try {
    console.log(`Fetching ${url}`);

    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        "User-Agent": "ShareMyRide-Docs-Collector",
      },
    });

    const $ = cheerio.load(response.data);

    $("script").remove();
    $("style").remove();
    $("noscript").remove();

    let content =
      $("main").text() ||
      $("article").text() ||
      $(".prose").text() ||
      $("body").text();

    content = clean(content);

    const title =
      $("h1").first().text().trim() ||
      $("title").text().trim() ||
      url;

    return {
      title,
      url,
      content,
    };
  } catch (err) {
    return {
      title: url,
      url,
      content: `FAILED TO FETCH: ${err.message}`,
    };
  }
}

async function run() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const pages = [];

  for (const url of URLS) {
    const page = await extractPage(url);
    pages.push(page);
  }

  const markdown = [
    "# mapcn Documentation Context",
    "",
    "Generated for ShareMyRide",
    "",
    "---",
    "",
    ...pages.flatMap((page) => [
      `# ${page.title}`,
      "",
      `Source: ${page.url}`,
      "",
      page.content,
      "",
      "---",
      "",
    ]),
  ].join("\n");

  fs.writeFileSync(OUTPUT_FILE, markdown, "utf8");

  console.log("");
  console.log(`Saved -> ${OUTPUT_FILE}`);
}

run();
