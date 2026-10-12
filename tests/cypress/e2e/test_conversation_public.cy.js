// This is a Cypress spec. Each describe() block is a group of tests.
// Each it() block is a single test.
//
// These tests exercise the conversation sidebar in an anonymous session.
// Anonymous sessions can hold conversations, so each test creates the
// conversations it needs via the REST API in its own setup.  Login is
// introduced separately, in test_accounts_public.cy.js.

describe("Conversation list (anonymous)", () => {
  // The beforeEach() hook automatically runs before each it() block.
  beforeEach(() => {
    // Reset the database. This command is equivalent to running
    // ./bin/chat485db reset.
    cy.task("seedDb");
  });

  it("Read conversation list", () => {
    // Create two conversations anonymously via the REST API, then send a
    // first user message in each.  The first message becomes the
    // conversation's title (see [Conversation title] in the spec), so
    // posting "First conversation" / "Second conversation" labels the
    // sidebar entries with those strings.
    ["First conversation", "Second conversation"].forEach((label) => {
      cy.request({
        method: "POST",
        url: "/api/v1/conversations/",
        body: {},
      }).then((response) => {
        cy.request({
          method: "POST",
          url: `/api/v1/conversations/${response.body.uuid}/messages/`,
          body: { content: label, model: "echo-1" },
        });
      });
    });

    // Intercept calls to the /api/v1/conversations/ route and store a Route
    // Alias called getConversations. Later, we can refer to requests to this
    // route using getConversations.
    cy.intercept("GET", "/api/v1/conversations/").as("getConversations");

    // Go to the home page.
    cy.visit("/");

    // Verify that a request was made to /api/v1/conversations/.
    cy.wait("@getConversations");

    // Verify that the two conversations we created appear in the sidebar.
    cy.contains("First conversation");
    cy.contains("Second conversation");
  });

  it("Delete conversation", () => {
    // Create two conversations so we can delete one and verify the other
    // remains.  Titles default to null on create; that is fine for this
    // test, which counts conversation items rather than reading titles.
    cy.request({
      method: "POST",
      url: "/api/v1/conversations/",
      body: {},
    });
    cy.request({
      method: "POST",
      url: "/api/v1/conversations/",
      body: {},
    });

    // Intercept calls to the /api/v1/conversations/ route and store a Route
    // Alias called getConversations. Later, we can refer to requests to this
    // route using getConversations.
    cy.intercept("GET", "/api/v1/conversations/").as("getConversations");

    // Go to the home page.
    cy.visit("/");

    // Verify that a request was made to /api/v1/conversations/.
    cy.wait("@getConversations");

    // Both conversations should appear in the sidebar.
    cy.get('[data-cy="conversation-item"]').should("have.length", 2);

    // Intercept the DELETE request for conversation deletion.
    cy.intercept("DELETE", "/api/v1/conversations/*/").as("deleteConversation");

    // Click the first delete button.
    cy.get('[data-cy="delete-conversation-btn"]').first().click();

    // Verify that a request was made to delete the conversation.
    cy.wait("@deleteConversation");

    // Verify that there is one fewer conversation.
    cy.get('[data-cy="conversation-item"]').should("have.length", 1);
  });

  it("Read messages when conversation is selected", () => {
    // Create a conversation and send a message so the message list has
    // content to render.  The echo model always replies, so one POST
    // yields both a user message and an assistant message.  The first
    // user message also becomes the conversation title, so sending
    // "Hello chat" labels the sidebar entry "Hello chat".
    cy.request({
      method: "POST",
      url: "/api/v1/conversations/",
      body: {},
    }).then((response) => {
      const convUuid = response.body.uuid;
      cy.request({
        method: "POST",
        url: `/api/v1/conversations/${convUuid}/messages/`,
        body: { content: "Hello chat", model: "echo-1" },
      });
    });

    // Intercept calls to the /api/v1/conversations/ route and store a Route
    // Alias called getConversations. Later, we can refer to requests to this
    // route using getConversations.
    cy.intercept("GET", "/api/v1/conversations/").as("getConversations");

    // Go to the home page.
    cy.visit("/");

    // Verify that a request was made to /api/v1/conversations/.
    cy.wait("@getConversations");

    // Intercept the request for conversation messages.
    cy.intercept("GET", /\/api\/v1\/conversations\/[a-f0-9-]+\/messages\//).as(
      "getMessages",
    );

    // Click the conversation we created in the sidebar.
    cy.contains('[data-cy="conversation-item"]', "Hello chat").click();

    // Verify that a request was made for the messages.
    cy.wait("@getMessages");

    // Verify that at least one message body rendered.
    cy.get('[data-cy="message-content"]').should("have.length.at.least", 1);
  });
});
