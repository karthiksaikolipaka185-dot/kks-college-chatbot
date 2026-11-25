const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.SELENIUM_BASE_URL || "http://localhost:3000";
const SCREENSHOT_DIR = path.join(__dirname, "..", "screenshots");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function saveScreenshot(driver, fileName) {
  ensureDir(SCREENSHOT_DIR);
  const data = await driver.takeScreenshot();
  const target = path.join(SCREENSHOT_DIR, fileName);
  fs.writeFileSync(target, data, "base64");
  return target;
}

describe("KKS College Chatbot — Selenium Browser Test Suite", function () {
  this.timeout(30000);
  let driver;

  before(async function () {
    ensureDir(SCREENSHOT_DIR);
    const options = new chrome.Options();
    options.addArguments(
      "--headless=new",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--window-size=1366,768"
    );

    driver = await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(options)
      .build();
  });

  afterEach(async function () {
    if (driver && this.currentTest && this.currentTest.state === "failed") {
      const safeName = this.currentTest.title.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
      await saveScreenshot(driver, `fail-${safeName}.png`);
    }
  });

  after(async function () {
    if (driver) {
      await driver.quit();
    }
  });

  it("1. Verify homepage loads successfully", async function () {
    await driver.get(`${BASE_URL}/`);
    const root = await driver.wait(until.elementLocated(By.id("root")), 10000);
    const text = await root.getText();
    assert.ok(text.length > 0, "Expected #root to render application content");
  });

  it("2. Verify page title and expected application branding", async function () {
    await driver.get(`${BASE_URL}/`);
    await driver.wait(until.titleIs("KKS"), 10000);
    const brand = await driver.wait(
      until.elementLocated(By.xpath("//nav//span[contains(., 'KKS UNIVERSITY')]")),
      10000
    );
    assert.strictEqual(await brand.isDisplayed(), true);
  });

  it("3. Verify navigation to the login page", async function () {
    await driver.get(`${BASE_URL}/`);
    const loginLink = await driver.wait(
      until.elementLocated(By.css('nav a[href="/login"]')),
      10000
    );
    await loginLink.click();
    await driver.wait(until.urlContains("/login"), 10000);
    const heading = await driver.wait(
      until.elementLocated(By.xpath("//h1[contains(., 'Welcome Back')]")),
      10000
    );
    assert.strictEqual(await heading.isDisplayed(), true);
  });

  it("4. Verify login form fields are visible", async function () {
    await driver.get(`${BASE_URL}/login`);
    const emailInput = await driver.wait(until.elementLocated(By.css('input[type="email"]')), 10000);
    const passwordInput = await driver.wait(until.elementLocated(By.css('input[type="password"]')), 10000);
    const submitBtn = await driver.wait(until.elementLocated(By.css('button[type="submit"]')), 10000);
    assert.strictEqual(await emailInput.isDisplayed(), true);
    assert.strictEqual(await passwordInput.isDisplayed(), true);
    assert.strictEqual(await submitBtn.isDisplayed(), true);
  });

  it("5. Verify empty login form validation", async function () {
    await driver.get(`${BASE_URL}/login`);
    const submitBtn = await driver.wait(until.elementLocated(By.css('button[type="submit"]')), 10000);
    await submitBtn.click();
    const toastMsg = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(), 'Please fill in all fields')]")),
      10000
    );
    await driver.wait(until.elementIsVisible(toastMsg), 5000);
    assert.strictEqual(await toastMsg.isDisplayed(), true);
    assert.ok((await driver.getCurrentUrl()).includes("/login"));
  });

  it("6. Verify invalid login email input validation without backend spam", async function () {
    await driver.get(`${BASE_URL}/login`);
    const emailInput = await driver.wait(until.elementLocated(By.css('input[type="email"]')), 10000);
    const passwordInput = await driver.wait(until.elementLocated(By.css('input[type="password"]')), 10000);
    const submitBtn = await driver.wait(until.elementLocated(By.css('button[type="submit"]')), 10000);
    await emailInput.sendKeys("not-a-valid-email");
    await passwordInput.sendKeys("Password123!");
    await submitBtn.click();
    const isValid = await driver.executeScript("return arguments[0].checkValidity();", emailInput);
    assert.strictEqual(isValid, false);
    assert.ok((await driver.getCurrentUrl()).includes("/login"));
  });

  it("7. Verify navigation to the registration page", async function () {
    await driver.get(`${BASE_URL}/login`);
    const signupLink = await driver.wait(
      until.elementLocated(By.css('a[href="/signup"]')),
      10000
    );
    await signupLink.click();
    await driver.wait(until.urlContains("/signup"), 10000);
    const heading = await driver.wait(
      until.elementLocated(By.xpath("//h1[contains(., 'Create Account')]")),
      10000
    );
    assert.strictEqual(await heading.isDisplayed(), true);
  });

  it("8. Verify registration form validation without creating an account", async function () {
    await driver.get(`${BASE_URL}/signup`);
    const submitBtn = await driver.wait(until.elementLocated(By.css('button[type="submit"]')), 10000);
    await submitBtn.click();
    const toastMsg = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(), 'Please fill in required fields')]")),
      10000
    );
    await driver.wait(until.elementIsVisible(toastMsg), 5000);
    assert.strictEqual(await toastMsg.isDisplayed(), true);
    assert.ok((await driver.getCurrentUrl()).includes("/signup"));
  });

  it("9. Verify protected feature redirects unauthenticated users to login", async function () {
    await driver.get(`${BASE_URL}/`);
    const voiceBtn = await driver.wait(
      until.elementLocated(By.css('button[aria-label="Talk to KKS AI Voice Counselor"]')),
      10000
    );
    await voiceBtn.click();
    await driver.wait(until.urlContains("/login"), 10000);
    assert.ok((await driver.getCurrentUrl()).includes("/login"));
  });

  it("10. Verify unknown route fallback, responsive layout, and capture evidence screenshot", async function () {
    await driver.get(`${BASE_URL}/nonexistent-evaluation-route`);
    await driver.wait(until.elementLocated(By.css("nav")), 10000);
    const currentUrl = await driver.getCurrentUrl();
    assert.strictEqual(currentUrl.replace(/\/$/, ""), BASE_URL.replace(/\/$/, ""));

    await saveScreenshot(driver, "homepage-verified.png");

    await driver.manage().window().setRect({ width: 375, height: 812 });
    const mobileBtn = await driver.wait(
      until.elementLocated(By.css("nav button.md\\:hidden")),
      10000
    );
    assert.strictEqual(await mobileBtn.isDisplayed(), true);
    await driver.manage().window().setRect({ width: 1366, height: 768 });
  });
});
