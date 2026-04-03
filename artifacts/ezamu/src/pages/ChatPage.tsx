import { useState, useEffect, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGetConversations, useGetMessages, useSendMessage, getGetConversationsQueryKey, getGetMessagesQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Send, User as UserIcon, Loader2, MessageSquare } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function ChatPage() {
  const queryClient = useQueryClient();
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: isConvLoading } = useGetConversations({ query: { queryKey: getGetConversationsQueryKey() } });
  
  const { data: messages, isLoading: isMsgLoading } = useGetMessages(
    { withUserId: activeUserId! },
    { query: { enabled: !!activeUserId, queryKey: getGetMessagesQueryKey({ withUserId: activeUserId! }) } }
  );

  const sendMessage = useSendMessage();

  // Set initial active user if conversations exist
  useEffect(() => {
    if (conversations && conversations.length > 0 && !activeUserId) {
      setActiveUserId(conversations[0].userId);
    }
  }, [conversations, activeUserId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeUserId) return;

    sendMessage.mutate({
      data: {
        receiverId: activeUserId,
        content: messageText
      }
    }, {
      onSuccess: () => {
        setMessageText("");
        queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey({ withUserId: activeUserId }) });
        queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
      }
    });
  };

  const activeUser = conversations?.find(c => c.userId === activeUserId);

  return (
    <MainLayout>
      <div className="flex-1 flex overflow-hidden h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <div className="w-full md:w-80 border-r bg-white flex flex-col hidden md:flex">
          <div className="p-4 border-b">
            <h2 className="text-xl font-serif font-bold text-[#121c34]">Messages</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {isConvLoading ? (
              <div className="p-4 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : conversations?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No conversations yet.</p>
              </div>
            ) : (
              <div className="divide-y">
                {conversations?.map(conv => (
                  <button
                    key={conv.userId}
                    onClick={() => setActiveUserId(conv.userId)}
                    className={`w-full text-left p-4 flex items-center gap-3 transition-colors ${
                      activeUserId === conv.userId ? "bg-slate-50 border-l-4 border-l-[#3131d8]" : "hover:bg-slate-50 border-l-4 border-l-transparent"
                    }`}
                  >
                    <Avatar className="h-12 w-12 border border-slate-100">
                      <AvatarImage src={conv.profilePicUrl || undefined} />
                      <AvatarFallback className="bg-[#607b7d] text-white">
                        {conv.firstName.charAt(0)}{conv.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className="font-semibold text-[#121c34] truncate">{conv.firstName} {conv.lastName}</h3>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                          {format(new Date(conv.lastMessageAt), "MMM d")}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${conv.unreadCount > 0 ? "font-bold text-[#121c34]" : "text-muted-foreground"}`}>
                        {conv.lastMessage}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <div className="w-5 h-5 rounded-full bg-[#3131d8] flex items-center justify-center text-[10px] font-bold text-white">
                        {conv.unreadCount}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-slate-50 relative">
          {activeUserId && activeUser ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b bg-white flex items-center gap-3 shadow-sm z-10">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={activeUser.profilePicUrl || undefined} />
                  <AvatarFallback className="bg-[#607b7d] text-white">
                    {activeUser.firstName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-[#121c34]">{activeUser.firstName} {activeUser.lastName}</h3>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isMsgLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="text-center text-xs text-muted-foreground my-4">
                      This is the beginning of your conversation.
                    </div>
                    {messages?.map(msg => {
                      const isMe = msg.senderId !== activeUserId;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${
                            isMe 
                              ? 'bg-[#121c34] text-white rounded-br-none' 
                              : 'bg-white border border-slate-100 text-[#121c34] rounded-bl-none'
                          }`}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            <span className={`text-[10px] block mt-1 ${isMe ? 'text-white/60 text-right' : 'text-muted-foreground'}`}>
                              {format(new Date(msg.createdAt), "h:mm a")}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white border-t">
                <form onSubmit={handleSend} className="flex gap-2 max-w-4xl mx-auto">
                  <Input 
                    placeholder="Type a message..." 
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="flex-1 h-12 rounded-full px-6 bg-slate-50 border-slate-200 focus-visible:ring-[#3131d8]"
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    className="h-12 w-12 rounded-full bg-[#121c34] hover:bg-[#121c34]/90 flex-shrink-0"
                    disabled={!messageText.trim() || sendMessage.isPending}
                  >
                    {sendMessage.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-white">
              <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
              <h3 className="text-xl font-medium text-[#121c34] mb-2">Your Messages</h3>
              <p className="max-w-md">Select a conversation from the sidebar to start chatting with your triad members.</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
