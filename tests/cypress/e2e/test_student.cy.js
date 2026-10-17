beforeEach(() => {
  cy.task("seedDb");
});

it("01-race-condition", () => {
  let idA;
  let idB;
  let releaseA;
  const item = '[data-cy="conversation-item"]';
  const list = '[data-cy="message-list"]';
  const textA = "Message from A";
  const textB = "Message from B";

  cy.request("POST", "/api/v1/conversations/", {}).then((res) => {
    idA = res.body.uuid;
    cy.request("POST", `/api/v1/conversations/${idA}/messages/`, {
      content: textA,
      model: "echo-1",
    });
  });
  cy.request("POST", "/api/v1/conversations/", {}).then((res) => {
    idB = res.body.uuid;
    cy.request("POST", `/api/v1/conversations/${idB}/messages/`, {
      content: textB,
      model: "echo-1",
    });
  });

  cy.then(() => {
    cy.intercept("GET", `/api/v1/conversations/${idA}/messages/**`, (req) => {
      return new Promise((resolve) => {
        releaseA = () => {
          // A correct client may have aborted this request after switching to B.
          // Releasing the route handler must not require an aborted GET to finish.
          try {
            req.reply({
              statusCode: 200,
              body: {
                next: "",
                url: `/api/v1/conversations/${idA}/messages/`,
                results: [
                  {
                    messageid: 2,
                    role: "assistant",
                    content: textA,
                    created: "2026-01-01 00:00:02",
                  },
                  {
                    messageid: 1,
                    role: "user",
                    content: textA,
                    created: "2026-01-01 00:00:01",
                  },
                ],
              },
            });
          } catch {
            // The browser already canceled A's request; that is valid behavior.
          }
          resolve();
        };
      });
    }).as("getA");
    cy.intercept("GET", `/api/v1/conversations/${idB}/messages/**`).as("getB");
  });

  cy.visit("/");
  cy.get(item).should("have.length", 2);
  cy.contains(item, textA).click();
  cy.get(item).should(() => {
    expect(releaseA).to.be.a("function");
  });

  cy.contains(item, textB).click();
  cy.wait("@getB");
  cy.get(list).should("contain", textB).and("not.contain", textA);

  // Release A after B is displayed. Do not wait for @getA: the correct
  // implementation is allowed to cancel that request on navigation.
  cy.then(() => releaseA());
  cy.get(list).should("contain", textB).and("not.contain", textA);
  cy.contains(item, textB).should("have.attr", "aria-current", "page");
});

it("02-failed-message", () => {
  let releaseFail;
  let failNext = true;
  let chatIdA;
  const item = '[data-cy="conversation-item"]';
  const user = '[data-cy="message-user"]';
  const err = '[data-cy="message-error"]';
  const asst = '[data-cy="message-assistant"]';
  const list = '[data-cy="message-list"]';
  const errorText = "Something went wrong, please try again.";
  const failText = "should survive failure";
  const recoverText = "recovered after failure";
  const input = '[data-cy="message-input"] textarea';
  const send = '[data-cy="message-input"] button[type="submit"]';
  ["Chat A", "Chat B"].forEach((label, idx) => {
    cy.request("POST", "/api/v1/conversations/", {}).then((res) => {
      if (idx === 0) chatIdA = res.body.uuid;
      cy.request("POST", `/api/v1/conversations/${res.body.uuid}/messages/`, {
        content: label,
        model: "echo-1",
      });
    });
  });
  cy.visit("/");
  cy.get(item).should("have.length", 2);
  cy.contains(item, "Chat A").click();
  cy.intercept("POST", "**/messages/", (req) => {
    if (!failNext) return;
    failNext = false;
    return new Promise((resolve) => {
      releaseFail = () => {
        req.reply({
          statusCode: 502,
          body: { message: "Bad Gateway", status_code: 502 },
        });
        resolve();
      };
    });
  }).as("failedPost");
  cy.get(input).type(failText);
  cy.get(send).click();
  cy.get(item).should(() => expect(releaseFail).to.be.a("function"));
  cy.get(user).should("contain", failText);
  cy.get(err).should("not.exist");
  cy.then(() => releaseFail());
  cy.wait("@failedPost");
  cy.get(user).should("contain", failText);
  cy.get(err).should("have.length", 1).and("contain", errorText);
  cy.get(asst).should("not.contain", failText);
  cy.get(list).should(($list) => {
    const html = $list.html();
    expect(html.indexOf(failText)).to.be.lessThan(html.indexOf(errorText));
  });
  cy.contains(item, "Chat B").click();
  cy.get(list).should("contain", "Chat B").and("not.contain", failText);
  cy.get(err).should("not.exist");
  cy.contains(item, "Chat A").click();
  cy.get(err).should("not.exist");
  cy.get(user).should("contain", "Chat A").and("not.contain", failText);
  cy.intercept("POST", "**/messages/").as("recoverPost");
  cy.get(input).clear().type(recoverText);
  cy.get(send).click();
  cy.wait("@recoverPost").then((i) => {
    expect(i.request.url).to.include(`/conversations/${chatIdA}/messages/`);
  });
  cy.get("@recoverPost.all").should("have.length", 1);
  cy.contains(asst, recoverText).should("have.length", 1);
  cy.get(err).should("not.exist");
});

it("03-pagination", () => {
  const msg = '[data-cy="message-content"]';
  const list = '[data-cy="message-list"]';
  const more = '[data-cy="message-list-load-more"]';

  cy.request("POST", "/api/v1/conversations/", {}).then((res) => {
    const id = res.body.uuid;
    for (let i = 1; i <= 12; i += 1) {
      cy.request("POST", `/api/v1/conversations/${id}/messages/`, {
        content: `Message_${String(i).padStart(2, "0")}`,
        model: "echo-1",
      });
    }
  });

  cy.visit("/");
  cy.contains('[data-cy="conversation-item"]', "Message_01").click();
  cy.get(msg).should("have.length", 10);
  cy.get(msg).first().should("contain", "Message_08");
  cy.get(msg).last().should("contain", "Message_12");
  cy.get(more).should("exist");
  cy.get(list).scrollTo("top");
  cy.get(more).click({ force: true });
  cy.get(msg).should("have.length", 20);
  cy.get(msg).first().should("contain", "Message_03");
  cy.contains(msg, "Message_08").should("exist");
  cy.get(msg).last().should("contain", "Message_12");
  cy.get(list).scrollTo("top");
  cy.get(more).click({ force: true });
  cy.get(msg).should("have.length", 24);
  cy.get(more).should("not.exist");
  cy.intercept("POST", "**/messages/").as("send13");
  cy.get('[data-cy="message-input"] textarea').type("Message_13");
  cy.get('[data-cy="message-input"] button[type="submit"]').click();
  cy.wait("@send13");
  cy.get('[data-cy="message-assistant"]').should("contain", "Message_13");
  cy.get(msg).last().should("contain", "Message_13");
  cy.contains(msg, "Message_13").should("be.visible");
});

it("04-title-polling", () => {
  const titleA = "Learning about React hooks";
  const titleB = "Exploring Cypress intercepts";
  let chatIdA;
  let chatIdB;
  let titleReadyA = false;
  let titleReadyB = false;
  const pollCounts = {};
  const item = '[data-cy="conversation-item"]';
  const input = '[data-cy="message-input"] textarea';
  const send = '[data-cy="message-input"] button[type="submit"]';
  const newBtn = '[data-cy="new-conversation-btn"]';
  cy.intercept("POST", "/api/v1/conversations/").as("create");
  cy.intercept("GET", "/api/v1/conversations/", (req) => {
    const results = [];
    // prettier-ignore
    if (chatIdB) results.push({ uuid: chatIdB, title: null, created: "2026-01-01 00:00:02" });
    // prettier-ignore
    if (chatIdA) results.push({ uuid: chatIdA, title: null, created: "2026-01-01 00:00:01" });
    // prettier-ignore
    req.reply({ statusCode: 200, body: { results, url: "/api/v1/conversations/" } });
  });
  cy.intercept("GET", /\/api\/v1\/conversations\/[a-f0-9-]+\/$/, (req) => {
    const chatId = req.url.match(/\/conversations\/([a-f0-9-]+)\//)[1];
    pollCounts[chatId] = (pollCounts[chatId] || 0) + 1;
    let nextTitle = null;
    if (chatId === chatIdA && titleReadyA) nextTitle = titleA;
    if (chatId === chatIdB && titleReadyB) nextTitle = titleB;
    // prettier-ignore
    req.reply({ statusCode: 200, body: { uuid: chatId, title: nextTitle, created: "2026-01-01 00:00:00", url: `/api/v1/conversations/${chatId}/` } });
  });
  cy.intercept("POST", "**/messages/").as("postMessage");
  cy.visit("/");
  cy.get(newBtn).click();
  cy.wait("@create").then((i) => {
    expect(i.response.body.title == null).to.eq(true);
    chatIdA = i.response.body.uuid;
  });
  cy.get(newBtn).click();
  cy.wait("@create").then((i) => {
    expect(i.response.body.title == null).to.eq(true);
    chatIdB = i.response.body.uuid;
  });
  cy.then(() => {
    expect(chatIdA).to.be.a("string");
    expect(chatIdB).to.be.a("string");
    expect(chatIdA).to.not.eq(chatIdB);
  });
  cy.get(item).should(($items) => {
    expect($items).to.have.length(2);
    [...$items].forEach((el) => {
      expect(el.textContent).to.include("New conversation");
    });
  });
  cy.get(item, { timeout: 10000 }).should(() => {
    expect(pollCounts[chatIdA]).to.be.at.least(1);
    expect(pollCounts[chatIdB]).to.be.at.least(1);
  });
  cy.get(item).last().click();
  cy.then(() => {
    cy.location("pathname").should("eq", `/conversations/${chatIdA}/`);
  });
  cy.get(input).type(titleA);
  cy.get(send).click();
  cy.wait("@postMessage").then((i) => {
    expect(i.request.url).to.include(`/conversations/${chatIdA}/messages/`);
    titleReadyA = true;
  });
  cy.get('[data-cy="message-assistant"]').should("contain", titleA);
  cy.contains(item, titleA, { timeout: 10000 }).should("be.visible");
  cy.contains(item, "New conversation").should("be.visible");
  cy.then(() => {
    const bAtTitle = pollCounts[chatIdB];
    cy.get(item, { timeout: 10000 }).should(() => {
      expect(pollCounts[chatIdB]).to.be.greaterThan(bAtTitle);
    });
  });
  cy.then(() => {
    const aBase = pollCounts[chatIdA];
    const bBase = pollCounts[chatIdB];
    cy.get(item, { timeout: 15000 }).should(() => {
      expect(pollCounts[chatIdB]).to.be.greaterThan(bBase);
      expect(pollCounts[chatIdA]).to.be.at.most(aBase + 1);
    });
  });
  cy.then(() => {
    const aFrozen = pollCounts[chatIdA];
    const bMid = pollCounts[chatIdB];
    cy.get(item, { timeout: 10000 }).should(() => {
      expect(pollCounts[chatIdB]).to.be.greaterThan(bMid);
      expect(pollCounts[chatIdA]).to.eq(aFrozen);
    });
    titleReadyB = true;
    cy.contains(item, titleB, { timeout: 10000 }).should("be.visible");
    cy.contains(item, titleA).should("be.visible");
    cy.get(item).should("not.contain", "New conversation");
    cy.then(() => {
      expect(pollCounts[chatIdA]).to.eq(aFrozen);
    });
  });
});

it("05-message-input", () => {
  const t = '[data-cy="message-input"] textarea';
  const s = '[data-cy="message-input"] button[type="submit"]';
  cy.intercept("POST", "/api/v1/conversations/").as("create");
  cy.intercept("POST", "**/messages/").as("post");
  cy.visit("/");
  cy.get('[data-cy="new-conversation-btn"]').click();
  cy.wait("@create");
  cy.location("pathname").should("match", /\/conversations\/[a-f0-9-]+\/?$/);

  // Whitespace-only cannot be submitted (SPEC: no blank messages).
  cy.get(s).should("be.disabled");
  cy.get(t).type("     ");
  cy.get(s).should("be.disabled");
  cy.get("@post.all").should("have.length", 0);

  // Whitespace + newlines still cannot POST.
  cy.get(t).clear().type("  {shift+enter}  {shift+enter}   ");
  cy.get("@post.all").should("have.length", 0);

  // Trim on send (SPEC).
  cy.get(t).clear().type("   Hello world   ");
  cy.get(s).should("not.be.disabled");
  cy.get(s).click();
  cy.wait("@post").its("request.body.content").should("eq", "Hello world");
  cy.get('[data-cy="message-assistant"]').should("contain", "Hello world");
  // Cleared by the time the assistant reply is visible (retryable).
  cy.get(t).should("have.value", "");

  // SPEC keyboard: Shift+Enter inserts newline; Enter submits.
  cy.get(t).type("First line{shift+enter}Second line");
  cy.get("@post.all").should("have.length", 1);
  cy.get(t).type("{enter}");
  cy.wait("@post")
    .its("request.body.content")
    .should("eq", "First line\nSecond line");
  cy.get("@post.all").should("have.length", 2);
  cy.get('[data-cy="message-assistant"]').should("contain", "Second line");
  cy.get(t).should("have.value", "");
});

it("06-model-selector", () => {
  let mid = 100;
  let page = { next: "", results: [] };
  const t = '[data-cy="message-input"] textarea';
  const s = '[data-cy="message-input"] button[type="submit"]';

  cy.intercept("GET", "/api/v1/models", {
    body: { data: [{ id: "echo-1" }, { id: "test-model-2" }] },
  }).as("models");
  cy.intercept("GET", "**/messages/**", (req) => req.reply({ body: page }));
  cy.intercept("POST", "**/messages/", (req) => {
    expect(req.body).to.include.keys("content", "model");
    const content = req.body.content;
    mid += 1;
    const user = { messageid: mid, role: "user", content };
    mid += 1;
    const asst = { messageid: mid, role: "assistant", content };
    page = { next: "", results: [asst, user] };
    req.reply({
      statusCode: 201,
      body: { messageid: mid, role: "assistant", content },
    });
  }).as("post");

  cy.visit("/");
  cy.wait("@models");
  cy.get('[data-cy="new-conversation-btn"]').click();
  cy.get('[data-cy="model-selector"]').should("have.value", "echo-1");
  cy.get('[data-cy="model-selector"] option').then(($o) => {
    expect([...$o].map((x) => x.value)).to.deep.eq(["echo-1", "test-model-2"]);
  });
  cy.get('[data-cy="model-selector"]').select("test-model-2");
  cy.get(t).type("hello");
  cy.get(s).click();
  cy.wait("@post").its("request.body.model").should("eq", "test-model-2");
  cy.get('[data-cy="model-selector"]').select("echo-1");
  cy.get(t).type("again");
  cy.get(s).click();
  cy.wait("@post").its("request.body.model").should("eq", "echo-1");
});

it("07-markdown", () => {
  const md = [
    "# Heading One",
    "## Heading",
    "**bold** and *italic*",
    "- list item",
    "[Chat485 link](https://example.com/chat485)",
    "| Col A | Col B |\n| ----- | ----- |\n| cell1 | cell2 |",
    "`variable`",
    "```js\nconst x = 1;\n```",
    "<script>window.__p3xss = 1</script>\n<img src=x onerror=window.__p3xss=2>",
  ].join("\n\n");
  cy.request("POST", "/api/v1/conversations/", {}).then((res) => {
    cy.request("POST", `/api/v1/conversations/${res.body.uuid}/messages/`, {
      content: md,
      model: "echo-1",
    });
  });
  cy.visit("/");
  cy.get('[data-cy="conversation-item"]').first().click();
  cy.get('[data-cy="message-assistant"]')
    .should("have.length", 1)
    .first()
    .find('[data-cy="message-content"]')
    .within(() => {
      cy.get("h1").should("contain", "Heading One");
      cy.get("h2").should("contain", "Heading");
      cy.get("strong").should("contain", "bold");
      cy.get("em").should("contain", "italic");
      cy.get("li").should("contain", "list item");
      cy.get('a[href="https://example.com/chat485"]').should(
        "contain",
        "Chat485 link",
      );
      cy.get("table").should("exist");
      cy.get("table th").should("contain", "Col A").and("contain", "Col B");
      cy.get("table td").should("contain", "cell1").and("contain", "cell2");
      cy.get("code").contains("variable");
      cy.get("pre code").should("contain", "const x = 1;");
      cy.get("pre code .hljs-keyword").should("contain", "const");
      cy.get("script").should("not.exist");
      cy.get("img").should("not.exist");
    });
  cy.window().should((win) => {
    expect(win.__p3xss).to.eq(undefined);
  });
});

it("08-signup", () => {
  const messageA = "Anon chat A before signup";
  const messageB = "Anon chat B before signup";
  const email = `student_${Date.now()}@umich.edu`;
  const item = '[data-cy="conversation-item"]';
  const input = '[data-cy="message-input"] textarea';
  const send = '[data-cy="message-input"] button[type="submit"]';
  const newBtn = '[data-cy="new-conversation-btn"]';
  let idA;
  let idB;
  cy.intercept("POST", "/api/v1/conversations/").as("create");
  cy.visit("/");
  cy.get(newBtn).click();
  cy.wait("@create").then((i) => {
    idA = i.response.body.uuid;
  });
  cy.get(input).type(messageA);
  cy.get(send).click();
  cy.get('[data-cy="message-assistant"]').should("contain", messageA);
  cy.get(newBtn).click();
  cy.wait("@create").then((i) => {
    idB = i.response.body.uuid;
    expect(idA).to.not.eq(idB);
  });
  cy.get(input).type(messageB);
  cy.get(send).click();
  cy.get('[data-cy="message-assistant"]').should("contain", messageB);
  cy.get('[data-cy="banner-signup-btn"]').click();
  cy.get('[data-cy="login-name"]')
    .should("be.visible")
    .type("Signup Test User");
  cy.get('[data-cy="login-email"]').type(email);
  cy.get('[data-cy="login-password"]').type("password123");
  cy.get('[data-cy="login-modal"] button[type="submit"]').click();
  cy.get('[data-cy="user-menu-name"]').should("contain", "Signup Test User");
  cy.get('[data-cy="settings-btn"]').should("be.visible");
  cy.get('[data-cy="login-btn"]').should("not.exist");
  cy.get(item).should("have.length", 2);
  cy.contains(item, messageA).click();
  cy.then(() => {
    cy.location("pathname").should("eq", `/conversations/${idA}/`);
  });
  cy.get('[data-cy="message-list"]')
    .should("contain", messageA)
    .and("not.contain", messageB);
  cy.intercept("POST", "**/messages/").as("postAfterSignup");
  cy.get(input).type("Writable after signup");
  cy.get(send).click();
  cy.wait("@postAfterSignup").then((i) => {
    expect(i.request.url).to.include(`/conversations/${idA}/messages/`);
  });
  // prettier-ignore
  cy.get('[data-cy="message-assistant"]').should("contain", "Writable after signup");
  cy.contains(item, messageB).click();
  cy.then(() => {
    cy.location("pathname").should("eq", `/conversations/${idB}/`);
  });
  cy.get('[data-cy="message-list"]')
    .should("contain", messageB)
    .and("not.contain", messageA);
  cy.reload();
  cy.get('[data-cy="user-menu-name"]').should("contain", "Signup Test User");
  cy.get(item).should("have.length", 2);
  cy.contains(item, messageA).click();
  cy.then(() => {
    cy.location("pathname").should("eq", `/conversations/${idA}/`);
  });
  cy.get('[data-cy="message-content"]').should("contain", messageA);
  cy.contains(item, messageB).click();
  cy.then(() => {
    cy.location("pathname").should("eq", `/conversations/${idB}/`);
  });
  cy.get('[data-cy="message-content"]').should("contain", messageB);
});

it("09-delete-selected", () => {
  const item = '[data-cy="conversation-item"]';
  const list = '[data-cy="message-list"]';
  const input = '[data-cy="message-input"] textarea';
  const send = '[data-cy="message-input"] button[type="submit"]';
  const keepLabel = "Keep this chat";
  const deleteLabel = "Delete this chat";
  let deletedId;
  let keepId;

  cy.request("POST", "/api/v1/conversations/", {}).then((res) => {
    keepId = res.body.uuid;
    cy.request("POST", `/api/v1/conversations/${keepId}/messages/`, {
      content: keepLabel,
      model: "echo-1",
    });
  });
  cy.request("POST", "/api/v1/conversations/", {}).then((res) => {
    deletedId = res.body.uuid;
    cy.request("POST", `/api/v1/conversations/${deletedId}/messages/`, {
      content: deleteLabel,
      model: "echo-1",
    });
  });

  cy.intercept("GET", "/api/v1/conversations/").as("getConversations");
  cy.visit("/");
  cy.wait("@getConversations");
  cy.get(item).should("have.length", 2);
  // Seeded first-message titles (API) â€” wait for sidebar labels before click.
  cy.contains(item, deleteLabel).should("be.visible").click();
  cy.get(list).should("contain", deleteLabel);

  cy.intercept("DELETE", "/api/v1/conversations/*/").as("deleteRequest");
  cy.contains(item, deleteLabel)
    .find('[data-cy="delete-conversation-btn"]')
    .click();
  cy.wait("@deleteRequest").then((i) => {
    const path = new URL(i.request.url).pathname;
    expect(path).to.eq(`/api/v1/conversations/${deletedId}/`);
  });
  // Retryable sidebar refresh (client filter or list reload) â€” no empty-state/route asserts.
  cy.get(item).should("have.length", 1);
  cy.contains(item, deleteLabel).should("not.exist");
  cy.contains(item, keepLabel).should("be.visible");

  cy.contains(item, keepLabel).click();
  cy.get(list).should("contain", keepLabel).and("not.contain", deleteLabel);
  cy.intercept("POST", "**/messages/").as("postKeep");
  cy.get(input).type("Still works on keep");
  cy.get(send).click();
  cy.wait("@postKeep").then((i) => {
    const path = new URL(i.request.url).pathname;
    expect(path).to.eq(`/api/v1/conversations/${keepId}/messages/`);
  });
  cy.get('[data-cy="message-assistant"]').should(
    "contain",
    "Still works on keep",
  );
});

it("10-new-chat", () => {
  const item = '[data-cy="conversation-item"]';
  const list = '[data-cy="message-list"]';
  const input = '[data-cy="message-input"] textarea';
  const send = '[data-cy="message-input"] button[type="submit"]';
  const newBtn = '[data-cy="new-conversation-btn"]';
  const a = "Only in chat A";
  const b = "Only in chat B";
  const b2 = "Second message in B";
  let id1;
  let id2;

  cy.intercept("POST", "/api/v1/conversations/").as("create");
  cy.intercept("POST", "**/messages/").as("post");
  cy.visit("/");

  cy.get(newBtn).click();
  cy.wait("@create").then((i) => {
    id1 = i.response.body.uuid;
  });
  cy.then(() => {
    cy.location("pathname").should("include", id1);
  });
  cy.get(input).type(a);
  cy.get(send).click();
  cy.wait("@post").then((i) => {
    expect(i.request.url).to.include(`/conversations/${id1}/messages/`);
  });
  cy.get('[data-cy="message-assistant"]').should("contain", a);
  cy.contains(item, a).should("be.visible");

  cy.get(newBtn).click();
  cy.wait("@create").then((i) => {
    id2 = i.response.body.uuid;
    expect(id1).to.not.eq(id2);
  });
  // No GET is required for a newly created empty conversation. Wait for
  // the selected route and editable input instead of a broad GET alias.
  cy.then(() => {
    cy.location("pathname").should("include", id2);
  });
  cy.get(input).should("be.visible").and("not.be.disabled");
  cy.get(input).type(b);
  cy.get(send).click();
  cy.wait("@post").then((i) => {
    expect(i.request.url).to.include(`/conversations/${id2}/messages/`);
  });
  cy.get(list).should("contain", b).and("not.contain", a);
  cy.contains(item, b).should("be.visible");

  cy.contains(item, a).click();
  cy.then(() => {
    cy.location("pathname").should("include", id1);
  });
  cy.get(list).should("contain", a).and("not.contain", b);

  cy.contains(item, b).click();
  cy.then(() => {
    cy.location("pathname").should("include", id2);
  });
  cy.get(list).should("contain", b).and("not.contain", a);
  cy.get(input).type(b2);
  cy.get(send).click();
  cy.wait("@post").then((i) => {
    expect(i.request.url).to.include(`/conversations/${id2}/messages/`);
  });
  cy.get(list).should("contain", b2).and("contain", b).and("not.contain", a);

  cy.reload();
  cy.contains(item, b).should("be.visible");
  cy.contains(item, b).click();
  cy.get(list).should("contain", b).and("contain", b2).and("not.contain", a);
});