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
  createdAt: number;
}

/** App profile at users/{uid}; uid is `emp_{employeeId}`. Written only by Cloud Functions. */
export interface AppUser {
  uid: string;
  employeeId: string;
  name: string;
  department: string;
  phone: string | null;
  active: boolean;
  superAdmin: boolean;
  /** Bumped on every login and forced logout; a device holding an older value signs out. */
  sessionVersion: number;
  role: UserRole;
  teamId: string | null;
  fcmToken?: string | null;
  createdAt: number;
  lastLoginAt?: number;
}

/** HR record at employees/{employeeId}; readable by super admins. The DOB is stored separately. */
export interface Employee {
  employeeId: string;
  name: string;
  department: string;
  active: boolean;
  superAdmin: boolean;
  deactivatedBy?: 'import' | 'manual' | null;
  phone: string | null;
  uid: string | null;
  failedAttempts: number;
  lockedUntil: number | null;
  linkedAt?: number;
  lastLoginAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface AuditEntry {
  id: string;
  type: string;
  employeeId?: string;
  name?: string;
  phone?: string;
  previousPhone?: string;
  actorEmployeeId?: string;
  actorName?: string;
  details?: string;
  createdAt: number;
}

/** One row read from the HR sheet, ready to send to importEmployees. */
export interface EmployeeImportRow {
  employeeId: string;
  name: string;
  dob: string; // YYYY-MM-DD
  department: string;
}

export interface ImportSummary {
  valid: number;
  created: number;
  updated: number;
  reactivated: number;
  unchanged: number;
  deactivated: number;
  errors: string[];
  errorCount: number;
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
  Login: undefined;
  Main: undefined;
  NoAccess: undefined;
  SuperAdmin: undefined;
  ImportEmployees: undefined;
  Employees: undefined;
  EmployeeDetail: { employeeId: string };
  EmployeeForm: { employeeId?: string } | undefined;
  Teams: undefined;
  ActivityLog: undefined;
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
