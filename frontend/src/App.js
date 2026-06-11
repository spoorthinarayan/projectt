import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const CHATS_KEY = "chats";
const ACTIVE_CHAT_KEY = "activeChatId";
const ANSWER_PREVIEW_LIMIT = 420;

function makeChatTitle(messages, fallbackIndex) {
  const firstUserMessage = messages.find((message) => message.role === "user");

  if (!firstUserMessage?.text) {
    return `Chat ${fallbackIndex}`;
  }

  const title = firstUserMessage.text.trim().replace(/\s+/g, " ");
  return title.length > 42 ? `${title.slice(0, 42)}...` : title;
}

function formatChatTime(value) {
  if (!value) {
    return "Just now";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalizeChats(rawChats) {
  if (!Array.isArray(rawChats)) {
    return [];
  }

  return rawChats.map((chat, index) => {
    if (Array.isArray(chat)) {
      const fallbackIndex = index + 1;
      return {
        id: `chat-${Date.now()}-${index}`,
        title: makeChatTitle(chat, fallbackIndex),
        messages: chat,
        updatedAt: new Date().toISOString(),
        pinned: false,
      };
    }

    const messages = Array.isArray(chat?.messages) ? chat.messages : [];
    const fallbackIndex = index + 1;

    return {
      id: chat?.id || `chat-${Date.now()}-${index}`,
      title: chat?.title || makeChatTitle(messages, fallbackIndex),
      messages,
      updatedAt: chat?.updatedAt || new Date().toISOString(),
      pinned: Boolean(chat?.pinned),
    };
  });
}

function createEmptyChat(count) {
  return {
    id: `chat-${Date.now()}-${count}`,
    title: `New Chat ${count + 1}`,
    messages: [],
    updatedAt: new Date().toISOString(),
    pinned: false,
  };
}

function sanitizeFilename(name) {
  return name.replace(/[<>:"/\\|?*]+/g, "-").trim() || "askai-chat";
}

function cleanAnswerText(text) {
  if (!text) {
    return "";
  }

  let cleaned = text.replace(/\r\n/g, "\n").trim();
  cleaned = cleaned.replace(/\n?TEXTBOOK:\s*[\s\S]*$/i, "");
  cleaned = cleaned.replace(/\n?ANSWER:\s*[\s\S]*$/i, "");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  return cleaned.trim();
}

function formatAnswerSections(text) {
  if (!text) {
    return [];
  }

  const normalized = text.replace(/\r\n/g, "\n").trim();
  const sections = [];
  const markers = ["KEY POINTS:", "SIMPLE EXPLANATION:"];

  let remaining = normalized;

  markers.forEach((marker, index) => {
    const markerIndex = remaining.indexOf(marker);

    if (markerIndex === -1) {
      return;
    }

    const afterMarker = remaining.slice(markerIndex + marker.length);
    const nextMarker = markers[index + 1];
    const nextIndex = nextMarker ? afterMarker.indexOf(nextMarker) : -1;
    const content =
      nextIndex === -1 ? afterMarker.trim() : afterMarker.slice(0, nextIndex).trim();

    sections.push({
      title: marker.replace(":", ""),
      content,
    });
  });

  if (sections.length > 0) {
    return sections;
  }

  return [
    {
      title: "Answer",
      content: normalized,
    },
  ];
}

function renderSectionContent(content) {
  return content.split("\n").map((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      return <div key={index} className="answer-spacer" />;
    }

    if (trimmed.startsWith("-")) {
      return (
        <div key={index} className="answer-bullet">
          {trimmed}
        </div>
      );
    }

    return (
      <div key={index} className="answer-line">
        {trimmed}
      </div>
    );
  });
}

function sortChats(items) {
  return [...items].sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1;
    }

    return new Date(right.updatedAt) - new Date(left.updatedAt);
  });
}

function getAnswerPreview(text, expanded) {
  if (expanded || !text || text.length <= ANSWER_PREVIEW_LIMIT) {
    return text;
  }

  return `${text.slice(0, ANSWER_PREVIEW_LIMIT).trim()}...`;
}

function App() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("");
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(null);
  const [loadingMoreInfoKey, setLoadingMoreInfoKey] = useState(null);
  const [questionMenuIndex, setQuestionMenuIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedAnswers, setExpandedAnswers] = useState({});
  const [toasts, setToasts] = useState([]);

  const chatAreaRef = useRef(null);

  const pushToast = (text) => {
    const id = `toast-${Date.now()}-${Math.random()}`;

    setToasts((prev) => [...prev, { id, text }]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 2200);
  };

  useEffect(() => {
    const savedChats = localStorage.getItem(CHATS_KEY);
    const savedActiveChatId = localStorage.getItem(ACTIVE_CHAT_KEY);

    if (!savedChats) {
      return;
    }

    const parsedChats = normalizeChats(JSON.parse(savedChats));
    const sortedChats = sortChats(parsedChats);
    setChats(sortedChats);

    if (
      savedActiveChatId &&
      sortedChats.some((chat) => chat.id === savedActiveChatId)
    ) {
      setActiveChatId(savedActiveChatId);
      return;
    }

    if (sortedChats.length > 0) {
      setActiveChatId(sortedChats[0].id);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    if (activeChatId) {
      localStorage.setItem(ACTIVE_CHAT_KEY, activeChatId);
    }
  }, [activeChatId]);

  const sortedChats = useMemo(() => sortChats(chats), [chats]);

  const visibleChats = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return sortedChats;
    }

    return sortedChats.filter((chat) => {
      const title = chat.title.toLowerCase();
      const content = chat.messages.map((message) => message.text).join(" ").toLowerCase();
      return title.includes(query) || content.includes(query);
    });
  }, [searchTerm, sortedChats]);

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) || null,
    [activeChatId, chats]
  );

  useEffect(() => {
    if (!chatAreaRef.current) {
      return;
    }

    chatAreaRef.current.scrollTo({
      top: chatAreaRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [activeChatId, activeChat?.messages?.length, loading, loadingMoreInfoKey]);

  const aiMessages = useMemo(
    () =>
      (activeChat?.messages || [])
        .map((message, index) => ({ ...message, index }))
        .filter((message) => message.role === "ai"),
    [activeChat]
  );

  useEffect(() => {
    if (!aiMessages.length) {
      setSelectedMessageIndex(null);
      return;
    }

    if (
      selectedMessageIndex === null ||
      !aiMessages.some((message) => message.index === selectedMessageIndex)
    ) {
      setSelectedMessageIndex(aiMessages[aiMessages.length - 1].index);
    }
  }, [aiMessages, selectedMessageIndex]);

  const updateChat = (chatId, updater) => {
    setChats((prevChats) =>
      prevChats.map((chat, index) => {
        if (chat.id !== chatId) {
          return chat;
        }

        const nextMessages =
          typeof updater === "function" ? updater(chat.messages) : updater;

        return {
          ...chat,
          messages: nextMessages,
          updatedAt: new Date().toISOString(),
          title:
            chat.messages.length === 0
              ? makeChatTitle(nextMessages, index + 1)
              : chat.title,
        };
      })
    );
  };

  const ensureActiveChat = () => {
    if (activeChat) {
      return activeChat;
    }

    const newChat = createEmptyChat(chats.length);
    setChats((prevChats) => sortChats([...prevChats, newChat]));
    setActiveChatId(newChat.id);
    return newChat;
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const currentInput = input.trim();
    const currentChat = ensureActiveChat();
    const userMsg = { role: "user", text: currentInput };

    updateChat(currentChat.id, (prevMessages) => [...prevMessages, userMsg]);
    setLoading(true);
    setLoadingLabel("Generating answer...");
    setQuestionMenuIndex(null);
    setInput("");

    try {
      const res = await fetch("http://127.0.0.1:8000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentInput }),
      });

      const data = await res.json();

      const aiMsg = {
        role: "ai",
        text: cleanAnswerText(data.answer),
        rawText: data.answer,
        question: currentInput,
        pages: data.pages || [],
        moreInfo: "",
        moreInfoVisible: false,
      };

      updateChat(currentChat.id, (prevMessages) => {
        const updated = [...prevMessages, aiMsg];
        setSelectedMessageIndex(updated.length - 1);
        return updated;
      });
    } catch (err) {
      updateChat(currentChat.id, (prevMessages) => [
        ...prevMessages,
        { role: "ai", text: "Server error" },
      ]);
    }

    setLoading(false);
    setLoadingLabel("");
  };

  const toggleMoreInfo = async (message, index) => {
    if (!activeChat) {
      return;
    }

    if (message.moreInfo) {
      updateChat(activeChat.id, (prevMessages) => {
        const updated = [...prevMessages];
        updated[index] = {
          ...updated[index],
          moreInfoVisible: !updated[index].moreInfoVisible,
        };
        return updated;
      });
      return;
    }

    const requestKey = `${activeChat.id}-${index}`;
    setLoadingMoreInfoKey(requestKey);
    setLoadingLabel("Fetching more info...");

    try {
      const res = await fetch("http://127.0.0.1:8000/more-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: message.question }),
      });

      const data = await res.json();

      updateChat(activeChat.id, (prevMessages) => {
        const updated = [...prevMessages];
        updated[index] = {
          ...updated[index],
          moreInfo: cleanAnswerText(data.answer),
          moreInfoVisible: true,
        };
        return updated;
      });
    } finally {
      setLoadingMoreInfoKey(null);
      setLoadingLabel(loading ? "Generating answer..." : "");
    }
  };

  const copyAnswer = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      pushToast("Answer copied");
    } catch (error) {
      window.prompt("Copy answer", text);
    }
  };

  const exportChat = () => {
    if (!activeChat?.messages?.length) {
      pushToast("No chat to export");
      return;
    }

    const content = activeChat.messages
      .map((message) => `${message.role.toUpperCase()}:\n${message.text}`)
      .join("\n\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizeFilename(activeChat.title || "askai-chat")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    pushToast("Chat exported");
  };

  const newChat = () => {
    const chat = createEmptyChat(chats.length);
    setChats((prevChats) => sortChats([...prevChats, chat]));
    setActiveChatId(chat.id);
    setSelectedMessageIndex(null);
    setQuestionMenuIndex(null);
    setInput("");
    pushToast("New chat created");
  };

  const renameChat = (chatId) => {
    const currentChat = chats.find((chat) => chat.id === chatId);
    const nextTitle = window.prompt("Rename chat", currentChat?.title || "");

    if (!nextTitle || !nextTitle.trim()) {
      return;
    }

    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat.id === chatId
          ? { ...chat, title: nextTitle.trim() }
          : chat
      )
    );
    pushToast("Chat renamed");
  };

  const deleteChat = (chatId) => {
    const targetChat = chats.find((chat) => chat.id === chatId);

    if (!targetChat) {
      return;
    }

    const confirmed = window.confirm(
      `Delete the full conversation "${targetChat.title}"?`
    );

    if (!confirmed) {
      return;
    }

    const remainingChats = sortChats(
      chats.filter((chat) => chat.id !== chatId)
    );

    setChats(remainingChats);
    setQuestionMenuIndex(null);
    setSelectedMessageIndex(null);

    if (activeChatId === chatId) {
      const nextActiveChatId = remainingChats[0]?.id || null;
      setActiveChatId(nextActiveChatId);

      if (!nextActiveChatId) {
        localStorage.removeItem(ACTIVE_CHAT_KEY);
      }
    }

    pushToast("Conversation deleted");
  };

  const togglePinChat = (chatId) => {
    setChats((prevChats) =>
      sortChats(
        prevChats.map((chat) =>
          chat.id === chatId
            ? { ...chat, pinned: !chat.pinned }
            : chat
        )
      )
    );

    const currentChat = chats.find((chat) => chat.id === chatId);
    pushToast(currentChat?.pinned ? "Chat unpinned" : "Chat pinned");
  };

  const deleteQuestionPair = (index) => {
    if (!activeChat) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this question and its linked answer?"
    );

    if (!confirmed) {
      return;
    }

    updateChat(activeChat.id, (prevMessages) => {
      const updated = [...prevMessages];
      updated.splice(index, 1);

      if (updated[index]?.role === "ai") {
        updated.splice(index, 1);
      }

      return updated;
    });

    setSelectedMessageIndex(null);
    setQuestionMenuIndex(null);
    pushToast("Question deleted");
  };

  const toggleAnswerExpanded = (key) => {
    setExpandedAnswers((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-card">
          <div className="brand-mark">A</div>
          <div>
            <div className="brand-title">AskAI</div>
            <div className="brand-subtitle">Book Intelligence</div>
          </div>
        </div>

        <button className="new-btn" onClick={newChat}>
          + New Chat
        </button>

        <div className="sidebar-label">Recent Chats</div>

        <input
          className="chat-search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search chats..."
        />

        <div className="chat-list">
          {visibleChats.map((chat, index) => (
            <div
              key={chat.id}
              className={`chat-item ${chat.id === activeChatId ? "active" : ""}`}
            >
              <button
                className="chat-main"
                onClick={() => {
                  setActiveChatId(chat.id);
                  setSelectedMessageIndex(null);
                  setQuestionMenuIndex(null);
                }}
              >
                <span className="chat-title-row">
                  <span className="chat-title">
                    {chat.title || `Chat ${index + 1}`}
                  </span>
                  {chat.pinned && <span className="pin-badge">Pinned</span>}
                </span>
                <span className="chat-meta">{formatChatTime(chat.updatedAt)}</span>
              </button>

              <div className="chat-controls">
                <button
                  className="rename-btn"
                  onClick={() => togglePinChat(chat.id)}
                  title={chat.pinned ? "Unpin chat" : "Pin chat"}
                >
                  {chat.pinned ? "Unpin" : "Pin"}
                </button>

                <button
                  className="rename-btn"
                  onClick={() => renameChat(chat.id)}
                  title="Rename chat"
                >
                  Edit
                </button>

                <button
                  className="rename-btn delete-chat-btn"
                  onClick={() => deleteChat(chat.id)}
                  title="Delete conversation"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="workspace">
        <section className="conversation-panel">
          <div className="workspace-topbar">
            <div>
              <div className="panel-kicker">Ask AI</div>
              <h1 className="panel-title">
                {activeChat?.title || "Start a fresh conversation"}
              </h1>
            </div>

            <div className="topbar-actions">
              <button className="ghost-btn" onClick={exportChat}>
                Export Chat
              </button>

              <div className={`status-pill ${loading ? "live" : ""}`}>
                {loading ? loadingLabel || "Generating answer..." : "Knowledge base ready"}
              </div>
            </div>
          </div>

          <div className="chat-area" ref={chatAreaRef}>
            {!activeChat?.messages?.length && (
              <div className="empty-state">
                <div className="empty-icon">+</div>
                <div className="empty-title">Ask from your indexed textbook</div>
                <div className="empty-text">
                  Ask one focused question at a time for the cleanest answer,
                  then use More Info only when you want deeper detail.
                </div>
              </div>
            )}

            {activeChat?.messages.map((msg, i) => {
              const requestKey = `${activeChat.id}-${i}`;
              const answerKey = `${activeChat.id}-${i}`;
              const isMoreInfoLoading = loadingMoreInfoKey === requestKey;
              const expanded = Boolean(expandedAnswers[answerKey]);
              const previewText = getAnswerPreview(msg.text, expanded);
              const isLongAnswer = msg.role === "ai" && msg.text.length > ANSWER_PREVIEW_LIMIT;

              return (
                <div
                  key={i}
                  className={`msg ${msg.role}`}
                  onClick={() => msg.role === "ai" && setSelectedMessageIndex(i)}
                >
                  <div className="avatar">{msg.role === "user" ? "U" : "AI"}</div>

                  <div
                    className="bubble"
                    onClick={(event) => {
                      if (msg.role === "user") {
                        event.stopPropagation();
                        setQuestionMenuIndex((prev) => (prev === i ? null : i));
                      }
                    }}
                  >
                    {msg.role === "ai" ? (
                      <div className="answer-sections">
                        {formatAnswerSections(previewText).map((section) => (
                          <div key={section.title} className="answer-section">
                            <div className="answer-section-title">{section.title}</div>
                            <div className="answer-section-body">
                              {renderSectionContent(section.content)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bubble-text">{msg.text}</div>
                    )}

                    {msg.pages && msg.pages.length > 0 && (
                      <div className="pages">
                        Pages: {msg.pages.join(", ")}
                      </div>
                    )}

                    {isLongAnswer && (
                      <button
                        className="link-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleAnswerExpanded(answerKey);
                        }}
                      >
                        {expanded ? "Show less" : "Show full answer"}
                      </button>
                    )}

                    {msg.moreInfoVisible && msg.moreInfo && (
                      <div className="more-box">{msg.moreInfo}</div>
                    )}

                    {msg.role === "ai" && isMoreInfoLoading && (
                      <div className="more-loading">
                        <div className="pulse-line short" />
                        <div className="pulse-line medium" />
                      </div>
                    )}

                    {msg.role === "ai" && msg.question && (
                      <div className="answer-actions">
                        <button
                          className="ghost-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            copyAnswer(msg.text);
                          }}
                        >
                          Copy Answer
                        </button>

                        <button
                          className="more-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleMoreInfo(msg, i);
                          }}
                          disabled={isMoreInfoLoading}
                        >
                          {isMoreInfoLoading
                            ? "Loading more info..."
                            : msg.moreInfoVisible
                            ? "Hide More Info"
                            : "More Info"}
                        </button>
                      </div>
                    )}

                    {msg.role === "user" && questionMenuIndex === i && (
                      <div className="question-actions">
                        <button
                          className="delete-action-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteQuestionPair(i);
                          }}
                        >
                          Delete question
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="msg ai">
                <div className="avatar">AI</div>
                <div className="bubble loading-bubble">
                  <div className="loading-label">{loadingLabel || "Generating answer..."}</div>
                  <div className="pulse-line short" />
                  <div className="pulse-line medium" />
                  <div className="pulse-line long" />
                </div>
              </div>
            )}
          </div>

          <div className="input-area">
            <div className="input-box">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask your medical doubt..."
                rows={1}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }

                  if (event.key === "Enter" && event.ctrlKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
              />

              <button onClick={handleSend}>Send</button>
            </div>
          </div>
        </section>
      </main>

      <div className="toast-stack">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            {toast.text}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
