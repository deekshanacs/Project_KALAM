import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Send, Paperclip, Smile, X, Reply, Edit2, Trash2,
  Users, Plus, Check, CheckCheck, File as FileIcon,
} from 'lucide-react';
import { Avatar } from '../components/common/Avatar';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import {
  getDirectMessagesApi, sendDirectMessageApi,
  getGroupMessagesApi, sendGroupMessageApi,
  editMessageApi, deleteMessageApi,
  markAsReadApi, reactToMessageApi,
  uploadChatFileApi, getGroupsApi, createGroupApi,
} from '../api/chat.api';
import { getUsersApi } from '../api/users.api';
import type { MessageWithSender, GroupWithMembers, User, MessageReaction } from '@tms/shared';
import { formatRelativeTime } from '../utils/formatters';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏'];

type ConvType = 'dm' | 'group';
interface Conversation {
  type: ConvType;
  id: string;
  name: string;
  avatarUrl?: string | null | undefined;
  lastMessage?: string | undefined;
  lastSender?: string | undefined;
  unread: number;
}

// Build a short preview string for the sidebar
function buildPreview(msg: MessageWithSender, myId: string): string {
  const sender = msg.senderId === myId ? 'You' : msg.sender.name;
  const body = msg.deletedAt
    ? 'Message deleted'
    : (msg.attachments as string[]).length > 0
      ? '📎 Attachment'
      : msg.content?.slice(0, 45) ?? '';
  return `${sender}: ${body}`;
}

export default function Chat() {
  const { user: me } = useAuth();
  const { on, off, emit } = useSocket();

  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<GroupWithMembers[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);

  // Composer state
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<MessageWithSender | null>(null);
  const [editingMsg, setEditingMsg] = useState<MessageWithSender | null>(null);
  const [showEmoji, setShowEmoji] = useState<string | null>(null); // messageId
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Group creation
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Load users + groups + compute real unread counts from DB ──
  useEffect(() => {
    if (!me?.id) return;

    Promise.all([getUsersApi(), getGroupsApi()]).then(async ([u, g]) => {
      setUsers(u);
      setGroups(g);

      // Fetch recent messages for each DM to get unread count + last message
      const dmConvs: Conversation[] = await Promise.all(
        u
          .filter((u2) => u2.id !== me.id)
          .map(async (u2) => {
            try {
              const msgs = await getDirectMessagesApi(u2.id);
              const unread = msgs.filter(
                (m) => m.senderId !== me.id && !(m.readBy as string[]).includes(me.id)
              ).length;
              const last = msgs[msgs.length - 1];
              const lastMessage = last
                ? buildPreview(last, me.id)
                : undefined;
              return {
                type: 'dm' as ConvType,
                id: u2.id,
                name: u2.name,
                avatarUrl: u2.avatarUrl,
                unread,
                lastMessage,
              };
            } catch {
              return { type: 'dm' as ConvType, id: u2.id, name: u2.name, avatarUrl: u2.avatarUrl, unread: 0 };
            }
          })
      );

      // Fetch group messages for unread counts
      const groupConvs: Conversation[] = await Promise.all(
        g.map(async (gr) => {
          try {
            const msgs = await getGroupMessagesApi(gr.id);
            const unread = msgs.filter(
              (m) => m.senderId !== me.id && !(m.readBy as string[]).includes(me.id)
            ).length;
            const last = msgs[msgs.length - 1];
            const lastMessage = last ? buildPreview(last, me.id) : undefined;
            return { type: 'group' as ConvType, id: gr.id, name: gr.name, unread, lastMessage };
          } catch {
            return { type: 'group' as ConvType, id: gr.id, name: gr.name, unread: 0 };
          }
        })
      );

      // Sort: conversations with unread first, then by last message
      const all = [...dmConvs, ...groupConvs].sort((a, b) => {
        if (b.unread !== a.unread) return b.unread - a.unread;
        return 0;
      });

      setConversations(all);
    }).catch(() => undefined);
  }, [me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load messages when conversation changes ──
  useEffect(() => {
    if (!activeConv) return;
    setIsLoadingMsgs(true);
    setMessages([]);

    // Reset unread count for this conversation
    setConversations((prev) =>
      prev.map((c) => c.id === activeConv.id ? { ...c, unread: 0 } : c)
    );

    const load = activeConv.type === 'dm'
      ? getDirectMessagesApi(activeConv.id)
      : getGroupMessagesApi(activeConv.id);

    load.then((msgs) => {
      setMessages(msgs);

      // Seed last message preview from history
      if (msgs.length > 0) {
        const last = msgs[msgs.length - 1]!;
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConv.id
              ? { ...c, lastMessage: buildPreview(last, me?.id ?? '') }
              : c
          )
        );
      }

      // Mark all unread as read
      msgs
        .filter((m) => m.senderId !== me?.id && !(m.readBy as string[]).includes(me?.id ?? ''))
        .forEach((m) => void markAsReadApi(m.id));
    }).catch(() => undefined).finally(() => setIsLoadingMsgs(false));

    if (activeConv.type === 'group') emit('join:group', activeConv.id);
  }, [activeConv?.id, activeConv?.type, me?.id, emit]);

  // ── Scroll to bottom ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ── Socket events ──
  useEffect(() => {
    const onNew = (msg: unknown) => {
      const m = msg as MessageWithSender;

      // Determine which conversation this belongs to
      const convId = m.groupId
        ? m.groupId
        : m.senderId === me?.id
          ? m.receiverId!   // I sent it — belongs to receiver's conv
          : m.senderId;     // Someone sent to me — belongs to sender's conv

      const isForActive =
        (activeConv?.type === 'dm' && (m.senderId === activeConv.id || m.receiverId === activeConv.id)) ||
        (activeConv?.type === 'group' && m.groupId === activeConv.id);

      // Build last message preview text
      const preview = m.deletedAt
        ? 'Message deleted'
        : (m.attachments as string[]).length > 0
          ? '📎 Attachment'
          : m.content?.slice(0, 50) ?? '';

      const senderLabel = m.senderId === me?.id ? 'You' : m.sender.name;
      const lastMsg = `${senderLabel}: ${preview}`;

      if (isForActive) {
        // Add to active thread
        setMessages((prev) => {
          if (prev.find((p) => p.id === m.id)) return prev;
          return [...prev, m];
        });
        if (m.senderId !== me?.id) void markAsReadApi(m.id);
        // Update last message but keep unread = 0 (it's open)
        setConversations((prev) =>
          prev.map((c) => c.id === convId ? { ...c, lastMessage: lastMsg } : c)
        );
      } else {
        // Not the active conversation — increment unread + update preview
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  lastMessage: lastMsg,
                  unread: m.senderId !== me?.id ? c.unread + 1 : c.unread,
                }
              : c
          )
        );
      }
    };

    const onEdited = (msg: unknown) => {
      const m = msg as MessageWithSender;
      setMessages((prev) => prev.map((p) => p.id === m.id ? m : p));
    };

    const onDeleted = (msg: unknown) => {
      const m = msg as MessageWithSender;
      setMessages((prev) => prev.map((p) => p.id === m.id ? m : p));
    };

    const onRead = (data: unknown) => {
      const { messageId, readBy } = data as { messageId: string; readBy: string[] };
      setMessages((prev) => prev.map((p) => p.id === messageId ? { ...p, readBy } : p));
    };

    const onReaction = (data: unknown) => {
      const { messageId, reactions } = data as { messageId: string; reactions: MessageReaction[] };
      setMessages((prev) => prev.map((p) => p.id === messageId ? { ...p, reactions } : p));
    };

    on('message:new', onNew);
    on('message:edited', onEdited);
    on('message:deleted', onDeleted);
    on('message:read', onRead);
    on('message:reaction', onReaction);

    return () => {
      off('message:new', onNew);
      off('message:edited', onEdited);
      off('message:deleted', onDeleted);
      off('message:read', onRead);
      off('message:reaction', onReaction);
    };
  }, [on, off, activeConv, me?.id]);

  // ── Send message ──
  const handleSend = async () => {
    const content = text.trim();
    if (!content && !editingMsg) return;
    if (!activeConv) return;

    setIsSending(true);
    try {
      if (editingMsg) {
        const updated = await editMessageApi(editingMsg.id, content);
        setMessages((prev) => prev.map((p) => p.id === updated.id ? updated : p));
        setEditingMsg(null);
      } else {
        const msg = activeConv.type === 'dm'
          ? await sendDirectMessageApi(activeConv.id, content, [], replyTo?.id)
          : await sendGroupMessageApi(activeConv.id, content, [], replyTo?.id);
        setMessages((prev) => [...prev, msg]);
        // Update last message preview in sidebar
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConv.id
              ? { ...c, lastMessage: buildPreview(msg, me?.id ?? '') }
              : c
          )
        );
        setReplyTo(null);
      }
      setText('');
    } catch {
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // ── File upload ──
  const handleFileUpload = async (file: File) => {
    if (!activeConv) return;
    try {
      const { url, type } = await uploadChatFileApi(file);
      // Send as message with the file URL and correct type
      const sendFn = activeConv.type === 'dm'
        ? () => sendDirectMessageApi(activeConv.id, '', [url], replyTo?.id)
        : () => sendGroupMessageApi(activeConv.id, '', [url], replyTo?.id);
      const msg = await sendFn();
      setMessages((prev) => [...prev, msg]);
      setReplyTo(null);
      toast.success(type === 'IMAGE' ? 'Image sent' : 'File sent');
    } catch (err) {
      console.error('File upload error:', err);
      toast.error('Failed to upload file');
    }
  };

  // ── React ──
  const handleReact = async (messageId: string, emoji: string) => {
    setShowEmoji(null);
    try {
      await reactToMessageApi(messageId, emoji);
    } catch {
      toast.error('Failed to react');
    }
  };

  // ── Delete ──
  const handleDelete = async (msg: MessageWithSender) => {
    try {
      await deleteMessageApi(msg.id);
    } catch {
      toast.error('Failed to delete');
    }
  };

  // ── Create group ──
  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;
    try {
      const group = await createGroupApi(groupName, selectedMembers);
      setGroups((prev) => [...prev, group]);
      setConversations((prev) => [...prev, { type: 'group', id: group.id, name: group.name, unread: 0 }]);
      setShowNewGroup(false);
      setGroupName('');
      setSelectedMembers([]);
      toast.success('Group created');
    } catch {
      toast.error('Failed to create group');
    }
  };

  const isOwn = (msg: MessageWithSender) => msg.senderId === me?.id;

  const getReadStatus = (msg: MessageWithSender) => {
    if (!isOwn(msg)) return null;
    const readBy = msg.readBy as string[];
    const othersRead = readBy.filter((id) => id !== me?.id);
    if (othersRead.length > 0) return 'seen';
    return 'sent';
  };

  return (
    <div className="flex h-full overflow-hidden" data-testid="chat-page">
      {/* ── Left panel: conversation list ── */}
      <div className="w-72 flex-shrink-0 flex flex-col glass-subtle border-r border-white/8">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/8">
          <h2 className="font-semibold text-sm uppercase tracking-widest opacity-60">Messages</h2>
          <button
            onClick={() => setShowNewGroup(true)}
            className="p-1.5 glass rounded-lg hover:bg-white/10 transition-all"
            aria-label="New group"
          >
            <Plus size={15} />
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin py-2">
          {conversations.map((conv) => {
            const isActive = activeConv?.id === conv.id;
            const otherUser = conv.type === 'dm' ? users.find((u) => u.id === conv.id) : null;
            const hasUnread = conv.unread > 0;
            return (
              <button
                key={conv.id}
                onClick={() => setActiveConv(conv)}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-3 transition-all text-left relative',
                  isActive
                    ? 'bg-white/12 border-l-2 border-white/60'
                    : hasUnread
                      ? 'bg-white/6 hover:bg-white/10'
                      : 'hover:bg-white/5'
                )}
              >
                <div className="relative flex-shrink-0">
                  <Avatar
                    src={otherUser?.avatarUrl ?? null}
                    name={conv.name}
                    size="md"
                    status={otherUser?.availabilityStatus ?? undefined}
                  />
                  {conv.type === 'group' && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 glass rounded-full flex items-center justify-center">
                      <Users size={9} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className={clsx('text-sm truncate', hasUnread ? 'font-bold' : 'font-medium')}>
                      {conv.name}
                    </p>
                  </div>
                  {conv.lastMessage && (
                    <p className={clsx(
                      'text-xs truncate mt-0.5',
                      hasUnread ? 'opacity-80 font-medium' : 'opacity-40'
                    )}>
                      {conv.lastMessage}
                    </p>
                  )}
                </div>
                {/* Unread badge */}
                {hasUnread && (
                  <span className="w-5 h-5 bg-white text-black text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                    {conv.unread > 99 ? '99+' : conv.unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right panel: message thread ── */}
      {activeConv ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Thread header */}
          <div className="flex items-center gap-3 px-5 py-3 glass-subtle border-b border-white/8">
            {(() => {
              const otherUser = activeConv.type === 'dm' ? users.find((u) => u.id === activeConv.id) : null;
              return (
                <>
                  <Avatar src={otherUser?.avatarUrl ?? null} name={activeConv.name} size="sm" status={otherUser?.availabilityStatus ?? undefined} />
                  <div>
                    <p className="font-semibold text-sm">{activeConv.name}</p>
                    {otherUser && (
                      <p className="text-xs opacity-50 capitalize">{otherUser.availabilityStatus.toLowerCase().replace('_', ' ')}</p>
                    )}
                    {activeConv.type === 'group' && (
                      <p className="text-xs opacity-50">
                        {groups.find((g) => g.id === activeConv.id)?.members.length ?? 0} members
                      </p>
                    )}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-1">
            {isLoadingMsgs ? (
              <div className="flex justify-center py-8 opacity-40">Loading…</div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-30">
                <p className="text-sm">No messages yet. Say hello! 👋</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const own = isOwn(msg);
                const showAvatar = !own && (idx === 0 || messages[idx - 1]?.senderId !== msg.senderId);
                const isDeleted = !!msg.deletedAt;
                const readStatus = getReadStatus(msg);
                const reactions = (msg.reactions as MessageReaction[]) ?? [];

                return (
                  <div
                    key={msg.id}
                    className={clsx('flex items-end gap-2 group', own ? 'flex-row-reverse' : 'flex-row')}
                    onMouseEnter={() => setHoveredMsg(msg.id)}
                    onMouseLeave={() => { setHoveredMsg(null); setShowEmoji(null); }}
                  >
                    {/* Avatar */}
                    {!own && (
                      <div className="w-7 flex-shrink-0">
                        {showAvatar && <Avatar src={msg.sender.avatarUrl ?? null} name={msg.sender.name} size="sm" />}
                      </div>
                    )}

                    <div className={clsx('flex flex-col max-w-xs lg:max-w-md', own ? 'items-end' : 'items-start')}>
                      {/* Sender name — always show for group, show for DM when not own */}
                      {!own && showAvatar && (
                        <p className="text-xs font-semibold mb-1 ml-1 opacity-70">
                          {msg.sender.name}
                        </p>
                      )}

                      {/* Reply preview */}
                      {msg.replyTo && (
                        <div className={clsx(
                          'text-xs px-3 py-1.5 rounded-t-xl border-l-2 border-white/30 mb-0.5 max-w-full',
                          'glass opacity-70 truncate'
                        )}>
                          <span className="font-medium">{msg.replyTo.sender.name}: </span>
                          {msg.replyTo.content?.slice(0, 60) ?? 'Attachment'}
                        </div>
                      )}

                      {/* Bubble */}
                      <div className={clsx(
                        'relative px-3.5 py-2 rounded-2xl text-sm leading-relaxed',
                        own
                          ? 'bg-white/15 border border-white/20 rounded-br-sm'
                          : 'glass rounded-bl-sm',
                        isDeleted && 'opacity-40 italic'
                      )}>
                        {isDeleted ? (
                          <span className="text-xs">This message was deleted</span>
                        ) : (
                          <>
                            {/* Attachments */}
                            {(msg.attachments as string[]).map((url, i) => {
                              const isImg = /\.(png|jpg|jpeg|gif|webp)$/i.test(url);
                              return isImg ? (
                                <img key={i} src={url} alt="attachment" className="max-w-full rounded-xl mb-1 max-h-48 object-cover" />
                              ) : (
                                <a key={i} href={url} target="_blank" rel="noreferrer"
                                  className="flex items-center gap-2 glass rounded-lg px-3 py-2 mb-1 hover:bg-white/10 transition-colors">
                                  <FileIcon size={14} />
                                  <span className="text-xs truncate max-w-32">{url.split('/').pop()}</span>
                                </a>
                              );
                            })}

                            {/* Text */}
                            {msg.content && <span>{msg.content}</span>}

                            {/* Edited */}
                            {msg.editedAt && <span className="text-xs opacity-40 ml-1">(edited)</span>}
                          </>
                        )}
                      </div>

                      {/* Reactions */}
                      {reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {Object.entries(
                            reactions.reduce<Record<string, { count: number; mine: boolean }>>((acc, r) => {
                              if (!acc[r.emoji]) acc[r.emoji] = { count: 0, mine: false };
                              acc[r.emoji]!.count++;
                              if (r.userId === me?.id) acc[r.emoji]!.mine = true;
                              return acc;
                            }, {})
                          ).map(([emoji, { count, mine }]) => (
                            <button
                              key={emoji}
                              onClick={() => void handleReact(msg.id, emoji)}
                              className={clsx(
                                'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs glass transition-all',
                                mine ? 'bg-white/20 border-white/30' : 'hover:bg-white/10'
                              )}
                            >
                              {emoji} {count > 1 && count}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Time + read status */}
                      <div className={clsx('flex items-center gap-1 mt-0.5', own ? 'flex-row-reverse' : 'flex-row')}>
                        <span className="text-xs opacity-30">{formatRelativeTime(msg.createdAt)}</span>
                        {readStatus === 'seen' && <CheckCheck size={12} className="text-blue-400 opacity-70" />}
                        {readStatus === 'sent' && <Check size={12} className="opacity-30" />}
                      </div>
                    </div>

                    {/* Action toolbar (hover) */}
                    {hoveredMsg === msg.id && !isDeleted && (
                      <div className={clsx(
                        'flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
                        own ? 'flex-row-reverse' : 'flex-row'
                      )}>
                        {/* Emoji react */}
                        <div className="relative">
                          <button
                            onClick={() => setShowEmoji(showEmoji === msg.id ? null : msg.id)}
                            className="p-1.5 glass rounded-lg hover:bg-white/10 transition-all"
                            aria-label="React"
                          >
                            <Smile size={13} />
                          </button>
                          {showEmoji === msg.id && (
                            <div className={clsx(
                              'absolute bottom-8 glass-strong rounded-xl p-2 flex gap-1.5 z-50 shadow-xl',
                              own ? 'right-0' : 'left-0'
                            )}>
                              {QUICK_EMOJIS.map((e) => (
                                <button key={e} onClick={() => void handleReact(msg.id, e)}
                                  className="text-base hover:scale-125 transition-transform">
                                  {e}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Reply */}
                        <button
                          onClick={() => { setReplyTo(msg); textareaRef.current?.focus(); }}
                          className="p-1.5 glass rounded-lg hover:bg-white/10 transition-all"
                          aria-label="Reply"
                        >
                          <Reply size={13} />
                        </button>

                        {/* Edit (own only) */}
                        {own && msg.content && (
                          <button
                            onClick={() => { setEditingMsg(msg); setText(msg.content ?? ''); textareaRef.current?.focus(); }}
                            className="p-1.5 glass rounded-lg hover:bg-white/10 transition-all"
                            aria-label="Edit"
                          >
                            <Edit2 size={13} />
                          </button>
                        )}

                        {/* Delete (own only) */}
                        {own && (
                          <button
                            onClick={() => void handleDelete(msg)}
                            className="p-1.5 glass rounded-lg hover:bg-white/10 transition-all text-red-400"
                            aria-label="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Reply / Edit banner */}
          <AnimatePresence>
            {(replyTo || editingMsg) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="px-4 py-2 glass-subtle border-t border-white/8 flex items-center justify-between"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {replyTo && <Reply size={14} className="opacity-50 flex-shrink-0" />}
                  {editingMsg && <Edit2 size={14} className="opacity-50 flex-shrink-0" />}
                  <p className="text-xs opacity-60 truncate">
                    {replyTo ? `Replying to ${replyTo.sender.name}: ${replyTo.content?.slice(0, 50) ?? 'Attachment'}` : `Editing message`}
                  </p>
                </div>
                <button onClick={() => { setReplyTo(null); setEditingMsg(null); setText(''); }}
                  className="p-1 text-gray-400 hover:text-white flex-shrink-0">
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Composer */}
          <div className="px-4 py-3 glass-subtle border-t border-white/8 flex items-end gap-2">
            {/* File attach */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 glass rounded-xl hover:bg-white/10 transition-all flex-shrink-0"
              aria-label="Attach file"
            >
              <Paperclip size={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.csv"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFileUpload(f); e.target.value = ''; }}
            />

            {/* Text input */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); }
              }}
              placeholder="Type a message…"
              rows={1}
              className="flex-1 bg-transparent resize-none text-sm focus:outline-none placeholder-gray-600 py-2.5 max-h-32 scrollbar-thin"
              style={{ lineHeight: '1.4' }}
            />

            {/* Send */}
            <button
              onClick={() => void handleSend()}
              disabled={isSending || (!text.trim() && !editingMsg)}
              className="p-2.5 bg-white/15 hover:bg-white/25 disabled:opacity-30 rounded-xl transition-all flex-shrink-0 border border-white/20"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center opacity-30">
          <div className="text-center">
            <p className="text-lg font-medium">Select a conversation</p>
            <p className="text-sm mt-1">Choose a person or group to start chatting</p>
          </div>
        </div>
      )}

      {/* ── New Group modal ── */}
      <AnimatePresence>
        {showNewGroup && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setShowNewGroup(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="glass-strong rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-semibold">New Group</h3>
                  <button onClick={() => setShowNewGroup(false)} className="opacity-50 hover:opacity-100"><X size={16} /></button>
                </div>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group name"
                  className="w-full bg-transparent border-b border-white/20 focus:border-white/50 pb-2 text-sm focus:outline-none mb-4 placeholder-gray-600"
                />
                <p className="text-xs opacity-50 uppercase tracking-widest mb-2">Add members</p>
                <div className="max-h-48 overflow-y-auto scrollbar-thin space-y-1 mb-4">
                  {users.filter((u) => u.id !== me?.id).map((u) => (
                    <button key={u.id}
                      onClick={() => setSelectedMembers((prev) =>
                        prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                      )}
                      className={clsx(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all',
                        selectedMembers.includes(u.id) ? 'bg-white/15' : 'hover:bg-white/5'
                      )}
                    >
                      <Avatar src={u.avatarUrl ?? null} name={u.name} size="sm" />
                      <span className="flex-1 text-left">{u.name}</span>
                      {selectedMembers.includes(u.id) && <Check size={14} className="opacity-60" />}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => void handleCreateGroup()}
                  disabled={!groupName.trim() || selectedMembers.length === 0}
                  className="w-full py-2.5 bg-white/15 hover:bg-white/25 disabled:opacity-30 rounded-xl text-sm font-medium transition-all border border-white/20"
                >
                  Create Group ({selectedMembers.length} members)
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}


