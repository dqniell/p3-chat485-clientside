// See here for the documentation on configuring Cypress:
// https://docs.cypress.io/guides/references/configuration

import { defineConfig } from "cypress";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { execFile as execFileCallback } from "node:child_process";
import { plugin as cypressGrepPlugin } from "@cypress/grep/plugin";

const execFile = promisify(execFileCallback);

// This is the default timeout for DOM-based commands. Any time a test queries for something
// in the DOM, Cypress will wait this number of milliseconds before timing out.
// If these tests are being run on the autograder or in CI (e.g. GitHub Actions), wait a
// longer amount of time, since those environments are slower than a developer laptop.
const defaultCommandTimeout =
  existsSync("/home/autograder/working_dir") || process.env.CI === "true"
    ? 8000
    : 4000;

// Wrapping the config object in defineConfig helps code editors with automatic code completion.
export default defineConfig({
  // Set the default command timeout value based on whether the machine running tests is
  // the autograder or not.
  defaultCommandTimeout,

  // Set the folders that Cypress uses to store fixtures, screenshots, videos, and downloads
  fixturesFolder: "tests/cypress/fixtures",
  screenshotsFolder: "tests/cypress/screenshots",
  videosFolder: "tests/cypress/videos",
  downloadsFolder: "tests/cypress/downloads",

  // Enable video recordings when tests are run in headless mode.
  video: true,

  // Configure end-to-end tests.
  e2e: {
    // The baseUrl is used as a global prefix for the cy.request() and cy.visit() commands.
    // This way, cy.visit("/") will navigate to http://localhost:8000/.
    baseUrl: "http://localhost:8000/",

    // Set the patterns that Cypress uses to identify the support file and spec files.
    supportFile: "tests/cypress/support/e2e.{js,jsx,ts,tsx}",
    specPattern: "tests/cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",

    // setupNodeEvents() allows us to modify Cypress's behavior. It registers listeners on
    // different "events" and dynamically modifies this configuration.
    setupNodeEvents(on, config) {
      // Set up the @cypress/grep plugin. This will modify the config object.
      cypressGrepPlugin(config);

      // The object methods passed into on("task", {}) are functions we can call using
      // cy.task() that execute arbitrary Node.js code.
      on("task", {
        // When a test runs cy.task("seedDb"), run `./bin/chat485db` from the directory
        // Cypress was initially run in, which should be the solution directory.
        seedDb() {
          const executable = path.join(process.env.PWD, "bin/chat485db");
          return execFile(executable, ["reset"], {
            cwd: process.env.PWD,
          });
        },
      });

      // Return the new config object so that Cypress knows we dynamically modified the original.
      return config;
    },
  },

  // Disable the deprecated Cypress.env() API.
  allowCypressEnv: false,

  // Set environment variables every time Cypress runs.
  expose: {
    // When we use `cypress run` on the CLI, if we filter tests with pattern matching, tell
    // Cypress to completely ignore tests that don't match the pattern. By default they
    // would appear to be "skipped."
    grepOmitFiltered: true,

    // When we use `cypress run` on the CLI, if we filter tests with pattern matching, tell
    // Cypress to ignore spec files that don't have any tests which match the pattern. By
    // default, every spec would execute.
    grepFilterSpecs: true,
  },
});
