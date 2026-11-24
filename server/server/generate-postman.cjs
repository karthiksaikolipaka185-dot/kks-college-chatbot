
const fs = require("fs");
const path = require("path");
const converter = require("openapi-to-postmanv2");

const swaggerPath = path.join(__dirname, "swagger.json");

const outputPath = path.join(
  __dirname,
  "..",
  "..",
  "postman",
  "KKS-College-Chatbot.postman_collection.json"
);

const swagger = JSON.parse(
  fs.readFileSync(swaggerPath, "utf8")
);

converter.convert(
  { type: "json", data: swagger },
  {},
  (err, result) => {
    if (err || !result.result) {
      console.error("Conversion failed:", err || result.reason);
      return;
    }

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    fs.writeFileSync(
      outputPath,
      JSON.stringify(result.output[0].data, null, 2)
    );

    console.log("Postman collection generated successfully!");
    console.log("Saved at:", outputPath);
  }
);
