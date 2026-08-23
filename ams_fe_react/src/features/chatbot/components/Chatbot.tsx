import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { 
  Send, 
  X, 
  MessageSquare, 
  Minimize2, 
  Maximize2, 
  Mic, 
  Volume2, 
  Square, 
  Menu, 
  Plus, 
  Trash2,
  Bot
} from 'lucide-react';
import { chatbotApi } from '../api/chatbot.api';
import { ChatMessage } from '../models/chatbot.model';
import { formatIsoTimestampsInText } from '../utils/format-chat-content';
import styles from './Chatbot.module.scss';
import clsx from 'clsx';
import { v4 as uuid } from 'uuid';
import axiosInstance from '../../../core/api/axiosInstance';

const renderMarkdown = (text: string) => {
  if (!text) return '';

  const rawLines = text.split('\n');
  const processedLines: string[] = [];
  let tableRows: string[] = [];
  let isTable = false;

  const flushTable = () => {
    if (tableRows.length >= 2) {
      const headerCells = tableRows[0].split('|').slice(1, -1).map(c => c.trim());
      const bodyRows = tableRows.slice(2);
      const VISIBLE_ROWS = 5;
      const hasHiddenRows = bodyRows.length > VISIBLE_ROWS;

      const buildRow = (rStr: string, idx: number) => {
        const cells = rStr.split('|').slice(1, -1).map(c => c.trim());
        const bg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
        let rowHtml = `<tr style="background-color: ${bg}; border-bottom: 1px solid #e2e8f0;">`;
        cells.forEach(cell => {
          const expandMatch = cell.match(/^(.{30,40})\.\.\[xem thêm\]\(#expand:(.+)\)$/);
          if (expandMatch) {
            const shortText = expandMatch[1];
            const fullText = expandMatch[2];
            rowHtml += `<td style="padding: 8px 12px; color: #334155; vertical-align: middle; max-width: 260px;">`;
            rowHtml += `<details style="display:inline;"><summary style="display:inline; cursor:pointer; list-style:none; color:#334155;">${shortText}… <span style="color:#006666; font-weight:600; font-size:12px;">xem thêm</span></summary><span style="margin-top:4px; display:block;">${fullText}</span></details>`;
            rowHtml += `</td>`;
          } else {
            rowHtml += `<td style="padding: 8px 12px; color: #334155; vertical-align: middle;">${cell}</td>`;
          }
        });
        rowHtml += '</tr>';
        return rowHtml;
      };

      let tableHtml = '<div style="overflow-x: auto; margin: 10px 0; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 1px 3px rgba(0,0,0,0.05); background: #ffffff;">';
      tableHtml += '<table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">';
      tableHtml += '<thead style="background-color: #f1f5f9; color: #1e293b; font-weight: 600; border-bottom: 2px solid #cbd5e1;"><tr>';
      headerCells.forEach(cell => {
        tableHtml += `<th style="padding: 8px 12px; white-space: nowrap;">${cell}</th>`;
      });
      tableHtml += '</tr></thead><tbody>';

      const visibleRows = hasHiddenRows ? bodyRows.slice(0, VISIBLE_ROWS) : bodyRows;
      visibleRows.forEach((rStr, idx) => {
        tableHtml += buildRow(rStr, idx);
      });

      tableHtml += '</tbody></table>';

      if (hasHiddenRows) {
        const hiddenRows = bodyRows.slice(VISIBLE_ROWS);
        const hiddenCount = hiddenRows.length;
        tableHtml += `<details style="border-top: 1px solid #e2e8f0;">`;
        tableHtml += `<summary style="text-align: center; padding: 8px; cursor: pointer; color: #006666; font-size: 13px; font-weight: 600; list-style: none; user-select: none;">Xem thêm ${hiddenCount} dòng ▼</summary>`;
        tableHtml += `<table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;"><tbody>`;
        hiddenRows.forEach((rStr, idx) => {
          tableHtml += buildRow(rStr, VISIBLE_ROWS + idx);
        });
        tableHtml += '</tbody></table>';
        tableHtml += `</details>`;
      }

      tableHtml += '</div>';
      processedLines.push(tableHtml);
    } else {
      tableRows.forEach(r => processedLines.push(r));
    }
    tableRows = [];
    isTable = false;
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      isTable = true;
      tableRows.push(line);
    } else {
      if (isTable) {
        flushTable();
      }
      processedLines.push(rawLines[i]);
    }
  }
  if (isTable) {
    flushTable();
  }

  let html = processedLines.join('\n');

  return html
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background: #f1f5f9; color: #006666; padding: 2px 5px; border-radius: 4px; font-family: monospace; font-size: 12px; border: 1px solid #e2e8f0;">$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="text-decoration: underline; color: #006666; font-weight: 600;">$1</a>')
    .replace(/\n/g, '<br />');
};

const MemoizedMessageContent = React.memo(({ 
  content, 
  className, 
  onClick 
}: { 
  content: string; 
  className?: string; 
  onClick?: (e: React.MouseEvent) => void;
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const renderedRef = React.useRef(false);

  React.useEffect(() => {
    if (ref.current && !renderedRef.current) {
      ref.current.innerHTML = renderMarkdown(content);
      renderedRef.current = true;
    }
  }, []);

  return (
    <div 
      ref={ref} 
      className={className} 
      onClick={onClick} 
    />
  );
}, (prevProps, nextProps) => {
  return prevProps.content === nextProps.content;
});

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chatWindowStyle, setChatWindowStyle] = useState<React.CSSProperties>({});
  
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const [chatbotOnline, setChatbotOnline] = useState(true);
  const [sessionId, setSessionId] = useState<string>(() => uuid());

  const { data: sessions = [], refetch: refetchSessions } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: async () => {
      try {
        return await chatbotApi.getSessions();
      } catch {
        return [];
      }
    },
    enabled: isOpen && isSidebarOpen,
    retry: false,
  });

  const { data: sessionMessages } = useQuery({
    queryKey: ['chat-messages', sessionId],
    queryFn: async () => {
      try {
        return await chatbotApi.getSessionMessages(sessionId);
      } catch {
        return [];
      }
    },
    enabled: !!sessionId && isOpen && isSidebarOpen,
    retry: false,
  });

  useEffect(() => {
    if (sessionMessages && sessionMessages.length > 0) {
      setMessages(sessionMessages.map((m: any) => ({
        id: m.id.toString(),
        sender: m.sender.toLowerCase(),
        content: m.content,
        timestamp: new Date(m.timestamp),
        suggestions: []
      })));
    }
  }, [sessionMessages]);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const previousTextRef = useRef('');

  const handleSpeak = (messageId: string, content: string) => {
    if (!window.speechSynthesis) return;

    if (speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    
    const textToSpeak = content.replace(/\[.*?\]\(.*?\)/g, '');
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'vi-VN';
    
    utterance.onend = () => {
      setSpeakingMessageId(null);
    };
    
    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
  };
  
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
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'vi-VN';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        let finalStr = '';
        let interimStr = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalStr += event.results[i][0].transcript;
          } else {
            interimStr += event.results[i][0].transcript;
          }
        }
        
        if (finalStr) {
          previousTextRef.current += (previousTextRef.current ? ' ' : '') + finalStr;
        }
        
        setInputText(previousTextRef.current + (previousTextRef.current && interimStr ? ' ' : '') + interimStr);
      };
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          alert('Quyền truy cập Micro bị từ chối. Vui lòng cấp quyền Micro trong cài đặt trình duyệt.');
        }
      };
      recognition.onend = () => {
        setIsListening(false);
      };
      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    if (isError) {
      setChatbotOnline(false);
      if (messages.length === 0) {
        setMessages([{
          id: uuid(),
          sender: 'ai',
          content: 'Dịch vụ chatbot hiện chưa sẵn sàng. Bạn có thể thử lại sau ít phút.',
          timestamp: new Date(),
          suggestions: [],
        }]);
      }
    } else {
      setChatbotOnline(true);
      if (messages.length === 0) {
        setMessages([{
          id: uuid(),
          sender: 'ai',
          content: 'Xin chào! Tôi là Trợ lý AI hệ thống AMS. Tôi có thể hỗ trợ bạn tra cứu điểm danh, ca làm việc, ngày phép và các chính sách của công ty. Bạn cần hỗ trợ gì hôm nay?',
          timestamp: new Date(),
          suggestions: ['Xem chấm công hôm nay', 'Số ngày phép còn lại', 'Chính sách làm thêm giờ'],
        }]);
      }
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
      
      if (isMaximized) {
        setChatWindowStyle({});
      } else if (position && fabRef.current) {
        const fabRect = fabRef.current.getBoundingClientRect();
        const ww = window.innerWidth;
        const wh = window.innerHeight;
        
        let left: number | undefined;
        let top: number | undefined;
        let right: number | undefined;
        let bottom: number | undefined;

        if (fabRect.top > wh / 2) {
          bottom = Math.max(16, wh - fabRect.top + 12);
        } else {
          top = Math.max(16, fabRect.bottom + 12);
        }

        if (fabRect.left > ww / 2) {
          right = Math.max(16, ww - fabRect.right);
        } else {
          left = Math.max(16, fabRect.left);
        }

        setChatWindowStyle({
          top: top ? `${top}px` : undefined,
          bottom: bottom ? `${bottom}px` : undefined,
          left: left ? `${left}px` : undefined,
          right: right ? `${right}px` : undefined,
        });
      } else {
        setChatWindowStyle({});
      }
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isOpen, position, isMaximized]);

  const { mutate: sendMessageMutation, isPending: isTyping } = useMutation({
    mutationFn: async (text: string) => {
      const currentSessionId = sessionId || uuid();
      if (!sessionId) {
        setSessionId(currentSessionId);
      }
      
      // Async background attempt to save user message into DB if supported
      chatbotApi.addMessage(currentSessionId, 'user', text).catch(() => {});

      // Call Chatbot Service
      const response = await chatbotApi.sendMessage({ 
        message: text, 
        session_id: currentSessionId, 
        locale: 'vi' 
      });
      
      const display = formatIsoTimestampsInText(response.message || '');
      
      // Async background attempt to save AI response into DB if supported
      chatbotApi.addMessage(currentSessionId, 'ai', display).catch(() => {});

      return { response, currentSessionId, display };
    },
    onSuccess: ({ response, display }) => {
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
      if (isSidebarOpen) {
        refetchSessions();
      }
      setTimeout(scrollToBottom, 50);
    },
    onError: (err: any) => {
      console.error("[Chatbot Error]", err);
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

  const handleDeleteSession = async (e: React.MouseEvent, sId: string) => {
    e.stopPropagation();
    try {
      await chatbotApi.deleteSession(sId);
      if (sessionId === sId) {
        setSessionId(uuid());
        setMessages([]);
      }
      refetchSessions();
    } catch (err) {
      console.error("Lỗi khi xóa phiên chat:", err);
    }
  };

  const handleSendMessage = (text?: string) => {
    const content = (text ?? inputText).trim();
    if (!content || isTyping || !chatbotOnline) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }

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

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      previousTextRef.current = inputText;
      recognitionRef.current.start();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Drag logic for floating button
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

    if (fabRef.current) {
      fabRef.current.style.transition = 'none';
      fabRef.current.style.transform = 'scale(1.05)';
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current.isDragging) return;

    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;
    
    if (!dragRef.current.moved && Math.hypot(deltaX, deltaY) > 5) {
      dragRef.current.moved = true;
      wasDraggedRef.current = true;
    }

    if (dragRef.current.moved) {
      const btnW = fabRef.current?.offsetWidth || 56;
      const btnH = fabRef.current?.offsetHeight || 56;
      
      const newX = dragRef.current.initX + deltaX;
      const newY = dragRef.current.initY + deltaY;
      
      const limX = Math.max(12, Math.min(newX, window.innerWidth - btnW - 12));
      const limY = Math.max(12, Math.min(newY, window.innerHeight - btnH - 12));
      
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

    if (fabRef.current) {
      fabRef.current.style.transition = '';
      fabRef.current.style.transform = '';
    }

    if (dragRef.current.moved) {
      setPosition({ x: dragRef.current.lastX, y: dragRef.current.lastY });
    }
  };

  const handleFabClick = (e: React.MouseEvent) => {
    if (wasDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      wasDraggedRef.current = false;
      return;
    }
    setIsOpen(!isOpen);
  };

  const handleMessageClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A') {
      const href = target.getAttribute('href');
      if (href && href.includes('/exports/')) {
        e.preventDefault();
        try {
          if (href.includes(':8001/')) {
            const token = localStorage.getItem('token') || '';
            const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            const fetchRes = await fetch(href, {
              headers: {
                Authorization: authHeader
              }
            });
            if (!fetchRes.ok) throw new Error(`HTTP error! status: ${fetchRes.status}`);
            const blob = await fetchRes.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            let filename = 'export.csv';
            const disposition = fetchRes.headers.get('content-disposition');
            if (disposition && disposition.includes('filename=')) {
              filename = disposition.split('filename=')[1].replace(/['"]/g, '').trim();
            }
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
              if (document.body.contains(link)) document.body.removeChild(link);
              window.URL.revokeObjectURL(blobUrl);
            }, 2000);
            return;
          }

          let urlPath = href;
          if (href.startsWith('http://localhost:8080/api')) {
            urlPath = href.replace('http://localhost:8080/api', '');
          }

          const response = await axiosInstance.get(urlPath, {
            responseType: 'blob'
          });
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          
          let filename = 'download';
          if (urlPath.includes('.csv')) filename = 'export.csv';
          else if (urlPath.includes('attendance-monthly') || urlPath.includes('.xlsx')) filename = 'export.xlsx';

          const disposition = response.headers['content-disposition'];
          if (disposition && disposition.indexOf('attachment') !== -1) {
            const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
            const matches = filenameRegex.exec(disposition);
            if (matches != null && matches[1]) { 
              filename = matches[1].replace(/['"]/g, '');
            }
          }
          
          if (!filename || filename.trim() === '') {
              filename = urlPath.includes('.csv') ? 'export.csv' : 'export.xlsx';
          }

          link.download = filename;
          document.body.appendChild(link);
          link.click();
          
          setTimeout(() => {
            if (document.body.contains(link)) {
                document.body.removeChild(link);
            }
            window.URL.revokeObjectURL(url);
          }, 2000);
        } catch (error) {
          console.error("Lỗi khi tải file:", error);
          alert("Lỗi khi tải file. Bạn có thể không có quyền truy cập hoặc phiên đăng nhập đã hết hạn.");
        }
      }
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        ref={fabRef}
        className={clsx(styles['chatbot-fab'], isOpen && styles['chatbot-fab--hidden'])}
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
          touchAction: 'none',
          cursor: dragRef.current.moved ? 'grabbing' : 'pointer'
        }}
        aria-label="Mở trợ lý AI"
        title="Trợ lý AI AMS"
      >
        <MessageSquare strokeWidth={2.2} className="w-[26px] h-[26px]" />
        <span className={styles['chatbot-fab__pulse']}></span>
      </button>

      {/* Backdrop for Maximized state */}
      {isOpen && isMaximized && (
        <div 
          className={styles['chatbot-backdrop']} 
          onClick={() => setIsMaximized(false)} 
        />
      )}

      {/* Main Chatbot Window */}
      <div 
        className={clsx(
          styles['chatbot-window'], 
          isOpen && styles['chatbot-window--visible'],
          isMaximized && styles['chatbot-window--maximized']
        )} 
        style={chatWindowStyle}
        role="dialog" 
        aria-label="AMS AI Assistant"
      >
        {/* Header */}
        <div className={styles['chatbot-header']}>
          <div className={styles['chatbot-header__left']}>
            <button 
              className={clsx(styles['chatbot-header__icon-btn'], isSidebarOpen && styles['chatbot-header__icon-btn--active'])} 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title="Lịch sử hội thoại"
              aria-label="Lịch sử hội thoại"
            >
              <Menu className="w-[18px] h-[18px]" />
            </button>
            <div className={styles['chatbot-header__avatar']}>
              <Bot className="w-[20px] h-[20px]" />
            </div>
            <div className={styles['chatbot-header__meta']}>
              <div className={styles['chatbot-header__name']}>AMS AI Assistant</div>
              <div className={styles['chatbot-header__status']}>
                <span className={clsx(styles['chatbot-status-dot'], !chatbotOnline && styles['chatbot-status-dot--offline'])}></span>
                <span>{chatbotOnline ? 'Trực tuyến' : 'Ngoại tuyến'}</span>
              </div>
            </div>
          </div>
          
          <div className={styles['chatbot-header__controls']}>
            <button 
              className={styles['chatbot-header__icon-btn']} 
              onClick={() => setIsMaximized(!isMaximized)} 
              title={isMaximized ? "Thu nhỏ" : "Phóng to"}
              aria-label={isMaximized ? "Thu nhỏ" : "Phóng to"}
            >
              {isMaximized ? (
                <Minimize2 className="w-[16px] h-[16px]" />
              ) : (
                <Maximize2 className="w-[16px] h-[16px]" />
              )}
            </button>
            <button 
              className={clsx(styles['chatbot-header__icon-btn'], styles['chatbot-header__icon-btn--close'])} 
              onClick={() => {
                setIsOpen(false);
                setIsMaximized(false);
              }} 
              title="Đóng"
              aria-label="Đóng"
            >
              <X strokeWidth={2.2} className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>

        {/* Content Body & Sidebar */}
        <div className={styles['chatbot-container']}>
          {isSidebarOpen && (
            <div className={styles['chatbot-sidebar']}>
              <button 
                className={styles['chatbot-sidebar__new-btn']}
                onClick={() => {
                  setSessionId(uuid());
                  setMessages([]);
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
              >
                <Plus className="w-[15px] h-[15px]" />
                <span>Cuộc trò chuyện mới</span>
              </button>
              <div className={styles['chatbot-sidebar__list']}>
                {sessions.length === 0 ? (
                  <div className={styles['chatbot-sidebar__empty']}>Chưa có lịch sử</div>
                ) : (
                  sessions.map((session: any) => (
                    <div 
                      key={session.id} 
                      className={clsx(styles['chatbot-sidebar__item'], sessionId === session.id && styles['chatbot-sidebar__item--active'])}
                      onClick={() => {
                        setSessionId(session.id);
                        if (window.innerWidth < 768) setIsSidebarOpen(false);
                      }}
                    >
                      <MessageSquare className="w-[14px] h-[14px] flex-shrink-0" />
                      <span className={styles['chatbot-sidebar__item-title']} title={session.title}>{session.title}</span>
                      <button 
                        className={styles['chatbot-sidebar__delete-btn']}
                        onClick={(e) => handleDeleteSession(e, session.id)}
                        title="Xóa hội thoại"
                      >
                        <Trash2 className="w-[13px] h-[13px]" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className={styles['chatbot-content']}>
            <div className={styles['chatbot-body']} ref={messagesContainerRef}>
              {messages.map((msg) => (
                <React.Fragment key={msg.id}>
                  {msg.sender === 'ai' ? (
                    <div className={clsx(styles['chatbot-message'], styles['chatbot-message--ai'])}>
                      <div className={styles['chatbot-message__avatar']}>
                        <Bot className="w-[16px] h-[16px]" />
                      </div>
                      <div className={styles['chatbot-message__content-wrap']}>
                        <MemoizedMessageContent
                          content={msg.content}
                          className={clsx(styles['chatbot-message__bubble'], styles['chatbot-message__bubble--ai'])}
                          onClick={handleMessageClick}
                        />
                        <div className={styles['chatbot-message__meta']}>
                          <span className={styles['chatbot-message__time']}>{formatTime(msg.timestamp)}</span>
                          <button 
                            className={clsx(styles['chatbot-message__tts-btn'], speakingMessageId === msg.id && styles['chatbot-message__tts-btn--active'])} 
                            onClick={() => handleSpeak(msg.id, msg.content)}
                            title={speakingMessageId === msg.id ? "Dừng đọc" : "Đọc to"}
                            aria-label="Đọc to tin nhắn"
                          >
                            {speakingMessageId === msg.id ? (
                              <Square className="w-[12px] h-[12px] fill-current" />
                            ) : (
                              <Volume2 className="w-[13px] h-[13px]" />
                            )}
                          </button>
                        </div>
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
                        <div 
                          className={clsx(styles['chatbot-message__bubble'], styles['chatbot-message__bubble--user'])}
                          dangerouslySetInnerHTML={{
                            __html: msg.content
                              .replace(/&/g, '&amp;')
                              .replace(/</g, '&lt;')
                              .replace(/>/g, '&gt;')
                          }}
                        />
                        <div className={clsx(styles['chatbot-message__meta'], styles['chatbot-message__meta--right'])}>
                          <span className={styles['chatbot-message__time']}>{formatTime(msg.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))}

              {isTyping && (
                <div className={clsx(styles['chatbot-message'], styles['chatbot-message--ai'], styles['chatbot-typing'])}>
                  <div className={styles['chatbot-message__avatar']}>
                    <Bot className="w-[16px] h-[16px]" />
                  </div>
                  <div className={clsx(styles['chatbot-message__bubble'], styles['chatbot-message__bubble--ai'])}>
                    <span className={styles['typing-dot']}></span>
                    <span className={styles['typing-dot']}></span>
                    <span className={styles['typing-dot']}></span>
                  </div>
                </div>
              )}
            </div>

            <div className={styles['chatbot-footer']}>
              <div className={styles['chatbot-input-card']}>
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
                <div className={styles['chatbot-input-actions']}>
                  {recognitionRef.current && (
                    <button
                      className={clsx(styles['chatbot-mic-btn'], isListening && styles['chatbot-mic-btn--listening'])}
                      disabled={isTyping || !chatbotOnline}
                      onClick={toggleListening}
                      aria-label="Thu âm giọng nói"
                      title={isListening ? "Dừng ghi âm" : "Ghi âm giọng nói"}
                    >
                      {isListening ? (
                        <Square strokeWidth={2.5} className="w-[14px] h-[14px] fill-current text-rose-500" />
                      ) : (
                        <Mic strokeWidth={2} className="w-[18px] h-[18px]" />
                      )}
                    </button>
                  )}
                  <button
                    className={styles['chatbot-send-btn']}
                    id="chatbot-send-btn"
                    disabled={!inputText.trim() || isTyping || !chatbotOnline}
                    onClick={() => handleSendMessage()}
                    aria-label="Gửi tin nhắn"
                    title="Gửi tin nhắn"
                  >
                    <Send strokeWidth={2.2} className="w-[16px] h-[16px]" />
                  </button>
                </div>
              </div>
              <div className={styles['chatbot-footer__hint']}>
                <span>Nhấn <strong>Enter</strong> để gửi, <strong>Shift + Enter</strong> để xuống dòng</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Chatbot;
