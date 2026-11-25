# Selenium Browser Testing — KKS College Chatbot

## What is Selenium?
Selenium WebDriver is a browser automation framework that controls a real web browser (Google Chrome) programmatically to verify UI rendering, navigation, forms, and user flows end-to-end.

## Why We Use It
Unit tests and Postman API tests verify backend logic and HTTP responses, whereas Selenium verifies the live React + Nginx frontend in a real browser (`http://localhost:3000`).

## Installation
```bash
cd selenium-tests
npm install
```
*(Uses `selenium-webdriver` v4 with built-in Selenium Manager to automatically resolve a matching ChromeDriver for Google Chrome in headless mode.)*

## Running Tests
Ensure the Docker Compose stack is running at `http://localhost:3000`, then run:
```bash
cd selenium-tests
npm run test:ci
```
Optional custom target URL:
```bash
set SELENIUM_BASE_URL=http://localhost:3000
npm run test:ci
```

## Implemented Test Cases (10)
1. **Homepage Load**: Verifies `#root` renders non-empty content at `/`.
2. **Title & Branding**: Verifies `document.title === "KKS"` and navbar displays `KKS UNIVERSITY`.
3. **Navigate to Login**: Clicks `Login` in navbar and verifies `/login` (`Welcome Back`).
4. **Login Form Visibility**: Verifies email, password, and `Sign In` button are visible.
5. **Empty Login Validation**: Submits empty form and verifies `"Please fill in all fields"` toast.
6. **Invalid Email Validation**: Enters malformed email and verifies HTML5 validation blocks submission without backend spam.
7. **Navigate to Registration**: Clicks `Sign Up` link and verifies `/signup` (`Create Account`).
8. **Empty Registration Validation**: Submits empty signup form and verifies `"Please fill in required fields"` without creating an account.
9. **Protected Feature Redirect**: Clicks Voice AI button while unauthenticated and verifies redirect to `/login`.
10. **Fallback Route & Responsive Layout**: Verifies unknown routes redirect to `/`, captures `homepage-verified.png`, and checks mobile hamburger menu at `375x812`.

## Reports & Screenshots
- **JUnit XML Report**: `selenium-tests/reports/selenium-results.xml`
- **Success Evidence Screenshot**: `selenium-tests/screenshots/homepage-verified.png`
- **Failure Screenshots**: Automatically saved as `selenium-tests/screenshots/fail-<test_name>.png`

## Jenkins Integration
Integrated into the root `Jenkinsfile` as a deployment-gated stage (`Selenium UI Testing`) after `Post-Deployment Smoke Tests` and `Newman API Regression Testing`. JUnit results are published via `junit` and screenshots are archived via `archiveArtifacts` before `cleanWs`.
