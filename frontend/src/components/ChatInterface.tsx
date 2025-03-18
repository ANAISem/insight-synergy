import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import type { Socket } from "socket.io-client";
import "./ChatInterface.css";

const SERVER_URL = "http://localhost:5001"; // API & WebSocket-Server für Insight Synergy Chat

interface Message {
    text: string;
    sender?: string;
    expert?: string;
}

const ChatInterface = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [selectedExpert, setSelectedExpert] = useState("general");
    // Verwenden des Typs für den Socket
    const socketRef = useRef<any>(null);

    useEffect(() => {
        // Socket initialisieren
        socketRef.current = io(SERVER_URL);
        
        // Sicherstellung, dass wir einen gültigen Socket haben
        const socket = socketRef.current;
        
        // Socket-Events registrieren
        socket.on("chat_message", (message: Message) => {
            setMessages((prev) => [...prev, message]);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const sendMessage = () => {
        if (input.trim() === "") return;
        const messageData = {
            text: input,
            expert: selectedExpert,
        };
        socketRef.current?.emit("chat_message", messageData);
        setMessages((prev) => [...prev, { text: input, sender: "user" }]);
        setInput("");
    };

    return (
        <div className="chat-container">
            <h2>Insight Synergy Chat</h2>
            <div className="messages">
                {messages.map((msg, index) => (
                    <div key={index} className={msg.sender === "user" ? "user-message" : "ai-message"}>
                        {msg.text}
                    </div>
                ))}
            </div>
            <select onChange={(e) => setSelectedExpert(e.target.value)}>
                <option value="general">Allgemeiner KI-Experte</option>
                <option value="debugging">Debugging-Spezialist</option>
                <option value="architecture">Software-Architekt</option>
            </select>
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Gib deine Nachricht ein..."
            />
            <button onClick={sendMessage}>Senden</button>
        </div>
    );
};

export default ChatInterface; 