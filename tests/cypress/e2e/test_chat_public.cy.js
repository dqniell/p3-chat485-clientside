// This is a Cypress spec. Each describe() block is a group of tests.
// Each it() block is a single test.

describe("Chat page", () => {
  beforeEach(() => {
    cy.task("seedDb");
  });

  it("Hello world chat message", () => {
    // Intercept the POST request to create a new conversation.
    cy.intercept("POST", "/api/v1/conversations/").as("createConversation");

    // Go to the home page.
    cy.visit("/");

    // Click the "New chat" button.
    cy.get('[data-cy="new-conversation-btn"]').click();

    // Wait for the conversation to be created.
    cy.wait("@createConversation");

    // Type "hello world" and send it.
    cy.get('[data-cy="message-input"] textarea').type("hello world");
    cy.get("button[type='submit']").click();

    // Verify that both the user message and the echo response show up.
    cy.get('[data-cy="message-user"]').contains("hello world");
    cy.get('[data-cy="message-user"]').should("have.length.at.least", 1);
    cy.get('[data-cy="message-assistant"]').should("have.length.at.least", 1);
  });
});
