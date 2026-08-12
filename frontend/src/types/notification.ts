export type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_REMINDER"
  | "WORKFLOW_ALERT"
  | "COMMENT_MENTION"
  | "PROJECT_INVITE";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  type: NotificationType;
  in_app: boolean;
  email: boolean;
  created_at: string;
  updated_at: string;
}
