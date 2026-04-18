import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Send, X, MessageSquare } from 'lucide-react';
import { chatbotApi } from '../api/chatbot.api';
import { ChatMessage, ChatResponse } from '../models/chatbot.model';
import { formatIsoTimestampsInText } from '../utils/format-chat-content';
import styles from './Chatbot.module.scss';
import clsx from 'clsx';

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatbotOnline, setChatbotOnline] = useState(true);
  const [sessionId] = useState(() => crypto.randomUUID());
  
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const { isError } = useQuery({
    queryKey: ['chatbot-health'],
    queryFn: chatbotApi.checkHealth,
    retry: false,
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isError) {
      setChatbotOnline(false);
      setMessages([{
        id: crypto.randomUUID(),
        sender: 'ai',
        content: 'Dịch vụ chatbot hiện chưa sẵn sàng. Bạn có thể thử lại sau ít phút.',
        timestamp: new Date(),
        suggestions: [],
      }]);
    } else {
      setChatbotOnline(true);
      setMessages([{
        id: crypto.randomUUID(),
        sender: 'ai',
        content: 'Xin chào! Tôi là AMS AI Assistant. Tôi có thể giúp bạn tra cứu thông tin chấm công, nghỉ phép và các quy định của công ty. Bạn cần hỗ trợ gì?',
        timestamp: new Date(),
        suggestions: ['Xem chấm công hôm nay', 'Số ngày phép còn lại', 'Chính sách làm thêm giờ'],
      }]);
    }
  }, [isError]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 50);
    }
  }, [isOpen]);

  const { mutate: sendMessageMutation, isPending: isTyping } = useMutation({
    mutationFn: (text: string) => chatbotApi.sendMessage({ message: text, session_id: sessionId, locale: 'vi' }),
    onSuccess: (response: ChatResponse) => {
      const display = formatIsoTimestampsInText(response.message || '');
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: 'ai',
          content: display,
          timestamp: new Date(),
          suggestions: response.suggestions || [],
        }
      ]);
      setTimeout(scrollToBottom, 50);
    },
    onError: () => {
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: 'ai',
          content: 'Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại sau.',
          timestamp: new Date(),
          suggestions: [],
        }
      ]);
      setTimeout(scrollToBottom, 50);
    }
  });

  const handleSendMessage = (text?: string) => {
    const content = (text ?? inputText).trim();
    if (!content || isTyping || !chatbotOnline) return;

    setMessages(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        sender: 'user',
        content,
        timestamp: new Date(),
      }
    ]);
    setInputText('');
    setTimeout(scrollToBottom, 50);

    sendMessageMutation(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <button
        className={clsx(styles['chatbot-fab'], isOpen && styles['chatbot-fab--open'])}
        id="chatbot-fab-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle AI Assistant"
      >
        {!isOpen ? (
          <MessageSquare fill="none" strokeWidth={2} className="w-[26px] h-[26px]" />
        ) : (
          <X strokeWidth={2.5} className="w-[22px] h-[22px]" />
        )}
      </button>

      <div className={clsx(styles['chatbot-window'], isOpen && styles['chatbot-window--visible'])} role="dialog" aria-label="AMS AI Assistant">
        <div className={styles['chatbot-header']}>
          <div className={styles['chatbot-header__info']}>
            <div className={styles['chatbot-header__avatar']}>
              <MessageSquare className="w-[18px] h-[18px]" strokeWidth={2} />
            </div>
            <div>
              <div className={styles['chatbot-header__name']}>AMS AI Assistant</div>
              <div className={styles['chatbot-header__status']}>
                <span className={styles['chatbot-status-dot']}></span>
                Trực tuyến
              </div>
            </div>
          </div>
          <button className={styles['chatbot-header__close']} onClick={() => setIsOpen(false)} aria-label="Close chat">
            <X strokeWidth={2.5} className="w-[18px] h-[18px]" />
          </button>
        </div>

        <div className={styles['chatbot-body']} ref={messagesContainerRef}>
          {messages.map((msg) => (
            <React.Fragment key={msg.id}>
              {msg.sender === 'ai' ? (
                <div className={clsx(styles['chatbot-message'], styles['chatbot-message--ai'])}>
                  <div className={styles['chatbot-message__avatar']}>AI</div>
                  <div className={styles['chatbot-message__content-wrap']}>
                    <div className={clsx(styles['chatbot-message__bubble'], styles['chatbot-message__bubble--ai'])}>
                      {msg.content}
                    </div>
                    <div className={styles['chatbot-message__time']}>{formatTime(msg.timestamp)}</div>
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className={styles['chatbot-suggestions']}>
                        {msg.suggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            className={styles['chatbot-suggestion-btn']}
                            onClick={() => handleSendMessage(suggestion)}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className={clsx(styles['chatbot-message'], styles['chatbot-message--user'])}>
                  <div className={clsx(styles['chatbot-message__content-wrap'], styles['chatbot-message__content-wrap--user'])}>
                    <div className={clsx(styles['chatbot-message__bubble'], styles['chatbot-message__bubble--user'])}>
                      {msg.content}
                    </div>
                    <div className={clsx(styles['chatbot-message__time'], styles['chatbot-message__time--right'])}>
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}

          {isTyping && (
            <div className={clsx(styles['chatbot-message'], styles['chatbot-message--ai'], styles['chatbot-typing'])}>
              <div className={styles['chatbot-message__avatar']}>AI</div>
              <div className={clsx(styles['chatbot-message__bubble'], styles['chatbot-message__bubble--ai'])}>
                <span className={styles['typing-dot']}></span>
                <span className={styles['typing-dot']}></span>
                <span className={styles['typing-dot']}></span>
              </div>
            </div>
          )}
        </div>

        <div className={styles['chatbot-footer']}>
          <div className={styles['chatbot-input-wrap']}>
            <textarea
              className={styles['chatbot-input']}
              id="chatbot-input"
              placeholder="Nhập câu hỏi của bạn..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isTyping || !chatbotOnline}
            />
            <button
              className={styles['chatbot-send-btn']}
              id="chatbot-send-btn"
              disabled={!inputText.trim() || isTyping || !chatbotOnline}
              onClick={() => handleSendMessage()}
              aria-label="Send message"
            >
              <Send strokeWidth={2} className="w-[18px] h-[18px]" />
            </button>
          </div>
          <div className={styles['chatbot-footer__hint']}>Enter để gửi • Shift+Enter xuống dòng</div>
        </div>
      </div>
    </>
  );
};

export default Chatbot;
