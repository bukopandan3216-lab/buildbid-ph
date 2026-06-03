import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { messagesAPI } from "../services/api";
import {
  Search, Send, Paperclip, MoreVertical, Phone, Video,
  CheckCheck, Check, Circle, Image
} from "lucide-react";

// Conversations and messages are loaded from API

export default function Messages() {
  const { user } = useAuth();
  const { socket } = useNotifications();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // load conversations on mount
  function getAvatarValue(partner) {
    if (!partner) return "U";
    const avatar = partner.avatar;
    if (typeof avatar === "string" && (avatar.startsWith("/") || avatar.startsWith("http") || avatar.match(/\.(png|jpg|jpeg|gif)$/i))) {
      return avatar;
    }
    return partner.name?.charAt(0).toUpperCase() || "U";
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await messagesAPI.conversations();
        if (!mounted) return;
        const convs = (res.data.conversations || []).map((c) => ({
          id: c.partner.id,
          partnerId: c.partner.id,
          name: c.partner.name || c.partner.email || "User",
          avatar: getAvatarValue(c.partner),
          lastMessage: c.lastMessage?.content || "",
          unread: c.unreadCount || 0,
          online: false,
          role: c.partner.role,
        }));
        setConversations(convs);
        if (convs.length && !selected) {
          setSelected(convs[0]);
        }
      } catch (e) {
        console.error("Failed to load conversations", e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on("new_message", (msg) => {
      const senderId = msg.senderId || msg.sender?.id;
      if (selected && senderId === selected.partnerId) {
        setMessages((prev) => [...prev, { ...msg, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
      }
      setConversations((prev) =>
        prev.map((c) =>
          c.partnerId === senderId
            ? { ...c, lastMessage: msg.content, unread: (c.unread || 0) + 1 }
            : c
        )
      );
    });
    socket.on("user_typing", ({ senderId, isTyping: typing }) => {
      if (selected && senderId === selected.partnerId) setIsTyping(typing);
    });
    return () => {
      socket.off("new_message");
      socket.off("user_typing");
    };
  }, [socket, selected]);

  async function loadThread(conv) {
    try {
      const res = await messagesAPI.thread(conv.partnerId);
      setMessages((res.data.messages || []).map((m) => ({
        id: m.id,
        senderId: m.senderId,
        content: m.content,
        time: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        read: m.isRead,
      })));
    } catch (e) {
      console.error("Failed to load thread", e);
      setMessages([]);
      if (e.response?.status === 403) {
        setSelected(null);
      }
    }
  }

  function selectConversation(conv) {
    setSelected(conv);
    setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, unread: 0 } : c)));
  }

  useEffect(() => {
    if (selected) {
      loadThread(selected);
    }
  }, [selected]);

  function handleInputChange(e) {
    setInput(e.target.value);
    if (socket && selected) {
      socket.emit("typing", { receiverId: selected.partnerId, isTyping: true });
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        socket.emit("typing", { receiverId: selected.partnerId, isTyping: false });
      }, 1500);
    }
  }

  function sendMessage() {
    if (!input.trim()) return;
    const content = input.trim();
    // optimistic UI
    const temp = { id: `tmp_${Date.now()}`, senderId: user.id, content, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), read: false };
    setMessages((prev) => [...prev, temp]);
    setConversations((prev) => prev.map((c) => c.id === selected.id ? { ...c, lastMessage: content } : c));
    setInput("");
    messagesAPI.send(selected.partnerId, content).catch((err) => {
      console.error("Failed to send message", err);
    });
  }

  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-120px)] flex rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white">
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0 border-r border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 mb-3">Messages</h2>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-2 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 border border-gray-200"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => selectConversation(conv)}
              className={`w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                selected?.id === conv.id ? "bg-orange-50 border-l-2 border-l-orange-500" : ""
              }`}
            >
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-orange-100 font-semibold text-sm">
              {typeof conv.avatar === "string" && (conv.avatar.startsWith("/") || conv.avatar.startsWith("http")) ? (
                <img src={conv.avatar} alt={conv.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-orange-700">{conv.avatar}</span>
              )}
            </div>
                {conv.online && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-medium text-gray-800 text-sm truncate">{conv.name}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-1">{conv.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 truncate">{conv.lastMessage}</p>
                  {conv.unread > 0 && (
                    <span className="ml-1 flex-shrink-0 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {conv.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      {selected ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-orange-100 flex items-center justify-center font-semibold text-sm">
                  {typeof selected.avatar === "string" && (selected.avatar.startsWith("/") || selected.avatar.startsWith("http")) ? (
                    <img src={selected.avatar} alt={selected.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-orange-700">{selected.avatar}</span>
                  )}
                </div>
                {selected.online && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{selected.name}</p>
                <p className="text-xs text-gray-400">
                  {selected.online ? (
                    <span className="text-green-500">Online</span>
                  ) : "Last seen recently"}{" "}
                  {selected.project && `· ${selected.project}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-400 hover:bg-gray-50 rounded-xl"><Phone size={16} /></button>
              <button className="p-2 text-gray-400 hover:bg-gray-50 rounded-xl"><Video size={16} /></button>
              <button className="p-2 text-gray-400 hover:bg-gray-50 rounded-xl"><MoreVertical size={16} /></button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50">
            {messages.map((msg) => {
              const isMe = msg.senderId === user.id;
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  {!isMe && (
                    <div className="w-7 h-7 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0 self-end">
                      {selected.avatar}
                    </div>
                  )}
                  <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                      isMe
                        ? "bg-orange-500 text-white rounded-br-sm"
                        : "bg-white text-gray-800 shadow-sm rounded-bl-sm"
                    }`}>
                      {msg.content}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-gray-400">{msg.time}</span>
                      {isMe && (
                        msg.read
                          ? <CheckCheck size={12} className="text-orange-400" />
                          : <Check size={12} className="text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {isTyping && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-xs font-bold">
                  {selected.avatar}
                </div>
                <div className="bg-white rounded-2xl px-4 py-2.5 shadow-sm flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-gray-100 bg-white">
            <div className="flex items-center gap-2 bg-gray-50 rounded-2xl border border-gray-200 px-3 py-2">
              <button className="text-gray-400 hover:text-orange-500 transition-colors p-1">
                <Paperclip size={16} />
              </button>
              <button className="text-gray-400 hover:text-orange-500 transition-colors p-1">
                <Image size={16} />
              </button>
              <input
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="bg-orange-500 text-white p-2 rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-40"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-3">💬</div>
            <p className="font-medium text-gray-500">Select a conversation</p>
            <p className="text-sm mt-1">Choose from your existing messages</p>
          </div>
        </div>
      )}
    </div>
  );
}
