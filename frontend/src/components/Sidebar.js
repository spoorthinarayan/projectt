export default function Sidebar({
    chats,
    activeChat,
    setActiveChat,
    createNewChat,
}) {
    return (
        <div className="sidebar">
            <button className="new-btn" onClick={createNewChat}>
                + New Chat
            </button>

            <div className="chat-list">
                {chats.map((chat) => (
                    <div
                        key={chat.id}
                        className={`chat-item ${activeChat === chat.id ? "active" : ""
                            }`}
                        onClick={() => setActiveChat(chat.id)}
                    >
                        <div className="chat-title">{chat.title}</div>
                        <div className="chat-meta">
                            {chat.messages.length} messages
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}