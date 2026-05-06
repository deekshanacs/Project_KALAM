// ─── Enums ───────────────────────────────────────────────────────────────────

export enum Role {
  ADMIN = 'ADMIN',
  TEAM_LEADER = 'TEAM_LEADER',
  TEAM_MEMBER = 'TEAM_MEMBER',
  JUNIOR_MEMBER = 'JUNIOR_MEMBER',
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  DONE = 'DONE',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum AvailabilityStatus {
  AVAILABLE = 'AVAILABLE',
  IN_CALL = 'IN_CALL',
  AWAY = 'AWAY',
  OFFLINE = 'OFFLINE',
}

export enum MessageType {
  TEXT = 'TEXT',
  FILE = 'FILE',
  IMAGE = 'IMAGE',
  LINK = 'LINK',
}

export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const ROLE_WEIGHT: Record<Role, number> = {
  [Role.ADMIN]: 4,
  [Role.TEAM_LEADER]: 3,
  [Role.TEAM_MEMBER]: 2,
  [Role.JUNIOR_MEMBER]: 1,
};

export const MAX_CAPACITY: Record<Role, number> = {
  [Role.ADMIN]: 20,
  [Role.TEAM_LEADER]: 15,
  [Role.TEAM_MEMBER]: 10,
  [Role.JUNIOR_MEMBER]: 7,
};

export const OPEN_STATUSES: TaskStatus[] = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.REVIEW,
];

// ─── Core Entity Interfaces ───────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  availabilityStatus: AvailabilityStatus;
  avatarUrl: string | null;
  supervisorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  completedAt: string | null;
  attachments: string[];
  assignedById: string;
  assignedToId: string;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MessageReaction {
  emoji: string;
  userId: string;
  userName: string;
}

export interface Message {
  id: string;
  content: string | null;
  type: MessageType;
  attachments: string[];
  readBy: string[];
  reactions: MessageReaction[];
  replyToId: string | null;
  editedAt: string | null;
  deletedAt: string | null;
  senderId: string;
  receiverId: string | null;
  groupId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  name: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  joinedAt: string;
}

export interface DocumentShare {
  userId?: string;
  groupId?: string;
  permission: 'VIEW' | 'EDIT';
}

export interface Document {
  id: string;
  title: string;
  content: Record<string, unknown>;
  font: string;
  fontSize: number;
  theme: string;
  pageSize: string;
  sharedWith: DocumentShare[];
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeLog {
  id: string;
  hours: number;
  note: string | null;
  taskId: string;
  userId: string;
  createdAt: string;
}

export interface RefreshToken {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

// ─── Computed / DTO Types ─────────────────────────────────────────────────────

export interface WorkloadDto {
  userId: string;
  openTasks: number;
  maxCapacity: number;
  percentage: number;
  colorTier: 'green' | 'amber' | 'red';
}

export interface UserWithWorkload extends User {
  workload: WorkloadDto;
}

export interface UserWithSupervisor extends User {
  supervisor: Pick<User, 'id' | 'name' | 'role'> | null;
  subordinates?: Pick<User, 'id' | 'name' | 'role'>[];
}

export interface TaskWithRelations extends Task {
  assignedBy: Pick<User, 'id' | 'name' | 'avatarUrl'>;
  assignedTo: Pick<User, 'id' | 'name' | 'avatarUrl'>;
  project: Pick<Project, 'id' | 'name'> | null;
  _count: {
    comments: number;
    timeLogs: number;
  };
}

export interface MessageWithSender extends Message {
  sender: Pick<User, 'id' | 'name' | 'avatarUrl'>;
  replyTo?: (Pick<Message, 'id' | 'content'> & { sender: Pick<User, 'id' | 'name'> }) | null;
}

export interface GroupWithMembers extends Group {
  members: Array<{
    user: Pick<User, 'id' | 'name' | 'avatarUrl' | 'role'>;
    joinedAt: string;
  }>;
  _count?: {
    messages: number;
  };
}

export interface CommentWithAuthor extends Comment {
  author: Pick<User, 'id' | 'name' | 'avatarUrl'>;
}

export interface TimeLogWithUser extends TimeLog {
  user: Pick<User, 'id' | 'name' | 'avatarUrl'>;
}

// ─── AI Types ─────────────────────────────────────────────────────────────────

export interface AISummaryDto {
  summary: string;
  keyPoints: string[];
  analysis: string;
}

export interface CreateDocumentAnswers {
  type: string;
  tone: string;
  font: string;
  fontSize: string;
  pageSize: string;
  toc: boolean;
  sections: string;
  colorTheme: string;
  headerFooter: boolean;
  outputFormat: string;
}

export interface CreateDocumentRequestDto {
  description: string;
  answers: CreateDocumentAnswers;
}

// ─── Notification Types ───────────────────────────────────────────────────────

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_COMPLETED'
  | 'MESSAGE_RECEIVED'
  | 'DOCUMENT_SHARED';

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown>;
  createdAt: string;
  read: boolean;
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  error: string;
  details?: unknown;
}

// ─── Socket Event Payloads ────────────────────────────────────────────────────

export interface StatusChangePayload {
  userId: string;
  availabilityStatus: AvailabilityStatus;
}

export interface WorkloadUpdatePayload extends WorkloadDto {}

export interface WebRTCOfferPayload {
  fromUserId: string;
  offer: Record<string, unknown>;
}

export interface WebRTCAnswerPayload {
  fromUserId: string;
  answer: Record<string, unknown>;
}

export interface WebRTCIceCandidatePayload {
  fromUserId: string;
  candidate: Record<string, unknown>;
}
