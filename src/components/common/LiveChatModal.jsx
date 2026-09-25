import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot, User, CheckCheck, Sparkles, Phone, MessageSquare } from 'lucide-react';
import './LiveChatModal.scss';

export const LiveChatModal = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'agent',
      text: 'Hello! Welcome to PMart 24x7 Priority Support. How can we assist you with your 10-minute grocery delivery today?',
      time: 'Just now'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const quickPrompts = [
    'Where is my active order?',
    'Report missing or damaged item',
    'Payment & refund query',
    'Change delivery address'
  ];

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSendMessage = (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Realistic smart response
    setTimeout(() => {
      let replyText = "Thank you for reaching out! Our dedicated support specialist is reviewing your account. For active orders, your rider is equipped with GPS tracking and arrives within the 10-15 min window.";
      
      const lower = text.toLowerCase();
      if (lower.includes('where') || lower.includes('order')) {
        replyText = "Your latest order #PM-89214 is currently 'Out for Delivery' with rider Ramesh Kumar. Estimated arrival in 4 minutes! You can track live progress under 'Track Order'.";
      } else if (lower.includes('missing') || lower.includes('damaged')) {
        replyText = "We are very sorry for the inconvenience! We have processed a 100% instant refund credit of the affected item to your PMart Wallet. No questions asked.";
      } else if (lower.includes('refund') || lower.includes('payment')) {
        replyText = "All PMart refunds are processed automatically within 2 hours to UPI/card, or instantly to your PMart Store Credit.";
      } else if (lower.includes('address')) {
        replyText = "Address adjustments can be made within 2 minutes of placing an order. Our hub dispatcher has been alerted.";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'agent',
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setIsTyping(false);
    }, 1200);
  };

  return (
    <AnimatePresence>
      <div className="modal-overlay" onClick={onClose}>
        <motion.div
          className="modal-content live-chat-modal"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="chat-modal-header">
            <div className="agent-info">
              <div className="agent-avatar-wrap">
                <div className="agent-avatar">
                  <Bot size={20} />
                </div>
                <span className="online-indicator" />
              </div>
              <div>
                <h3 className="agent-name">PMart Live Help Desk</h3>
                <p className="agent-status">Sneha R. · Online · Typical reply &lt; 1m</p>
              </div>
            </div>
            <button
              type="button"
              className="chat-close-btn"
              onClick={onClose}
              aria-label="Close chat"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Prompts Bar */}
          <div className="quick-prompts-bar">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                className="prompt-chip"
                onClick={() => handleSendMessage(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Messages Scroll Area */}
          <div className="chat-messages-area">
            {messages.map((m) => (
              <div key={m.id} className={`chat-bubble-row ${m.sender}`}>
                <div className="bubble-content">
                  <p className="bubble-text">{m.text}</p>
                  <span className="bubble-time">
                    {m.time}
                    {m.sender === 'user' && <CheckCheck size={12} className="read-icon" />}
                  </span>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="chat-bubble-row agent">
                <div className="bubble-content typing">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            className="chat-input-bar"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <input
              type="text"
              className="form-control chat-input"
              placeholder="Type your question or issue..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              className="btn btn-primary send-btn"
              disabled={!inputText.trim()}
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
