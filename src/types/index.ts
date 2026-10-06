export type UserRole = 'admin' | 'member';

export type TaskPriority = 'High' | 'Medium' | 'Low';

export type TaskStatus = 'To Do' | 'In Progress' | 'Done';

export type TaskCategory =
  | 'Quotation'
  | 'PO Follow-up'
  | 'Vendor Visit'
  | 'Payment Follow-up'
  | 'Other';

export interface Team {
  id: string;
  name: string;
  inviteCode: string;
  adminUid: string;
  createdAt: number;
}

export interface AppUser {
  uid: string;
  name: string;
  phone: string;
  role: UserRole;
  teamId: string | null;
  fcmToken?: string | null;
  createdAt: number;
}

export interface ExtensionRecord {
  previousDueDate: number;
  newDueDate: number;
  requestedAt: number;
  round: string;
}

export interface TaskAttachment {
  name: string;
  size: number;
  mimeType: string;
  storagePath: string;
  uploadedAt: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeUid: string;
  assigneeName: string;
  createdBy: string;
  teamId: string;
  priority: TaskPriority;
  category: TaskCategory;
  status: TaskStatus;
  dueDate: number;
  extensionHistory: ExtensionRecord[];
  attachment?: TaskAttachment | null;
  createdAt: number;
  updatedAt: number;
}

export interface TaskComment {
  id: string;
  text: string;
  authorUid: string;
  authorName: string;
  authorRole: UserRole;
  createdAt: number;
}

export interface AppNotification {
  id: string;
  teamId: string;
  userId: string;
  title: string;
  body: string;
  type: 'assigned' | 'overdue' | 'reminder' | 'status' | 'extension' | 'comment';
  taskId?: string;
  read: boolean;
  createdAt: number;
}

export type RootStackParamList = {
  Start: undefined;
  Signup: undefined;
  Login: { mode: 'existing' | 'new' };
  Onboarding: undefined;
  Main: undefined;
  CreateTask: { taskId?: string } | undefined;
  TaskDetail: { taskId: string };
  Profile: undefined;
  MyTeam: undefined;
  Reports: undefined;
};

export type MemberTabParamList = {
  MyTasks: undefined;
  Notifications: undefined;
};

export type AdminTabParamList = {
  AllTasks: undefined;
  MyTeamTab: undefined;
  ReportsTab: undefined;
  NotificationsTab: undefined;
};
