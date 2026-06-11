import { useState } from "react";
import { askQuestion } from "../utils/api";
import MessageBubble from "./MessageBubble";

export default function ChatWindow({ chat, updateChat }) {
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    const sendMessage = async () => {
        if (!input.trim()) return;

        // 🔥 SAFE GUARD
        if (!chat) return;

        const userMsg = {
            role: "user",
            text: input,
        };

        const updated = [...chat.messages, userMsg];
        updateChat(chat.id, updated);

        setInput("");
        setLoading(true);

        try {
            const res = await askQuestion(input);

            const aiMsg = {
                role: "ai",
                text: res.answer,
            };

            updateChat(chat.id, [...updated, aiMsg]);
        } catch (err) {
            updateChat(chat.id, [
                ...updated,
                {
                    role: "ai",
                    text: "Server error or backend not running",
                },
            ]);
        }

        setLoading(false);
    };

    return (
        <div className="main">
            <div className="chat-area">
                {!chat && (
                    <div className="empty">
                        Create a new chat to start
                    </div>
                )}

                {chat?.messages.map((msg, i) => (
                    <MessageBubble key={i} msg={msg} />
                ))}

                {loading && (
                    <div className="thinking">
                        Thinking...
                    </div>
                )}
            </div>

            <div className="input-area">
                <textarea
                    value={input}
                    placeholder="Ask anything..."
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                        }
                    }}
                />

                <button onClick={sendMessage}>
                    Send
                </button>
            </div>
        </div>
    );
}