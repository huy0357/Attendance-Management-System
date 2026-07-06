import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Send, X, MessageSquare, Minimize2, Maximize2, Expand } from 'lucide-react';
import { chatbotApi } from '../api/chatbot.api';
import { ChatMessage, ChatResponse } from '../models/chatbot.model';
import { formatIsoTimestampsInText } from '../utils/format-chat-content';
import styles from './Chatbot.module.scss';
import clsx from 'clsx';
import { v4 as uuid } from 'uuid';

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chatWindowStyle, setChatWindowStyle] = useState<React.CSSProperties>({});
  
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatbotOnline, setChatbotOnline] = useState(true);
  const [sessionId] = useState(() => uuid());
  
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  // Drag state and refs
  const [position, setPosition] = useState<{ x: number, y: number } | null>(null);
  const dragRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
    moved: false,
    lastX: 0,
    lastY: 0,
  });
  const wasDraggedRef = useRef(false);

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
        id: uuid(),
        sender: 'ai',
        content: 'Dịch vụ chatbot hiện chưa sẵn sàng. Bạn có thể thử lại sau ít phút.',
        timestamp: new Date(),
        suggestions: [],
      }]);
    } else {
      setChatbotOnline(true);
      setMessages([{
        id: uuid(),
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
    let timeoutId: ReturnType<typeof setTimeout>;
    if (isOpen) {
      timeoutId = setTimeout(scrollToBottom, 50);
      
      // Smart positioning based on FAB placement
      if (fabRef.current && !isFullscreen) {
        if (isMaximized) {
          // Centered for maximized mode
          setChatWindowStyle({ top: '10vh', left: '20vw', bottom: 'auto', right: 'auto' });
        } else {
          const fabRect = fabRef.current.getBoundingClientRect();
          const ww = window.innerWidth;
          const wh = window.innerHeight;
          
          let top: number | 'auto' = 'auto';
          let bottom: number | 'auto' = 'auto';
          let left: number | 'auto' = 'auto';
          let right: number | 'auto' = 'auto';

          // FAB in bottom half -> open ABOVE it
          if (fabRect.top > wh / 2) bottom = wh - fabRect.top + 10;
          // FAB in top half -> open BELOW it
          else top = fabRect.bottom + 10;

          // FAB in right half -> align to right of FAB
          if (fabRect.left > ww / 2) right = ww - fabRect.right;
          // FAB in left half -> align to left of FAB
          else left = fabRect.left;

          setChatWindowStyle({
            top: top !== 'auto' ? `${top}px` : undefined,
            bottom: bottom !== 'auto' ? `${bottom}px` : undefined,
            left: left !== 'auto' ? `${left}px` : undefined,
            right: right !== 'auto' ? `${right}px` : undefined,
          });
        }
      }
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isOpen, position, isFullscreen, isMaximized]);

  const { mutate: sendMessageMutation, isPending: isTyping } = useMutation({
    mutationFn: (text: string) => chatbotApi.sendMessage({ message: text, session_id: sessionId, locale: 'vi' }),
    onSuccess: (response: ChatResponse) => {
      const display = formatIsoTimestampsInText(response.message || '');
      setMessages(prev => [
        ...prev,
        {
          id: uuid(),
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
          id: uuid(),
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
        id: uuid(),
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

  // ── ZERO-LATENCY DRAG & DROP LOGIC ─────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    
    const rect = target.getBoundingClientRect();
    const currentX = position?.x ?? rect.left;
    const currentY = position?.y ?? rect.top;
    
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initX: currentX,
      initY: currentY,
      moved: false,
      lastX: currentX,
      lastY: currentY,
    };
    wasDraggedRef.current = false;

    // Temporarily halt CSS transition physically on the DOM for zero-latency sync
    if (fabRef.current) {
      fabRef.current.style.transition = 'none';
      fabRef.current.style.transform = 'scale(1.05)'; // Keep hover scale during drag
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current.isDragging) return;

    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;
    
    // Distance check to differentiate drag vs click (5px tolerance)
    if (!dragRef.current.moved && Math.hypot(deltaX, deltaY) > 5) {
      dragRef.current.moved = true;
      wasDraggedRef.current = true;
    }

    if (dragRef.current.moved) {
      const btnW = fabRef.current?.offsetWidth || 60;
      const btnH = fabRef.current?.offsetHeight || 60;
      
      const newX = dragRef.current.initX + deltaX;
      const newY = dragRef.current.initY + deltaY;
      
      // Calculate boundaries
      const limX = Math.max(0, Math.min(newX, window.innerWidth - btnW));
      const limY = Math.max(0, Math.min(newY, window.innerHeight - btnH));
      
      // Hardware-level direct style assignment bypassing Virtual DOM entirely
      if (fabRef.current) {
        fabRef.current.style.left = `${limX}px`;
        fabRef.current.style.top = `${limY}px`;
        fabRef.current.style.right = 'auto';
        fabRef.current.style.bottom = 'auto';
      }
      
      dragRef.current.lastX = limX;
      dragRef.current.lastY = limY;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current.isDragging) return;
    dragRef.current.isDragging = false;
    e.currentTarget.releasePointerCapture(e.pointerId);

    // Restore CSS transition engine
    if (fabRef.current) {
      fabRef.current.style.transition = '';
      fabRef.current.style.transform = '';
    }

    // Commit final location to React State for resize stability
    if (dragRef.current.moved) {
      setPosition({ x: dragRef.current.lastX, y: dragRef.current.lastY });
    }
  };

  const handleFabClick = (e: React.MouseEvent) => {
    if (wasDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      wasDraggedRef.current = false; // Reset
      return;
    }
    setIsOpen(!isOpen);
  };

  return (
    <>
      <button
        ref={fabRef}
        className={clsx(styles['chatbot-fab'], isOpen && styles['chatbot-fab--open'])}
        id="chatbot-fab-btn"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleFabClick}
        style={{
          position: position ? 'fixed' : undefined,
          left: position ? `${position.x}px` : undefined,
          top: position ? `${position.y}px` : undefined,
          right: position ? 'auto' : undefined,
          bottom: position ? 'auto' : undefined,
          touchAction: 'none', // Critical for dragging on mobile
          cursor: dragRef.current.moved ? 'grabbing' : 'pointer'
        }}
        aria-label="Toggle AI Assistant"
      >
        {!isOpen ? (
          <MessageSquare fill="none" strokeWidth={2} className="w-[26px] h-[26px]" />
        ) : (
          <X strokeWidth={2.5} className="w-[22px] h-[22px]" />
        )}
      </button>

      {isOpen && (isMaximized || isFullscreen) && (
        <div 
          className={styles['chatbot-backdrop']} 
          onClick={() => { setIsMaximized(false); setIsFullscreen(false); }} 
        />
      )}

      <div 
        className={clsx(
          styles['chatbot-window'], 
          isOpen && styles['chatbot-window--visible'],
          isMaximized && styles['chatbot-window--maximized'],
          isFullscreen && styles['chatbot-window--fullscreen']
        )} 
        style={chatWindowStyle}
        role="dialog" 
        aria-label="AMS AI Assistant"
      >
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
          
          <div className={styles['chatbot-header__controls']}>
            <button className={styles['chatbot-header__control-btn']} onClick={() => setIsOpen(false)} title="Minimize">
              <Minimize2 className="w-[14px] h-[14px]" />
            </button>
            <button className={styles['chatbot-header__control-btn']} onClick={() => { setIsMaximized(!isMaximized); setIsFullscreen(false); }} title={isMaximized ? "Restore" : "Maximize"}>
              <Maximize2 className="w-[14px] h-[14px]" />
            </button>
            <button className={styles['chatbot-header__control-btn']} onClick={() => { setIsFullscreen(!isFullscreen); setIsMaximized(false); }} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
              <Expand className="w-[14px] h-[14px]" />
            </button>
            <button className={styles['chatbot-header__close']} onClick={() => setIsOpen(false)} title="Close">
              <X strokeWidth={2.5} className="w-[18px] h-[18px]" />
            </button>
          </div>
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
