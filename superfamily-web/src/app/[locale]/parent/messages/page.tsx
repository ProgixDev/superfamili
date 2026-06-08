"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { MessageCircle, Send, ArrowLeft, User } from "lucide-react"
import { apiGet, apiPost, apiPatch } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface ConversationProfile {
  first_name: string
  last_name: string
}

interface EducatorProfile {
  profiles: ConversationProfile
}

interface Conversation {
  id: string
  educator_profile_id: string
  educator_profiles: EducatorProfile
  last_message_at: string | null
  parent_unread_count: number
}

interface Message {
  id: string
  content: string
  sender_profile_id: string
  created_at: string
  message_type: string
}

interface ProfileResponse {
  data: {
    id: string
    [key: string]: unknown
  }
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return "maintenant"
  if (diffMin < 60) return `il y a ${diffMin} min`
  if (diffH < 24) return `il y a ${diffH}h`
  if (diffDays === 1) return "hier"
  if (diffDays < 7) return `il y a ${diffDays}j`
  return date.toLocaleDateString("fr-CA", { day: "numeric", month: "short" })
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })
}

export default function MessagesPage() {
  const queryClient = useQueryClient()
  const [selectedConversationId, setSelectedConversationId] = React.useState<string | null>(null)
  const [messageInput, setMessageInput] = React.useState("")
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  // Fetch current user profile to identify sent vs received messages
  const { data: profileData } = useQuery<ProfileResponse>({
    queryKey: ["profile-me"],
    queryFn: () => apiGet("/profiles/me"),
  })
  const currentProfileId = profileData?.data?.id

  // Fetch conversations
  const { data: conversationsData, isLoading: convoLoading } = useQuery<Conversation[]>({
    queryKey: ["parent-conversations"],
    queryFn: () => apiGet("/messaging/conversations"),
    refetchInterval: 10000,
  })

  const conversations: Conversation[] = (conversationsData as any)?.data || (Array.isArray(conversationsData) ? conversationsData : [])
  const activeConversation = conversations.find((c) => c.id === selectedConversationId)

  // Fetch messages for selected conversation
  const { data: messagesData, isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["parent-messages", selectedConversationId],
    queryFn: () => apiGet(`/messaging/conversations/${selectedConversationId}/messages`),
    enabled: !!selectedConversationId,
    refetchInterval: 5000,
  })

  const messages: Message[] = (messagesData as any)?.data || (Array.isArray(messagesData) ? messagesData : [])

  // Mark conversation as read
  const markReadMutation = useMutation({
    mutationFn: (conversationId: string) =>
      apiPatch(`/messaging/conversations/${conversationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-conversations"] })
    },
  })

  // Send message
  const sendMutation = useMutation({
    mutationFn: (params: { educatorProfileId: string; content: string }) =>
      apiPost(`/messaging/conversations/${params.educatorProfileId}/messages`, {
        content: params.content,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-messages", selectedConversationId] })
      queryClient.invalidateQueries({ queryKey: ["parent-conversations"] })
      setMessageInput("")
    },
  })

  // Select conversation handler
  const handleSelectConversation = (convo: Conversation) => {
    setSelectedConversationId(convo.id)
    if (convo.parent_unread_count > 0) {
      markReadMutation.mutate(convo.id)
    }
  }

  // Send message handler
  const handleSend = () => {
    if (!messageInput.trim() || !activeConversation) return
    sendMutation.mutate({
      educatorProfileId: activeConversation.educator_profile_id,
      content: messageInput.trim(),
    })
  }

  // Scroll to bottom when messages change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const getEducatorName = (convo: Conversation): string => {
    const profile = convo.educator_profiles?.profiles
    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
    }
    return "Educateur"
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-[#E8E4DF] bg-white">
      {/* Conversation list */}
      <div
        className={cn(
          "w-full shrink-0 border-r border-[#E8E4DF] md:w-80 lg:w-96",
          selectedConversationId ? "hidden md:flex md:flex-col" : "flex flex-col"
        )}
      >
        <div className="border-b border-[#E8E4DF] p-4">
          <h2 className="font-heading text-lg font-bold text-[#1A1A1A]">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {convoLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FAF8F5]">
                <MessageCircle className="h-8 w-8 text-[#8C8279]" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-[#1A1A1A]">
                Aucune conversation
              </h3>
              <p className="mt-1 text-sm text-[#8C8279]">
                Vous n&apos;avez aucune conversation pour le moment.
              </p>
            </div>
          ) : (
            conversations.map((convo) => (
              <button
                key={convo.id}
                onClick={() => handleSelectConversation(convo)}
                className={cn(
                  "flex w-full items-center gap-3 border-b border-[#E8E4DF] px-4 py-3 text-left transition-colors hover:bg-[#FAF8F5]",
                  selectedConversationId === convo.id && "bg-[#FAF8F5]"
                )}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E8F5EE]">
                  <User className="h-5 w-5 text-[#2E7D52]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#1A1A1A]">
                      {getEducatorName(convo)}
                    </span>
                    <span className="text-xs text-[#8C8279]">
                      {formatRelativeTime(convo.last_message_at)}
                    </span>
                  </div>
                </div>
                {convo.parent_unread_count > 0 && (
                  <Badge className="shrink-0 bg-[#2E7D52] text-white">
                    {convo.parent_unread_count}
                  </Badge>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat window */}
      <div
        className={cn(
          "flex flex-1 flex-col",
          !selectedConversationId ? "hidden md:flex" : "flex"
        )}
      >
        {selectedConversationId && activeConversation ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 border-b border-[#E8E4DF] px-4 py-3">
              <Button
                variant="ghost"
                size="icon-sm"
                className="md:hidden"
                onClick={() => setSelectedConversationId(null)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E8F5EE]">
                <User className="h-5 w-5 text-[#2E7D52]" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[#1A1A1A]">
                  {getEducatorName(activeConversation)}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {messagesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
                      <Skeleton className="h-10 w-48 rounded-2xl" />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageCircle className="h-8 w-8 text-[#8C8279] mb-2" />
                  <p className="text-sm text-[#8C8279]">
                    Aucun message. Envoyez le premier message!
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isSent = msg.sender_profile_id === currentProfileId
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex flex-col",
                        isSent ? "items-end" : "items-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                          isSent
                            ? "bg-[#2E7D52] text-white"
                            : "bg-[#FAF8F5] text-[#1A1A1A]"
                        )}
                      >
                        {msg.content}
                      </div>
                      <span className="mt-1 text-xs text-[#8C8279]">
                        {formatMessageTime(msg.created_at)}
                      </span>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-[#E8E4DF] p-4">
              <div className="flex items-center gap-2">
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Ecrivez votre message..."
                  className="flex-1 rounded-full border-[#E8E4DF] bg-[#FAF8F5]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  disabled={sendMutation.isPending}
                />
                <Button
                  size="icon"
                  className="h-9 w-9 rounded-full bg-[#2E7D52] text-white hover:bg-[#256943]"
                  onClick={handleSend}
                  disabled={!messageInput.trim() || sendMutation.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FAF8F5]">
              <MessageCircle className="h-8 w-8 text-[#8C8279]" />
            </div>
            <h3 className="font-heading text-lg font-semibold text-[#1A1A1A]">
              Selectionnez une conversation
            </h3>
            <p className="mt-1 text-sm text-[#8C8279]">
              Choisissez une conversation pour commencer a discuter.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
