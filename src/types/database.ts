export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamps = {
  created_at: string;
  updated_at: string;
};

export type Profile = Timestamps & {
  id: string;
  email: string;
  full_name: string;
  preferred_name: string;
  avatar_url: string | null;
  theme: 'SYSTEM' | 'LIGHT' | 'DARK';
  theme_color: string;
  timezone: string;
  notifications_enabled: boolean;
};

export type Subject = Timestamps & {
  id: string;
  user_id: string;
  name: string;
  code: string;
  description: string;
  teacher: string;
  room: string;
  color: string;
  semester: string;
  academic_year: string;
  units: number;
};

export type ClassSchedule = Timestamps & {
  id: string;
  user_id: string;
  subject_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string;
};

export type AssignmentPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type AssignmentStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export type Assignment = Timestamps & {
  id: string;
  user_id: string;
  subject_id: string;
  title: string;
  description: string;
  due_at: string;
  priority: AssignmentPriority;
  status: AssignmentStatus;
  attachment_url: string | null;
  notes: string;
  reminder_offsets: number[];
  notification_ids: string[];
  completed_at: string | null;
};

export type ExamType = 'QUIZ' | 'EXAM' | 'MIDTERM' | 'FINAL' | 'PRACTICAL' | 'PRESENTATION' | 'OTHER';
export type ExamStatus = 'UPCOMING' | 'COMPLETED' | 'CANCELLED';

export type Exam = Timestamps & {
  id: string;
  user_id: string;
  subject_id: string;
  title: string;
  type: ExamType;
  exam_at: string;
  room: string;
  coverage: string;
  notes: string;
  status: ExamStatus;
  reminder_offsets: number[];
  notification_ids: string[];
};

export type MaterialType = 'PDF' | 'IMAGE' | 'DOCUMENT' | 'LINK' | 'VIDEO_LINK' | 'NOTE' | 'OTHER';

export type StudyMaterial = Timestamps & {
  id: string;
  user_id: string;
  subject_id: string;
  title: string;
  description: string;
  type: MaterialType;
  file_url: string | null;
  external_url: string | null;
  favorite: boolean;
  completed: boolean;
};

export type Note = Timestamps & {
  id: string;
  user_id: string;
  subject_id: string;
  title: string;
  content: string;
  favorite: boolean;
};

export type StudySessionStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

export type StudySession = Timestamps & {
  id: string;
  user_id: string;
  subject_id: string;
  exam_id: string | null;
  topic: string;
  planned_at: string;
  planned_duration: number;
  actual_duration: number | null;
  status: StudySessionStatus;
  notes: string;
  notification_id: string | null;
};

export type WebPushSubscription = Timestamps & {
  endpoint: string;
  user_id: string;
  p256dh: string;
  auth: string;
  user_agent: string;
  last_seen_at: string;
};

export type NotificationDelivery = {
  id: string;
  user_id: string;
  source_type: 'ASSIGNMENT' | 'EXAM' | 'SESSION';
  source_id: string;
  reminder_offset: number;
  scheduled_for: string;
  title: string;
  body: string;
  target_path: string;
  status: 'PENDING' | 'PROCESSING' | 'DELIVERED' | 'FAILED';
  attempt_count: number;
  claimed_at: string | null;
  delivered_at: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

type TableDefinition<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type CreateFields = { id?: string; user_id?: string; created_at?: string; updated_at?: string };

export type Database = {
  public: {
    Tables: {
      profiles: TableDefinition<Profile, Partial<Profile> & Pick<Profile, 'id' | 'email'>, Partial<Profile>>;
      subjects: TableDefinition<Subject, CreateFields & Pick<Subject, 'name'> & Partial<Omit<Subject, keyof CreateFields | 'name'>>, Partial<Subject>>;
      class_schedules: TableDefinition<ClassSchedule, CreateFields & Pick<ClassSchedule, 'subject_id' | 'day_of_week' | 'start_time' | 'end_time'> & Partial<Pick<ClassSchedule, 'room'>>, Partial<ClassSchedule>>;
      assignments: TableDefinition<Assignment, CreateFields & Pick<Assignment, 'subject_id' | 'title' | 'due_at'> & Partial<Omit<Assignment, keyof CreateFields | 'subject_id' | 'title' | 'due_at'>>, Partial<Assignment>>;
      exams: TableDefinition<Exam, CreateFields & Pick<Exam, 'subject_id' | 'title' | 'exam_at'> & Partial<Omit<Exam, keyof CreateFields | 'subject_id' | 'title' | 'exam_at'>>, Partial<Exam>>;
      study_materials: TableDefinition<StudyMaterial, CreateFields & Pick<StudyMaterial, 'subject_id' | 'title' | 'type'> & Partial<Omit<StudyMaterial, keyof CreateFields | 'subject_id' | 'title' | 'type'>>, Partial<StudyMaterial>>;
      notes: TableDefinition<Note, CreateFields & Pick<Note, 'subject_id' | 'title'> & Partial<Omit<Note, keyof CreateFields | 'subject_id' | 'title'>>, Partial<Note>>;
      study_sessions: TableDefinition<StudySession, CreateFields & Pick<StudySession, 'subject_id' | 'topic' | 'planned_at'> & Partial<Omit<StudySession, keyof CreateFields | 'subject_id' | 'topic' | 'planned_at'>>, Partial<StudySession>>;
      web_push_subscriptions: TableDefinition<WebPushSubscription, Pick<WebPushSubscription, 'endpoint' | 'p256dh' | 'auth'> & Partial<WebPushSubscription>, Partial<WebPushSubscription>>;
      notification_deliveries: TableDefinition<NotificationDelivery, Pick<NotificationDelivery, 'user_id' | 'source_type' | 'source_id' | 'reminder_offset' | 'scheduled_for' | 'title' | 'body' | 'target_path'> & Partial<NotificationDelivery>, Partial<NotificationDelivery>>;
    };
    Views: Record<string, never>;
    Functions: {
      register_web_push_subscription: { Args: { p_auth: string; p_endpoint: string; p_p256dh: string; p_user_agent: string }; Returns: undefined };
      unregister_web_push_subscription: { Args: { p_endpoint: string }; Returns: undefined };
      claim_due_web_notifications: { Args: { p_limit?: number }; Returns: NotificationDelivery[] };
      import_study_load: { Args: { p_subjects: Json }; Returns: Json };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
