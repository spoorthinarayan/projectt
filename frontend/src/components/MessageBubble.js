export default function MessageBubble({ msg }) {
    return (
        <div className={`msg ${msg.role}`}>
            <div className="bubble">{msg.text}</div>
        </div>
    );
}