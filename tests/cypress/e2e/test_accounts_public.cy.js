// This is a Cypress spec. Each describe() block is a group of tests.
// Each it() block is a single test.

describe("Login and logout", () => {
  beforeEach(() => {
    cy.task("seedDb");
  });

  it("Logs in via the UI and then logs out on normal server", () => {
    // Intercept calls to the /api/v1/conversations/ route and store a Route
    // Alias called getConversations. Later, we can refer to requests to this
    // route using getConversations.
    cy.intercept("GET", "/api/v1/conversations/").as("getConversations");

    // Go to the home page.
    cy.visit("/");

    // Verify that a request was made to /api/v1/conversations/.
    cy.wait("@getConversations");

    // Not logged in: "Log in" button should be visible, no settings button.
    cy.get('[data-cy="login-btn"]').should("be.visible");
    cy.get('[data-cy="settings-btn"]').should("not.exist");

    // Open the login modal.
    cy.get('[data-cy="login-btn"]').click();
    cy.get('[data-cy="login-modal"]').should("be.visible");

    // Set up intercept before submitting — login triggers window.location.reload().
    cy.intercept("GET", "/api/v1/conversations/").as(
      "getConversationsAfterLogin",
    );

    // Fill in credentials and submit.
    cy.get('[data-cy="login-email"]').type("awdeorio@umich.edu");
    cy.get('[data-cy="login-password"]').type("chickens");
    cy.get('[data-cy="login-modal"] button[type="submit"]').click();

    // Wait for the page to reload and conversations to load.
    cy.wait("@getConversationsAfterLogin");

    // Logged in: user's full name and settings button should be visible.
    cy.get('[data-cy="user-menu-name"]').should("contain", "Andrew DeOrio");
    cy.get('[data-cy="settings-btn"]').should("be.visible");
    cy.get('[data-cy="login-btn"]').should("not.exist");

    // Open settings modal and log out.
    cy.get('[data-cy="settings-btn"]').click();
    cy.get('[data-cy="settings-modal"]').should("be.visible");

    // Set up intercept before clicking logout — logout triggers window.location.reload().
    cy.intercept("GET", "/api/v1/conversations/").as(
      "getConversationsAfterLogout",
    );

    // Log out via settings modal.
    cy.get('[data-cy="settings-logout-btn"]').click();

    // Wait for the page to reload and conversations to load.
    cy.wait("@getConversationsAfterLogout");

    // Logged out: "Log in" button should be visible again.
    cy.get('[data-cy="login-btn"]').should("be.visible");
    cy.get('[data-cy="settings-btn"]').should("not.exist");
  });
});
