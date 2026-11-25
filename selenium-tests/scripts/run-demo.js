const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const rootDir = path.resolve(__dirname, "..");
const reportPath = path.join(rootDir, "reports", "selenium-report.html");
const mochaCli = path.join(rootDir, "node_modules", "mocha", "bin", "mocha.js");

const env = {
  ...process.env,
  SELENIUM_HEADLESS: "false",
  SELENIUM_DEMO_DELAY: process.env.SELENIUM_DEMO_DELAY || "700",
  SELENIUM_BASE_URL: process.env.SELENIUM_BASE_URL || "http://localhost:3000",
};

const args = [
  mochaCli,
  "tests/**/*.test.js",
  "--timeout",
  "60000",
  "--reporter",
  "mochawesome",
  "--reporter-options",
  "reportDir=reports,reportFilename=selenium-report,reportTitle=KKS College Chatbot - Selenium Test Report,reportPageTitle=KKS College Chatbot | Selenium Report,charts=true,inline=true,overwrite=true",
];

const result = spawnSync(process.execPath, args, {
  cwd: rootDir,
  env,
  stdio: "inherit",
});

const exitCode = typeof result.status === "number" ? result.status : 1;

if (fs.existsSync(reportPath)) {
  console.log(`\n[DEMO] Opening Mochawesome HTML report: ${reportPath}`);
  if (process.platform === "win32") {
    spawnSync("cmd", ["/c", "start", "", reportPath], { stdio: "ignore", windowsHide: true });
  } else if (process.platform === "darwin") {
    spawnSync("open", [reportPath], { stdio: "ignore" });
  } else {
    spawnSync("xdg-open", [reportPath], { stdio: "ignore" });
  }
} else {
  console.error(`[DEMO] Expected HTML report not found at ${reportPath}`);
}

process.exit(exitCode);
