// Public Cypress spec.  Pins the `data-cy=` attributes that the
// autograder's hidden tests look up.  If a student forgets to add one
// or renames a value, this test fails before any private test does.
//
// Reading a failure
// -----------------
// Each it() block lists the `data-cy` values it checks in its name.
// Within the block, cy.log() prints "Checking <selector> — <hint>"
// before every assertion.  When a value is missing, Cypress prints
// both the it() name and "Expected to find element: <selector>", and
// the most recent cy.log line in the runner / video tells you which UI
// area to fix.
//
// Maintenance contract
// --------------------
// This test must stay in sync with:
//
//   1. The hidden Cypress tests in autograder/cypress/e2e/*_private.cy.js,
//      whose `cy.get()` arguments are the selector universe that grades
//      student work.
//   2. The "CSS selector contract" section in docs/README.md, which is
//      the human-readable counterpart students read.
//   3. Any `data-cy=` value named in solution/chat485/js/*.jsx.
//
// When you add, rename, or remove a `data-cy` value in the solution OR
// a hidden test, update this spec and the spec contract section in the
// same change.  See AGENTS.md.

// Helper: log a hint about what this attribute is for, then assert an
// element with the matching `data-cy` exists.  cy.log lines appear in
// the Cypress runner UI and in the recorded video, so a failure on the
// cy.get call right after it makes clear which component the student
// should look at.
function check(name, hint) {
  cy.log(`Checking \`[data-cy="${name}"]\` — ${hint}`);
  cy.get(`[data-cy="${name}"]`).should("exist");
}

describe("Public DOM selector contract", () => {
  beforeEach(() => {
    cy.task("seedDb");
  });

  // -----------------------------------------------------------------
  // Anonymous (logged-out) page
  // -----------------------------------------------------------------

  describe("Anonymous landing page", () => {
    beforeEach(() => {
      cy.intercept("GET", "/api/v1/conversations/").as("getConversations");
      cy.visit("/");
      cy.wait("@getConversations");
    });

    it("Banner exposes login-btn, banner-login-btn, banner-signup-btn", () => {
      check("login-btn", "shown when logged out; opens login modal");
      check("banner-login-btn", "banner button in upper right (logged out)");
      check("banner-signup-btn", "banner button in upper right (logged out)");
    });

    it("Login modal exposes login-modal, login-email, login-password, submit button, login-switch", () => {
      cy.get('[data-cy="banner-login-btn"]').click();
      check("login-modal", "modal container — login-modal.jsx");
      check("login-email", "Email field inside the login modal");
      check("login-password", "Password field inside the login modal");
      cy.log("Checking submit button inside the login modal");
      cy.get('[data-cy="login-modal"] button[type="submit"]').should("exist");
      check("login-switch", "the 'Sign up' / 'Log in' link to toggle modes");
    });

    it("Signup modal additionally exposes login-name", () => {
      cy.get('[data-cy="banner-signup-btn"]').click();
      check("login-modal", "signup re-uses the same login-modal container");
      check("login-name", "Name field — only present in signup mode");
    });

    it("Failed login surfaces login-error", () => {
      cy.get('[data-cy="banner-login-btn"]').click();
      cy.get('[data-cy="login-email"]').type("nobody@umich.edu");
      cy.get('[data-cy="login-password"]').type("wrong");
      cy.get('[data-cy="login-modal"] button[type="submit"]').click();
      check("login-error", "inline error message after a failed login");
    });
  });

  // -----------------------------------------------------------------
  // Anonymous chat page (sidebar, message list, chat error)
  //
  // These selectors don't depend on being logged in — they only need
  // a conversation to exist.  Creating one anonymously avoids a login
  // round trip and decouples the selector contract from seed data.
  // -----------------------------------------------------------------

  describe("Anonymous chat page", () => {
    beforeEach(() => {
      cy.intercept("GET", "/api/v1/conversations/").as("getConversations");
      cy.visit("/");
      cy.wait("@getConversations");
    });

    it("Sidebar exposes conversation-list, conversation-item, new-conversation-btn, delete-conversation-btn", () => {
      // Create one conversation so conversation-item and
      // delete-conversation-btn render.
      cy.intercept("POST", "/api/v1/conversations/").as("createConversation");
      cy.get('[data-cy="new-conversation-btn"]').click();
      cy.wait("@createConversation");

      check("conversation-list", "sidebar container — conversation-list.jsx");
      check(
        "conversation-item",
        "each row in the sidebar (one per conversation)",
      );
      check("new-conversation-btn", "the 'New chat' button in the sidebar");
      check(
        "delete-conversation-btn",
        "per-row delete control on each conversation item",
      );
    });

    it("Selecting a conversation exposes message-list, message-user, message-assistant, message-content, message-input, message-input textarea, message-input submit, model-selector", () => {
      // Create a conversation; clicking "New chat" navigates into it,
      // so message-input renders without an extra click.
      cy.intercept("POST", "/api/v1/conversations/").as("createConversation");
      cy.get('[data-cy="new-conversation-btn"]').click();
      cy.wait("@createConversation");

      // Send a message so message-user and message-assistant both
      // render (echo-1 always replies).
      cy.get('[data-cy="message-input"] textarea').type("hello");
      cy.get('[data-cy="message-input"] button[type="submit"]').click();
      cy.get('[data-cy="message-assistant"]').should("exist");

      check("message-list", "scrollable message container — message-list.jsx");
      check("message-user", "user-role message bubble");
      check("message-assistant", "assistant-role message bubble");
      check("message-content", "text/Markdown body inside a message bubble");
      check("message-input", "container at the bottom — message-input.jsx");
      cy.log("Checking textarea inside [data-cy=message-input]");
      cy.get('[data-cy="message-input"] textarea').should("exist");
      cy.log("Checking submit button inside [data-cy=message-input]");
      cy.get('[data-cy="message-input"] button[type="submit"]').should("exist");
      check("model-selector", "model picker <select> — message-input.jsx");
    });

    it("Failed chat POST surfaces message-error", () => {
      // Force the next POST to /messages/ to fail with 502.
      cy.intercept(
        {
          method: "POST",
          url: /\/api\/v1\/conversations\/[a-f0-9-]+\/messages\//,
          times: 1,
        },
        { statusCode: 502, body: { status_code: 502, message: "Bad Gateway" } },
      );

      // Create a conversation; clicking "New chat" navigates into it.
      cy.intercept("POST", "/api/v1/conversations/").as("createConversation");
      cy.get('[data-cy="new-conversation-btn"]').click();
      cy.wait("@createConversation");

      cy.get('[data-cy="message-input"] textarea').type("trigger error");
      cy.get('[data-cy="message-input"] button[type="submit"]').click();
      check("message-error", "error bubble after a failed chat completion");
    });
  });

  // -----------------------------------------------------------------
  // Logged-in chat page (header)
  //
  // user-menu-name and settings-btn only render when authenticated,
  // so this contract test is the one place where login is required.
  // -----------------------------------------------------------------

  describe("Logged-in chat page", () => {
    beforeEach(() => {
      cy.login("awdeorio@umich.edu", "chickens");
      cy.intercept("GET", "/api/v1/conversations/").as("getConversations");
      cy.visit("/");
      cy.wait("@getConversations");
    });

    it("Chat header exposes user-menu-name, settings-btn", () => {
      check("user-menu-name", "user's full name shown in the user menu");
      check("settings-btn", "button that opens the Settings modal");
    });
  });

  // -----------------------------------------------------------------
  // Settings modal
  // -----------------------------------------------------------------

  describe("Settings modal", () => {
    beforeEach(() => {
      cy.login("awdeorio@umich.edu", "chickens");
      cy.intercept("GET", "/api/v1/conversations/").as("getConversations");
      cy.visit("/");
      cy.wait("@getConversations");
      cy.get('[data-cy="settings-btn"]').click();
      cy.get('[data-cy="settings-modal"]').should("be.visible");
    });

    it("Modal exposes settings-modal, settings-close-btn, settings-logout-btn, settings-name", () => {
      check("settings-modal", "modal container — settings-modal.jsx");
      check("settings-close-btn", "button that closes the modal");
      check("settings-logout-btn", "Log out button inside the modal");
      check("settings-name", "Name field in the Account section");
    });
  });
});
