import { useState, useEffect, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useGetConversations,
  useGetMessages,
  useSendMessage,
  useSearchUsers,
  useMarkMessagesRead,
  useGetMe,
  getGetConversationsQueryKey,
  getGetMessagesQueryKey,
} from "@workspace/api-client-react";
import type { UserSummary } from "@workspace/api-client-react";
import { format } from "date-fns";
import {
  Send,
  Loader2,
  MessageSquare,
  PenSquare,
  Search,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { Input } from "@/components/ui/input";

type AllowedChatContact = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  profilePicUrl: string | null;
  role: string;
};

export function ChatPage() {
  const queryClient = useQueryClient();
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { data: me } = useGetMe();
  const previousMessageCountRef = useRef(0);

  const [allowedContacts, setAllowedContacts] = useState<AllowedChatContact[]>([]);
  const [isLoadingAllowedContacts, setIsLoadingAllowedContacts] = useState(false);

  // New chat dialog state
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const debouncedEmail = useDebounce(searchEmail, 300);
  // Holds the user picked from search until they appear in the conversations list
  const [newChatTarget, setNewChatTarget] = useState<UserSummary | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversations, isLoading: isConvLoading } = useGetConversations({
    query: {
      queryKey: getGetConversationsQueryKey(),
      refetchInterval: 5000,
      refetchIntervalInBackground: true,
    },
  });

  const { data: messages, isLoading: isMsgLoading } = useGetMessages(
    { withUserId: activeUserId! },
    {
      query: {
        enabled: !!activeUserId,
        queryKey: getGetMessagesQueryKey({ withUserId: activeUserId! }),
        refetchInterval: activeUserId ? 2500 : false,
        refetchIntervalInBackground: true,
      },
    }
  );

  const { data: searchResults, isFetching: isSearching } = useSearchUsers(
    { email: debouncedEmail },
    {
      query: {
        enabled: !!me && me.role === "coach" && debouncedEmail.length >= 2,
        queryKey: ["users-search", debouncedEmail],
      },
    }
  );

  const sendMessage = useSendMessage();
  const markRead = useMarkMessagesRead();

  useEffect(() => {
    let isMounted = true;

    const loadAllowedContacts = async () => {
      if (!newChatOpen || !me || me.role === "coach") return;

      setIsLoadingAllowedContacts(true);

      try {
        const response = await fetch("/api/messages/allowed-contacts", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load chat contacts");
        }

        const data: AllowedChatContact[] = await response.json();

        if (isMounted) {
          setAllowedContacts(data);
        }
      } catch {
        if (isMounted) {
          setAllowedContacts([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingAllowedContacts(false);
        }
      }
    };

    loadAllowedContacts();

    return () => {
      isMounted = false;
    };
  }, [newChatOpen, me]);

  // Set initial active user if conversations exist
  useEffect(() => {
    if (conversations && conversations.length > 0 && !activeUserId) {
      setActiveUserId(conversations[0].userId);
    }
  }, [conversations, activeUserId]);

  // Mark messages as read whenever a conversation is opened
  useEffect(() => {
    if (activeUserId) {
      markRead.mutate(activeUserId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    const currentCount = messages?.length ?? 0;

    if (currentCount > previousMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    previousMessageCountRef.current = currentCount;
  }, [messages]);
  const applyWrapFormatting = (prefix: string, suffix = prefix) => {
    const textarea = composerRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selected = messageText.slice(start, end);
    const replacement = `${prefix}${selected}${suffix}`;

    const next =
      messageText.slice(0, start) + replacement + messageText.slice(end);

    setMessageText(next);

    requestAnimationFrame(() => {
      textarea.focus();
      if (selected.length > 0) {
        textarea.setSelectionRange(
          start + prefix.length,
          end + prefix.length
        );
      } else {
        const caret = start + prefix.length;
        textarea.setSelectionRange(caret, caret);
      }
    });
  };

  const applyLinePrefixFormatting = (prefix: string) => {
    const textarea = composerRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;

    const lineStart = messageText.lastIndexOf("\n", start - 1) + 1;
    const lineEnd =
      end < messageText.length
        ? messageText.indexOf("\n", end) === -1
          ? messageText.length
          : messageText.indexOf("\n", end)
        : messageText.length;

    const selectedBlock = messageText.slice(lineStart, lineEnd);
    const updatedBlock = selectedBlock
      .split("\n")
      .map((line) => `${prefix}${line}`)
      .join("\n");

    const next =
      messageText.slice(0, lineStart) +
      updatedBlock +
      messageText.slice(lineEnd);

    setMessageText(next);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(lineStart, lineStart + updatedBlock.length);
    });
  };

  const applyNumberedListFormatting = () => {
    const textarea = composerRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;

    const lineStart = messageText.lastIndexOf("\n", start - 1) + 1;
    const lineEnd =
      end < messageText.length
        ? messageText.indexOf("\n", end) === -1
          ? messageText.length
          : messageText.indexOf("\n", end)
        : messageText.length;

    const selectedBlock = messageText.slice(lineStart, lineEnd);
    const updatedBlock = selectedBlock
      .split("\n")
      .map((line, index) => `${index + 1}. ${line}`)
      .join("\n");

    const next =
      messageText.slice(0, lineStart) +
      updatedBlock +
      messageText.slice(lineEnd);

    setMessageText(next);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(lineStart, lineStart + updatedBlock.length);
    });
  };

  const applyLinkFormatting = () => {
    const textarea = composerRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selected = messageText.slice(start, end) || "link text";
    const replacement = `[${selected}](https://)`;

    const next =
      messageText.slice(0, start) + replacement + messageText.slice(end);

    setMessageText(next);

    requestAnimationFrame(() => {
      textarea.focus();
      const urlStart = start + selected.length + 3;
      const urlEnd = urlStart + "https://".length;
      textarea.setSelectionRange(urlStart, urlEnd);
    });
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return;

    const textarea = composerRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;

    if (start !== end) return;

    const lineStart = messageText.lastIndexOf("\n", start - 1) + 1;
    const currentLine = messageText.slice(lineStart, start);

    const bulletMatch = currentLine.match(/^(\s*-\s)/);
    const numberedMatch = currentLine.match(/^(\s*)(\d+)\.\s/);

    if (bulletMatch) {
      e.preventDefault();

      const prefix = bulletMatch[1];
      const insertion = `\n${prefix}`;
      const next =
        messageText.slice(0, start) + insertion + messageText.slice(end);

      setMessageText(next);

      requestAnimationFrame(() => {
        textarea.focus();
        const caret = start + insertion.length;
        textarea.setSelectionRange(caret, caret);
      });

      return;
    }

    if (numberedMatch) {
      e.preventDefault();

      const indent = numberedMatch[1] ?? "";
      const currentNumber = Number(numberedMatch[2]);
      const nextNumber = currentNumber + 1;
      const insertion = `\n${indent}${nextNumber}. `;
      const next =
        messageText.slice(0, start) + insertion + messageText.slice(end);

      setMessageText(next);

      requestAnimationFrame(() => {
        textarea.focus();
        const caret = start + insertion.length;
        textarea.setSelectionRange(caret, caret);
      });
    }
  };

  const renderInlineFormatting = (text: string, keyPrefix: string) => {
    const parts: React.ReactNode[] = [];
    const regex =
      /(\*\*([^*]+)\*\*|_([^_]+)_|~([^~]+)~|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let index = 0;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      if (match[2]) {
        parts.push(
          <strong key={`${keyPrefix}-b-${index++}`}>{match[2]}</strong>
        );
      } else if (match[3]) {
        parts.push(<em key={`${keyPrefix}-i-${index++}`}>{match[3]}</em>);
      } else if (match[4]) {
        parts.push(
          <span key={`${keyPrefix}-u-${index++}`} className="underline">
            {match[4]}
          </span>
        );
      } else if (match[5] && match[6]) {
        parts.push(
          <a
            key={`${keyPrefix}-l-${index++}`}
            href={match[6]}
            target="_blank"
            rel="noopener noreferrer"
            className="underline break-all"
          >
            {match[5]}
          </a>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const renderMessageContent = (content: string) => {
    const lines = content.split("\n");

    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (line.startsWith("- ")) {
        const items: string[] = [];
        while (i < lines.length && lines[i].startsWith("- ")) {
          items.push(lines[i].slice(2));
          i++;
        }
        elements.push(
          <ul key={`ul-${i}`} className="list-disc pl-5 space-y-1">
            {items.map((item, idx) => (
              <li key={idx}>{renderInlineFormatting(item, `ul-${i}-${idx}`)}</li>
            ))}
          </ul>
        );
        continue;
      }

      if (/^\d+\.\s/.test(line)) {
        const items: string[] = [];
        while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
          items.push(lines[i].replace(/^\d+\.\s/, ""));
          i++;
        }
        elements.push(
          <ol key={`ol-${i}`} className="list-decimal pl-5 space-y-1">
            {items.map((item, idx) => (
              <li key={idx}>{renderInlineFormatting(item, `ol-${i}-${idx}`)}</li>
            ))}
          </ol>
        );
        continue;
      }

      elements.push(
        <p key={`p-${i}`} className="whitespace-pre-wrap">
          {renderInlineFormatting(line, `p-${i}`)}
        </p>
      );
      i++;
    }

    return <div className="space-y-2">{elements}</div>;
  };

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

  const handleStartChat = (user: UserSummary) => {
    setActiveUserId(user.id);
    setNewChatTarget(user);
    setNewChatOpen(false);
    setSearchEmail("");
    queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
  };

  // Use the conversation entry if it exists, otherwise fall back to the
  // user picked from search (for brand-new chats that have no messages yet)
  const conversationEntry = conversations?.find(c => c.userId === activeUserId);
  const activeUser = conversationEntry ?? (
    newChatTarget && newChatTarget.id === activeUserId
      ? {
        userId: newChatTarget.id,
        firstName: newChatTarget.firstName,
        lastName: newChatTarget.lastName,
        profilePicUrl: newChatTarget.profilePicUrl ?? null,
        lastMessage: "",
        lastMessageAt: new Date().toISOString(),
        unreadCount: 0,
      }
      : undefined
  );

  return (
    <MainLayout>
      <div className="flex-1 flex overflow-hidden h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <div className="w-full md:w-80 border-r bg-white flex flex-col hidden md:flex">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-xl font-serif font-bold text-[#121c34]">Messages</h2>
            <Button
              variant="ghost"
              size="icon"
              className="text-[#3131d8] hover:bg-[#3131d8]/10"
              onClick={() => setNewChatOpen(true)}
              title="New conversation"
            >
              <PenSquare className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isConvLoading ? (
              <div className="p-4 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : conversations?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="mb-4">No conversations yet.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#3131d8] text-[#3131d8] hover:bg-[#3131d8]/10"
                  onClick={() => setNewChatOpen(true)}
                >
                  Start a conversation
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {conversations?.map(conv => (
                  <button
                    key={conv.userId}
                    onClick={() => setActiveUserId(conv.userId)}
                    className={`w-full text-left p-4 flex items-center gap-3 transition-colors ${activeUserId === conv.userId ? "bg-slate-50 border-l-4 border-l-[#3131d8]" : "hover:bg-slate-50 border-l-4 border-l-transparent"
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
                          <div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${isMe
                            ? 'bg-[#121c34] text-white rounded-br-none'
                            : 'bg-white border border-slate-100 text-[#121c34] rounded-bl-none'
                            }`}>
                            <div className="text-sm leading-relaxed">
                              {renderMessageContent(msg.content)}
                            </div>
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
                <form onSubmit={handleSend} className="max-w-4xl mx-auto">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-2">
                      <div className="mx-auto w-fit flex flex-wrap items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">                        <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 p-0 inline-flex items-center justify-center"
                        onClick={() => applyWrapFormatting("**")}
                        title="Bold"
                      >
                        <Bold className="w-4 h-4 block" />
                      </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 p-0 flex items-center justify-center"
                          onClick={() => applyWrapFormatting("_")}
                          title="Italic"
                        >
                          <Italic className="w-4 h-4 block" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 p-0 flex items-center justify-center"
                          onClick={() => applyWrapFormatting("~")}
                          title="Underline"
                        >
                          <Underline className="w-4 h-4 block" />
                        </Button>

                        <div className="mx-1 h-5 w-px bg-slate-200" />

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 p-0 flex items-center justify-center"
                          onClick={() => applyLinePrefixFormatting("- ")}
                          title="Bullet List"
                        >
                          <List className="w-4 h-4 block" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 p-0 flex items-center justify-center"
                          onClick={applyNumberedListFormatting}
                          title="Numbered List"
                        >
                          <ListOrdered className="w-4 h-4 block" />
                        </Button>

                        <div className="mx-1 h-5 w-px bg-slate-200" />

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 p-0 flex items-center justify-center"
                          onClick={applyLinkFormatting}
                          title="Insert Link"
                        >
                          <Link2 className="w-4 h-4 block" />
                        </Button>
                      </div>

                      <Textarea
                        ref={composerRef}
                        placeholder="Type a message..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={handleComposerKeyDown}
                        className="w-full min-h-[52px] max-h-40 resize-y rounded-2xl bg-slate-50 border-slate-200 focus-visible:ring-[#3131d8]"
                      />
                    </div>

                    <Button
                      type="submit"
                      size="icon"
                      className="h-12 w-12 rounded-full bg-[#121c34] hover:bg-[#121c34]/90 flex-shrink-0"
                      disabled={!messageText.trim() || sendMessage.isPending}
                    >
                      {sendMessage.isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5 ml-1" />
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-white">
              <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
              <h3 className="text-xl font-medium text-[#121c34] mb-2">Your Messages</h3>
              <p className="max-w-md mb-6">Select a conversation or start a new one by searching for someone.</p>
              <Button
                onClick={() => setNewChatOpen(true)}
                className="bg-[#3131d8] hover:bg-[#3131d8]/90 text-white rounded-full px-6"
              >
                <PenSquare className="w-4 h-4 mr-2" />
                New Conversation
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Dialog */}
      <Dialog open={newChatOpen} onOpenChange={(open) => { setNewChatOpen(open); if (!open) setSearchEmail(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#121c34] font-serif text-xl">
              New Conversation
            </DialogTitle>
          </DialogHeader>

          <div className="mt-2">
            {me?.role === "coach" ? (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    autoFocus
                    placeholder="Search by email address..."
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="pl-9 h-11 focus-visible:ring-[#3131d8]"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-slate-100">
                  {debouncedEmail.length < 2 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      Type at least 2 characters to search
                    </div>
                  ) : searchResults && searchResults.length === 0 && !isSearching ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      No users found for{" "}
                      <span className="font-medium text-[#121c34]">"{debouncedEmail}"</span>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {searchResults?.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleStartChat(user)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left"
                        >
                          <Avatar className="h-10 w-10 border border-slate-100">
                            <AvatarImage src={user.profilePicUrl || undefined} />
                            <AvatarFallback className="bg-[#607b7d] text-white text-sm">
                              {user.firstName.charAt(0)}
                              {user.lastName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[#121c34] truncate">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </p>
                          </div>
                          <span className="text-xs capitalize px-2 py-0.5 rounded-full bg-[#3131d8]/10 text-[#3131d8] font-medium flex-shrink-0">
                            {user.role}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-1 max-h-80 overflow-y-auto rounded-lg border border-slate-100">
                {isLoadingAllowedContacts ? (
                  <div className="p-6 flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : allowedContacts.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No triad members are available to message yet.
                  </div>
                ) : (
                  <div className="divide-y">
                    {allowedContacts.map((contact) => (
                      <button
                        key={contact.id}
                        onClick={() =>
                          handleStartChat({
                            id: contact.id,
                            firstName: contact.firstName,
                            lastName: contact.lastName,
                            email: contact.email,
                            profilePicUrl: contact.profilePicUrl,
                            role: contact.role as any,
                          })
                        }
                        className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left"
                      >
                        <Avatar className="h-10 w-10 border border-slate-100">
                          <AvatarImage src={contact.profilePicUrl || undefined} />
                          <AvatarFallback className="bg-[#607b7d] text-white text-sm">
                            {contact.firstName.charAt(0)}
                            {contact.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[#121c34] truncate">
                            {contact.firstName} {contact.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {contact.email}
                          </p>
                        </div>
                        <span className="text-xs capitalize px-2 py-0.5 rounded-full bg-[#3131d8]/10 text-[#3131d8] font-medium flex-shrink-0">
                          {contact.role}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
