import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeMatch = location.pathname.match(/^\/conversations\/([^/]+)\/?$/);
  const selectedConversation = routeMatch ? routeMatch[1] : null;
  const [conversations, setConversations] = useState([]);
  const [messagePage, setMessagePage] = useState({
    uuid: null,
    messages: [],
    next: null,
  });
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("echo-1");
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [activeAuthModal, setActiveAuthModal] = useState(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState(null);
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
  const [signupFullname, setSignupFullname] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupError, setSignupError] = useState(null);
  const [isSignupSubmitting, setIsSignupSubmitting] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsFullname, setSettingsFullname] = useState("");
  const [settingsEmail, setSettingsEmail] = useState("");
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState(null);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(null);
  const selectedConversationRef = useRef(selectedConversation);
  const textareaRef = useRef(null);
  const messageListRef = useRef(null);
  const scrollRestoreRef = useRef(null);
  const scrollActionRef = useRef(null);
  const sendingRef = useRef(false);
  const loadingOlderRef = useRef(false);
  const optimisticIdRef = useRef(0);
  const conversationRequestRef = useRef(0);
  const messageRequestRef = useRef(0);
  const sessionVersionRef = useRef(0);
  const titlePollsRef = useRef(new Map());
  const messages =
    messagePage.uuid === selectedConversation
      ? messagePage.messages.filter(
          (message) =>
            !message.navigationKey || message.navigationKey === location.key,
        )
      : [];
  const nextMessagesUrl =
    messagePage.uuid === selectedConversation ? messagePage.next : null;
  // Stable callback: stop polling one conversation.
  const stopTitlePolling = useCallback((uuid) => {
    const poll = titlePollsRef.current.get(uuid);
    if (!poll) {
      return;
    }
    clearInterval(poll.timerId);
    poll.controller?.abort();
    titlePollsRef.current.delete(uuid);
  }, []);
  // Stable callback: preserve titles already discovered through polling.
  const updateConversations = useCallback(
    (incoming) => {
      setConversations((previous) =>
        incoming.map((conversation) => {
          const existing = previous.find(
            (item) => item.uuid === conversation.uuid,
          );
          if (conversation.title == null && existing?.title != null) {
            return {
              ...conversation,
              title: existing.title,
            };
          }
          return conversation;
        }),
      );
      for (const conversation of incoming) {
        if (conversation.title != null) {
          stopTitlePolling(conversation.uuid);
        }
      }
    },
    [stopTitlePolling],
  );
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);
  // Check the current authentication session.
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/accounts/sessions/me", {
      signal: controller.signal,
    })
      .then((response) => {
        if (response.status === 403) {
          return null;
        }
        if (!response.ok) {
          throw new Error(`Authentication check failed: ${response.status}`);
        }
        return response.json();
      })
      .then((user) => {
        if (!controller.signal.aborted) {
          setCurrentUser(user);
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Authentication check failed:", error);
          setAuthError("Unable to check login status.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsAuthLoading(false);
        }
      });
    return () => controller.abort();
  }, []);
  // Initial conversation loading.
  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++conversationRequestRef.current;
    fetch("/api/v1/conversations/", {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch conversations");
        }
        return response.json();
      })
      .then((data) => {
        if (
          !controller.signal.aborted &&
          requestId === conversationRequestRef.current
        ) {
          updateConversations(data.results);
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Failed to fetch conversations:", error);
        }
      });
    return () => controller.abort();
  }, [updateConversations]);
  // Load available models.
  useEffect(() => {
    fetch("/api/v1/models")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch models");
        }
        return response.json();
      })
      .then((data) => {
        setModels(data.data);
      })
      .catch((error) => {
        console.error("Failed to fetch models:", error);
      });
  }, []);
  // Load messages when the selected conversation changes.
  useEffect(() => {
    if (selectedConversation === null) {
      return;
    }
    const controller = new AbortController();
    const sessionVersion = sessionVersionRef.current;
    const requestId = ++messageRequestRef.current;
    scrollRestoreRef.current = null;
    scrollActionRef.current = {
      type: "bottom",
      uuid: selectedConversation,
    };
    fetch(`/api/v1/conversations/${selectedConversation}/messages/`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch messages");
        }
        return response.json();
      })
      .then((data) => {
        if (
          controller.signal.aborted ||
          sessionVersion !== sessionVersionRef.current ||
          requestId !== messageRequestRef.current
        ) {
          return;
        }
        setMessagePage((previous) => {
          const temporaryMessages =
            previous.uuid === selectedConversation
              ? previous.messages.filter(
                  (message) =>
                    message.clientStatus &&
                    message.navigationKey === location.key,
                )
              : [];
          return {
            uuid: selectedConversation,
            messages: [...data.results.slice().reverse(), ...temporaryMessages],
            next: data.next ?? null,
          };
        });
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Failed to fetch messages:", error);
        }
      });
    return () => controller.abort();
  }, [selectedConversation, location.key]);
  // Scroll to new messages or restore position after pagination.
  useLayoutEffect(() => {
    const container = messageListRef.current;
    if (!container || messagePage.uuid !== selectedConversation) {
      return;
    }
    const restore = scrollRestoreRef.current;
    if (restore && restore.uuid === selectedConversation) {
      container.scrollTop =
        restore.scrollTop + (container.scrollHeight - restore.scrollHeight);
      scrollRestoreRef.current = null;
      scrollActionRef.current = null;
      return;
    }
    const action = scrollActionRef.current;
    if (
      action &&
      action.type === "bottom" &&
      action.uuid === selectedConversation
    ) {
      container.scrollTop = container.scrollHeight;
      scrollActionRef.current = null;
    }
  }, [messagePage, selectedConversation, location.key]);
  // Automatically resize the message textarea.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.style.height = "auto";
    const styles = window.getComputedStyle(textarea);
    const lineHeight = parseFloat(styles.lineHeight);
    const padding =
      parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    const border =
      parseFloat(styles.borderTopWidth) + parseFloat(styles.borderBottomWidth);
    const maxHeight = lineHeight * 10 + padding + border;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [messageInput]);
  // Stop title polling when the component unmounts.
  useEffect(() => {
    const polls = titlePollsRef.current;
    return () => {
      for (const poll of polls.values()) {
        clearInterval(poll.timerId);
        poll.controller?.abort();
      }
      polls.clear();
    };
  }, []);
  function stopAllTitlePolling() {
    for (const uuid of Array.from(titlePollsRef.current.keys())) {
      stopTitlePolling(uuid);
    }
  }
  function startTitlePolling(uuid) {
    if (titlePollsRef.current.has(uuid)) {
      return;
    }
    const sessionVersion = sessionVersionRef.current;
    const poll = {
      timerId: null,
      inFlight: false,
      controller: null,
    };
    const checkTitle = async () => {
      if (poll.inFlight) {
        return;
      }
      if (sessionVersion !== sessionVersionRef.current) {
        stopTitlePolling(uuid);
        return;
      }
      poll.inFlight = true;
      const controller = new AbortController();
      poll.controller = controller;
      try {
        const response = await fetch(`/api/v1/conversations/${uuid}/`, {
          signal: controller.signal,
        });
        if (response.status === 404 || response.status === 403) {
          stopTitlePolling(uuid);
          return;
        }
        if (!response.ok) {
          throw new Error(
            `Failed to fetch conversation title: ${response.status}`,
          );
        }
        const updatedConversation = await response.json();
        if (
          !titlePollsRef.current.has(uuid) ||
          sessionVersion !== sessionVersionRef.current
        ) {
          return;
        }
        if (updatedConversation.title != null) {
          setConversations((previous) =>
            previous.map((conversation) =>
              conversation.uuid === uuid
                ? {
                    ...conversation,
                    title: updatedConversation.title,
                  }
                : conversation,
            ),
          );
          stopTitlePolling(uuid);
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.warn(`Title polling failed for ${uuid}:`, error);
        }
      } finally {
        poll.inFlight = false;
        if (poll.controller === controller) {
          poll.controller = null;
        }
      }
    };
    poll.timerId = setInterval(checkTitle, 500);
    titlePollsRef.current.set(uuid, poll);
  }
  async function refreshConversations() {
    const requestId = ++conversationRequestRef.current;
    const sessionVersion = sessionVersionRef.current;
    const response = await fetch("/api/v1/conversations/");
    if (!response.ok) {
      throw new Error(`Failed to refresh conversations: ${response.status}`);
    }
    const data = await response.json();
    if (
      requestId === conversationRequestRef.current &&
      sessionVersion === sessionVersionRef.current
    ) {
      updateConversations(data.results);
    }
  }
  async function refreshAccountAndConversations() {
    const requestId = ++conversationRequestRef.current;
    const [userResponse, conversationsResponse] = await Promise.all([
      fetch("/api/v1/accounts/sessions/me"),
      fetch("/api/v1/conversations/"),
    ]);
    if (!userResponse.ok || !conversationsResponse.ok) {
      throw new Error("Unable to refresh account information.");
    }
    const [userData, conversationsData] = await Promise.all([
      userResponse.json(),
      conversationsResponse.json(),
    ]);
    stopAllTitlePolling();
    sessionVersionRef.current += 1;
    messageRequestRef.current += 1;
    scrollRestoreRef.current = null;
    scrollActionRef.current = null;
    setCurrentUser(userData);
    setMessagePage({
      uuid: null,
      messages: [],
      next: null,
    });
    if (requestId === conversationRequestRef.current) {
      setConversations(conversationsData.results);
    }
    setAuthError(null);
    navigate("/");
  }
  function handleSelectConversation(uuid) {
    scrollRestoreRef.current = null;
    scrollActionRef.current = {
      type: "bottom",
      uuid,
    };
    navigate(`/conversations/${uuid}/`);
  }
  function handleNewChat() {
    const sessionVersion = sessionVersionRef.current;
    fetch("/api/v1/conversations/", {
      method: "POST",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to create conversation");
        }
        return response.json();
      })
      .then((newConversation) => {
        if (sessionVersion !== sessionVersionRef.current) {
          return;
        }
        setConversations((previous) => [newConversation, ...previous]);
        if (newConversation.title == null) {
          startTitlePolling(newConversation.uuid);
        }
        handleSelectConversation(newConversation.uuid);
      })
      .catch((error) => {
        console.error("Failed to create conversation:", error);
      });
  }
  function handleDeleteConversation(uuid) {
    fetch(`/api/v1/conversations/${uuid}/`, {
      method: "DELETE",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to delete conversation: ${response.status}`);
        }
        stopTitlePolling(uuid);
        setConversations((previous) =>
          previous.filter((conversation) => conversation.uuid !== uuid),
        );
        if (selectedConversationRef.current === uuid) {
          messageRequestRef.current += 1;
          scrollRestoreRef.current = null;
          scrollActionRef.current = null;
          setMessagePage({
            uuid: null,
            messages: [],
            next: null,
          });
          navigate("/");
        }
      })
      .catch((error) => {
        console.error("Failed to delete conversation:", error);
      });
  }
  function handleLoadOlderMessages() {
    if (
      !nextMessagesUrl ||
      selectedConversation === null ||
      isLoadingOlder ||
      loadingOlderRef.current
    ) {
      return;
    }
    const conversationUuid = selectedConversation;
    const pageUrl = nextMessagesUrl;
    const sessionVersion = sessionVersionRef.current;
    loadingOlderRef.current = true;
    setIsLoadingOlder(true);
    fetch(pageUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load older messages: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (
          selectedConversationRef.current !== conversationUuid ||
          sessionVersion !== sessionVersionRef.current
        ) {
          return;
        }
        const container = messageListRef.current;
        if (container) {
          scrollRestoreRef.current = {
            uuid: conversationUuid,
            scrollTop: container.scrollTop,
            scrollHeight: container.scrollHeight,
          };
        }
        scrollActionRef.current = null;
        const olderMessages = data.results.slice().reverse();
        setMessagePage((previous) => {
          if (previous.uuid !== conversationUuid) {
            return previous;
          }
          return {
            uuid: conversationUuid,
            messages: [...olderMessages, ...previous.messages],
            next: data.next ?? null,
          };
        });
      })
      .catch((error) => {
        console.error("Failed to load older messages:", error);
      })
      .finally(() => {
        loadingOlderRef.current = false;
        setIsLoadingOlder(false);
      });
  }
  async function handleSendMessage(event) {
    event.preventDefault();
    const trimmedMessage = messageInput.trim();
    if (
      selectedConversation === null ||
      !trimmedMessage ||
      isSending ||
      sendingRef.current
    ) {
      return;
    }
    const conversationUuid = selectedConversation;
    const sessionVersion = sessionVersionRef.current;
    const navigationKey = location.key;
    const submittedInput = messageInput;
    optimisticIdRef.current += 1;
    const optimisticId = `optimistic-${optimisticIdRef.current}`;
    const optimisticMessage = {
      messageid: optimisticId,
      role: "user",
      content: trimmedMessage,
      navigationKey,
      clientStatus: "pending",
    };
    sendingRef.current = true;
    setIsSending(true);
    scrollRestoreRef.current = null;
    scrollActionRef.current = {
      type: "bottom",
      uuid: conversationUuid,
    };
    setMessagePage((previous) => ({
      uuid: conversationUuid,
      messages: [
        ...(previous.uuid === conversationUuid ? previous.messages : []),
        optimisticMessage,
      ],
      next: previous.uuid === conversationUuid ? previous.next : null,
    }));
    //Send the message.
    try {
      const response = await fetch(
        `/api/v1/conversations/${conversationUuid}/messages/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: trimmedMessage,
            model: selectedModel,
          }),
        },
      );
      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }
    } catch {
      // Expected POST errors, including 502,
      // are displayed in the UI instead of console.error.
      if (sessionVersion === sessionVersionRef.current) {
        scrollActionRef.current = {
          type: "bottom",
          uuid: conversationUuid,
        };
        setMessagePage((previous) => {
          if (previous.uuid !== conversationUuid) {
            return previous;
          }
          return {
            ...previous,
            messages: previous.messages.map((message) =>
              message.messageid === optimisticId
                ? {
                    ...message,
                    clientStatus: "failed",
                  }
                : message,
            ),
          };
        });
      }
      sendingRef.current = false;
      setIsSending(false);
      return;
    }
    //Clear input after successful POST.
    if (sessionVersion !== sessionVersionRef.current) {
      sendingRef.current = false;
      setIsSending(false);
      return;
    }
    setMessageInput((previous) =>
      previous === submittedInput ? "" : previous,
    );
    setMessagePage((previous) => {
      if (previous.uuid !== conversationUuid) {
        return previous;
      }
      return {
        ...previous,
        messages: previous.messages.map((message) =>
          message.messageid === optimisticId
            ? {
                ...message,
                clientStatus: "sent",
              }
            : message,
        ),
      };
    });
    //Fetch authoritative messages.
    try {
      const response = await fetch(
        `/api/v1/conversations/${conversationUuid}/messages/`,
      );
      if (!response.ok) {
        throw new Error(`Failed to refresh messages: ${response.status}`);
      }
      const data = await response.json();
      if (
        sessionVersion === sessionVersionRef.current &&
        selectedConversationRef.current === conversationUuid
      ) {
        messageRequestRef.current += 1;
        scrollActionRef.current = {
          type: "bottom",
          uuid: conversationUuid,
        };
        setMessagePage({
          uuid: conversationUuid,
          messages: data.results.slice().reverse(),
          next: data.next ?? null,
        });
      }
    } catch (error) {
      // GET failure does not mean the POST failed.
      console.warn("Message refresh failed:", error);
    }
    //Refresh sidebar separately.
    try {
      await refreshConversations();
    } catch (error) {
      console.warn("Conversation refresh failed:", error);
    } finally {
      sendingRef.current = false;
      setIsSending(false);
    }
  }
  async function handleLoginSubmit(event) {
    event.preventDefault();
    if (isLoginSubmitting) {
      return;
    }
    setLoginError(null);
    setIsLoginSubmitting(true);
    try {
      const response = await fetch("/api/v1/accounts/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      });
      if (response.status === 400) {
        setLoginError("Please enter a valid email and password.");
        return;
      }
      if (response.status === 403) {
        setLoginError("Incorrect email or password.");
        return;
      }
      if (!response.ok) {
        throw new Error(`Login failed: ${response.status}`);
      }
      await refreshAccountAndConversations();
      setLoginEmail("");
      setLoginPassword("");
      setLoginError(null);
      setActiveAuthModal(null);
    } catch (error) {
      console.error("Login failed:", error);
      setLoginError("Unable to complete login. Please try again.");
    } finally {
      setIsLoginSubmitting(false);
    }
  }
  async function handleSignupSubmit(event) {
    event.preventDefault();
    if (isSignupSubmitting) {
      return;
    }
    setSignupError(null);
    setIsSignupSubmitting(true);
    try {
      const response = await fetch("/api/v1/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullname: signupFullname.trim(),
          email: signupEmail.trim(),
          password: signupPassword,
        }),
      });
      if (response.status === 400) {
        setSignupError("Please complete all fields correctly.");
        return;
      }
      if (response.status === 409) {
        setSignupError("An account with this email already exists.");
        return;
      }
      if (response.status !== 201) {
        throw new Error(`Signup failed: ${response.status}`);
      }
      await refreshAccountAndConversations();
      setSignupFullname("");
      setSignupEmail("");
      setSignupPassword("");
      setSignupError(null);
      setActiveAuthModal(null);
    } catch (error) {
      console.error("Signup failed:", error);
      setSignupError("Unable to complete signup. Please try again.");
    } finally {
      setIsSignupSubmitting(false);
    }
  }
  function handleOpenSettings() {
    if (!currentUser) {
      return;
    }
    setSettingsFullname(currentUser.fullname);
    setSettingsEmail(currentUser.email);
    setSettingsError(null);
    setSettingsSuccess(false);
    setLogoutError(null);
    setIsSettingsOpen(true);
  }
  function handleCloseSettings() {
    if (isSettingsSaving || isLoggingOut) {
      return;
    }
    setIsSettingsOpen(false);
    setSettingsError(null);
    setSettingsSuccess(false);
    setLogoutError(null);
  }
  async function handleSettingsSubmit(event) {
    event.preventDefault();
    if (!currentUser || isSettingsSaving || isLoggingOut) {
      return;
    }
    const fullname = settingsFullname.trim();
    const email = settingsEmail.trim();
    setSettingsError(null);
    setSettingsSuccess(false);
    if (!fullname || !email) {
      setSettingsError("Full name and email are required.");
      return;
    }
    setIsSettingsSaving(true);
    try {
      const response = await fetch(`/api/v1/accounts/${currentUser.userid}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullname,
          email,
        }),
      });
      if (response.status === 400) {
        setSettingsError("Please enter a valid name and email.");
        return;
      }
      if (response.status === 403) {
        setSettingsError("You are not authorized to edit this account.");
        return;
      }
      if (response.status === 409) {
        setSettingsError("This email is already associated with an account.");
        return;
      }
      if (!response.ok) {
        throw new Error(`Account update failed: ${response.status}`);
      }
      const updatedUser = await response.json();
      setCurrentUser((previous) => ({
        ...previous,
        ...updatedUser,
      }));
      setSettingsFullname(updatedUser.fullname);
      setSettingsEmail(updatedUser.email);
      setSettingsSuccess(true);
    } catch (error) {
      console.error("Settings update failed:", error);
      setSettingsError("Unable to update account. Please try again.");
    } finally {
      setIsSettingsSaving(false);
    }
  }
  async function handleLogout() {
    if (isLoggingOut || isSettingsSaving) {
      return;
    }
    setLogoutError(null);
    setIsLoggingOut(true);
    try {
      const response = await fetch("/api/v1/accounts/sessions", {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`Logout failed: ${response.status}`);
      }
      stopAllTitlePolling();
      conversationRequestRef.current += 1;
      sessionVersionRef.current += 1;
      messageRequestRef.current += 1;
      scrollRestoreRef.current = null;
      scrollActionRef.current = null;
      setCurrentUser(null);
      setIsSettingsOpen(false);
      setActiveAuthModal(null);
      setAuthError(null);
      setSettingsSuccess(false);
      setMessagePage({
        uuid: null,
        messages: [],
        next: null,
      });
      setMessageInput("");
      setConversations([]);
      navigate("/");
      try {
        await refreshConversations();
      } catch (error) {
        console.error("Unable to refresh anonymous conversations:", error);
      }
    } catch (error) {
      console.error("Logout failed:", error);
      setLogoutError("Unable to log out. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  }
  return (
    <div className="app-container">
      <header className="app-header">
        {!isAuthLoading && !authError && currentUser === null && (
          <>
            <button
              type="button"
              data-cy="banner-login-btn"
              onClick={() => setActiveAuthModal("login")}
            >
              Log in
            </button>
            <button
              type="button"
              data-cy="banner-signup-btn"
              onClick={() => setActiveAuthModal("signup")}
            >
              Sign up
            </button>
            <button
              type="button"
              data-cy="login-btn"
              onClick={() => setActiveAuthModal("login")}
            >
              Log in
            </button>
          </>
        )}
        {!isAuthLoading && currentUser && (
          <span className="header-username">{currentUser.fullname}</span>
        )}
        {authError && <p role="alert">{authError}</p>}
      </header>
      {activeAuthModal === "login" && (
        <div className="modal-overlay">
          <section
            className="auth-modal"
            data-cy="login-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-modal-title"
          >
            <div className="modal-header">
              <h2 id="login-modal-title">Log in</h2>
              <button
                type="button"
                className="modal-close"
                aria-label="Close login"
                disabled={isLoginSubmitting}
                onClick={() => {
                  setActiveAuthModal(null);
                  setLoginError(null);
                }}
              >
                ×
              </button>
            </div>
            <form className="modal-form" onSubmit={handleLoginSubmit}>
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                data-cy="login-email"
                type="email"
                autoComplete="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                disabled={isLoginSubmitting}
                required
              />
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                data-cy="login-password"
                type="password"
                autoComplete="current-password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                disabled={isLoginSubmitting}
                required
              />
              {loginError && (
                <p className="form-error" data-cy="login-error" role="alert">
                  {loginError}
                </p>
              )}
              <button
                type="submit"
                className="primary-btn"
                disabled={isLoginSubmitting}
              >
                {isLoginSubmitting ? "Logging in..." : "Log in"}
              </button>
              <button
                type="button"
                className="switch-btn"
                data-cy="login-switch"
                disabled={isLoginSubmitting}
                onClick={() => {
                  setLoginError(null);
                  setActiveAuthModal("signup");
                }}
              >
                <p>Don&apos;t have an account?</p>
              </button>
            </form>
          </section>
        </div>
      )}
      {activeAuthModal === "signup" && (
        <div className="modal-overlay">
          <section
            className="auth-modal"
            data-cy="login-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="signup-modal-title"
          >
            <div className="modal-header">
              <h2 id="signup-modal-title">Create account</h2>
              <button
                type="button"
                className="modal-close"
                aria-label="Close signup"
                disabled={isSignupSubmitting}
                onClick={() => {
                  setActiveAuthModal(null);
                  setSignupError(null);
                }}
              >
                ×
              </button>
            </div>
            <form className="modal-form" onSubmit={handleSignupSubmit}>
              <label htmlFor="signup-fullname">Full name</label>
              <input
                id="signup-fullname"
                data-cy="login-name"
                type="text"
                autoComplete="name"
                value={signupFullname}
                onChange={(event) => setSignupFullname(event.target.value)}
                disabled={isSignupSubmitting}
                required
              />
              <label htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                data-cy="login-email"
                type="email"
                autoComplete="email"
                value={signupEmail}
                onChange={(event) => setSignupEmail(event.target.value)}
                disabled={isSignupSubmitting}
                required
              />
              <label htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                data-cy="login-password"
                type="password"
                autoComplete="new-password"
                value={signupPassword}
                onChange={(event) => setSignupPassword(event.target.value)}
                disabled={isSignupSubmitting}
                required
              />
              {signupError && (
                <p className="form-error" data-cy="login-error" role="alert">
                  {signupError}
                </p>
              )}
              <button
                type="submit"
                className="primary-btn"
                disabled={isSignupSubmitting}
              >
                {isSignupSubmitting ? "Creating account..." : "Create account"}
              </button>
              <button
                type="button"
                className="switch-btn"
                data-cy="login-switch"
                disabled={isSignupSubmitting}
                onClick={() => {
                  setSignupError(null);
                  setActiveAuthModal("login");
                }}
              >
                Already have an account? Log in
              </button>
            </form>
          </section>
        </div>
      )}
      {isSettingsOpen && currentUser && (
        <div className="modal-overlay">
          <section
            className="settings-modal"
            data-cy="settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-modal-title"
          >
            <div className="modal-header">
              <h2 id="settings-modal-title">Settings</h2>
              <button
                type="button"
                className="modal-close"
                data-cy="settings-close-btn"
                aria-label="Close settings"
                disabled={isSettingsSaving || isLoggingOut}
                onClick={handleCloseSettings}
              >
                ×
              </button>
            </div>
            <form className="modal-form" onSubmit={handleSettingsSubmit}>
              <label htmlFor="settings-fullname">Full name</label>
              <input
                id="settings-fullname"
                data-cy="settings-name"
                type="text"
                autoComplete="name"
                value={settingsFullname}
                onChange={(event) => {
                  setSettingsFullname(event.target.value);
                  setSettingsSuccess(false);
                }}
                disabled={isSettingsSaving || isLoggingOut}
                required
              />
              <label htmlFor="settings-email">Email</label>
              <input
                id="settings-email"
                data-cy="settings-email"
                type="email"
                autoComplete="email"
                value={settingsEmail}
                onChange={(event) => {
                  setSettingsEmail(event.target.value);
                  setSettingsSuccess(false);
                }}
                disabled={isSettingsSaving || isLoggingOut}
                required
              />
              {settingsError && (
                <p className="form-error" data-cy="settings-error" role="alert">
                  {settingsError}
                </p>
              )}
              {settingsSuccess && (
                <p
                  className="form-success"
                  data-cy="settings-success"
                  role="status"
                >
                  Account updated
                </p>
              )}
              <button
                type="submit"
                className="primary-btn"
                data-cy="settings-save-btn"
                disabled={isSettingsSaving || isLoggingOut}
              >
                {isSettingsSaving ? "Saving..." : "Save"}
              </button>
            </form>
            <div className="settings-footer">
              {logoutError && (
                <p className="form-error" role="alert">
                  {logoutError}
                </p>
              )}
              <button
                type="button"
                className="logout-btn"
                data-cy="settings-logout-btn"
                onClick={handleLogout}
                disabled={isLoggingOut || isSettingsSaving}
              >
                {isLoggingOut ? "Logging out..." : "Log out"}
              </button>
            </div>
          </section>
        </div>
      )}
      <aside className="sidebar" data-cy="conversation-list">
        <h2>Chat485</h2>
        <button
          type="button"
          className="new-chat-btn"
          data-cy="new-conversation-btn"
          onClick={handleNewChat}
        >
          New Chat
        </button>
        <nav>
          <ul>
            {conversations.map((conversation) => (
              <li
                key={conversation.uuid}
                data-cy="conversation-item"
                aria-current={
                  selectedConversation === conversation.uuid
                    ? "page"
                    : undefined
                }
              >
                <button
                  type="button"
                  className="conversation-title"
                  onClick={() => handleSelectConversation(conversation.uuid)}
                >
                  {conversation.title || "New conversation"}
                </button>
                <button
                  type="button"
                  className="delete-conversation-btn"
                  data-cy="delete-conversation-btn"
                  aria-label={`Delete ${
                    conversation.title || "New conversation"
                  }`}
                  onClick={() => handleDeleteConversation(conversation.uuid)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </nav>
        {!isAuthLoading && currentUser && (
          <div className="sidebar-user">
            <span data-cy="user-menu-name">{currentUser.fullname}</span>
            <button
              type="button"
              data-cy="settings-btn"
              onClick={handleOpenSettings}
            >
              <span>Settings</span>
              <span aria-hidden="true">⚙</span>
            </button>
          </div>
        )}
      </aside>
      <main className="chat-area">
        <section className="messages">
          {selectedConversation ? (
            <div
              ref={messageListRef}
              className="message-list"
              data-cy="message-list"
            >
              {Boolean(nextMessagesUrl) && (
                <button
                  type="button"
                  data-cy="message-list-load-more"
                  onClick={handleLoadOlderMessages}
                  disabled={isLoadingOlder}
                >
                  {isLoadingOlder ? "Loading..." : "Load Older Messages"}
                </button>
              )}
              {messages.map((message) => (
                <div key={message.messageid} className="message-entry">
                  <div
                    className="message"
                    data-cy={
                      message.role === "user"
                        ? "message-user"
                        : "message-assistant"
                    }
                  >
                    <strong>{message.role}</strong>
                    <div className="markdown-content" data-cy="message-content">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                  {message.clientStatus === "failed" && (
                    <p
                      className="message-error"
                      data-cy="message-error"
                      role="alert"
                    >
                      Something went wrong, please try again.
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="welcome-state">
              <h1>Welcome to Chat485!</h1>
              <p>Select a conversation or start a new chat.</p>
            </div>
          )}
        </section>
        <form
          className="message-form"
          data-cy="message-input"
          onSubmit={handleSendMessage}
        >
          <textarea
            ref={textareaRef}
            placeholder="Type a message..."
            aria-label="Message"
            value={messageInput}
            onChange={(event) => setMessageInput(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                event.currentTarget.form.requestSubmit();
              }
            }}
            rows={1}
          />
          <select
            aria-label="Model"
            data-cy="model-selector"
            value={selectedModel}
            onChange={(event) => setSelectedModel(event.target.value)}
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.id}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={
              isSending || selectedConversation === null || !messageInput.trim()
            }
          >
            {isSending ? "Sending..." : "Send"}
          </button>
        </form>
      </main>
    </div>
  );
}
const root = createRoot(document.getElementById("reactEntry"));
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
