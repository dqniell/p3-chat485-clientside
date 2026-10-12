// ***********************************************
// This file is for creating custom commands and
// overwriting existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//

// Create a cy.login() command which takes two arguments, `email` and `password`.
Cypress.Commands.add("login", (email, password) => {
  // Create a session that uses the email and password as a cache ID. Cypress will restore this
  // session in later tests to avoid repeatedly logging in during each test.
  // See here for more info: https://docs.cypress.io/api/commands/session
  cy.session(
    [email, password],
    () => {
      cy.request({
        method: "POST",
        url: "/api/v1/accounts/sessions",
        body: {
          email,
          password,
        },
      })
        .its("status")
        .should("eq", 200);
    },
    {
      // Use this validate function when the session is restored to ensure that the test
      // is actually logged in.
      validate() {
        cy.request("/api/v1/accounts/sessions/me").its("status").should("eq", 200);
      },
      // Cache this session even for tests in a different file.
      cacheAcrossSpecs: true,
    }
  );
});
