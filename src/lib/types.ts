// Types mirror the Spring Boot API records (see backend */api and */web packages).

export type Role = 'BDR' | 'AE' | 'MANAGER' | 'ADMIN';
export type LifecycleStage = 'PROSPECT' | 'SQL' | 'L1' | 'MULTITHREADING' | 'L2' | 'L3' | 'NEGOTIATION' | 'WON' | 'LOST' | 'IMPLEMENTATION';
export type EngagementStatus = 'NOT_CONTACTED' | 'CONTACTED' | 'CONNECTED' | 'MEETING_SCHEDULED' | 'MEETING_COMPLETED'
  | 'FOLLOW_UP_PENDING' | 'UNRESPONSIVE' | 'NOT_RELEVANT' | 'REFERRED';
export type Department = 'FINANCE' | 'HR' | 'PAYROLL' | 'OTHER';
export type Temperature = 'HOT' | 'WARM' | 'COLD';
export type TaskType = 'CALL' | 'FOLLOW_UP' | 'SEND_TEMPLATE' | 'FIND_NUMBER' | 'RESCHEDULE_MEETING' | 'RECORD_OUTCOME'
  | 'REVIVAL' | 'REVIEW_INACTIVE' | 'MULTITHREAD' | 'OTHER';
export type ActivityType = 'CALL' | 'EMAIL' | 'WHATSAPP' | 'LINKEDIN' | 'OFFICE_VISIT' | 'NOTE' | 'MEETING' | 'REFERRAL' | 'STATUS_CHANGE';
export type MeetingOutcome = 'COMPLETED_QUALIFIED' | 'COMPLETED_FOLLOW_UP' | 'COMPLETED_NOT_INTERESTED' | 'NO_SHOW' | 'RESCHEDULED' | 'DISQUALIFIED';
export type MeetingLevel = 'L1' | 'L2' | 'L3' | 'OTHER';
export type SqlStatus = 'PENDING_QUALIFICATION' | 'QUALIFIED_SQL' | 'REJECTED_NOT_ICP' | 'PENDING_SENIOR_CONNECTION'
  | 'MEETING_BOOKED' | 'NO_SHOW' | 'DISQUALIFIED';
export type BusinessRelevance = 'FBP' | 'PAYROLL' | 'BOTH';
export type IntentRating = 'LOW' | 'MEDIUM' | 'HIGH';

export interface UserView {
  id: string; email: string; fullName: string; phone?: string; role: Role; managerId?: string; active: boolean; lastLoginAt?: string;
}
export interface Token { accessToken: string; expiresAt: string; user: UserView }

export interface PicklistItem {
  id: string; key: string; code: string; label: string; sortOrder: number; active: boolean;
  requiresRevisitDate: boolean; requiresRemark: boolean;
}
export interface City { id: string; name: string; region?: string; priority: 'P0' | 'P1' | 'NONE' }

export interface AccountRow {
  id: string; name: string; city?: string; sizeBucket?: string; licensePotential?: number; stage: LifecycleStage;
  status: 'ACTIVE' | 'INACTIVE'; zone: 'PROSPECTING' | 'PIPELINE'; aeOwner?: string; bdrs?: string; temperature?: Temperature;
  expectedMrr?: number; nextStep?: string; nextStepDue?: string; lastActivityAt?: string; inactiveReason?: string;
  revisitOn?: string; flaggedForReview: boolean; createdAt: string;
  myLastTouchAt?: string; myCalls?: number; workedByOthers?: string;
}
export interface Page<T> { items: T[]; total: number; page: number; size: number }

export interface AccountView {
  id: string; name: string; domain?: string; website?: string; industryId?: string; subIndustry?: string; cityId?: string;
  employeeCount?: number; taxableEmployeeCount?: number; licensePotential?: number; sizeBucket?: string; leadSourceId?: string;
  aeOwnerId?: string; sqlCreditBdrId?: string; stage: LifecycleStage; zone: 'PROSPECTING' | 'PIPELINE'; pipelineSince?: string;
  status: 'ACTIVE' | 'INACTIVE'; inactiveReasonId?: string; inactiveRemark?: string; inactiveSince?: string; revisitOn?: string;
  icpFit?: 'YES' | 'NO' | 'UNKNOWN'; intentRating?: IntentRating; nextStep?: string; nextStepDue?: string;
  lastActivityAt?: string; reviewFlaggedAt?: string; createdAt: string; version: number;
}

export interface EmailView { id: string; email: string; primary: boolean; valid: boolean }
export interface PhoneView { id: string; raw: string; e164: string; primary: boolean; whatsapp: boolean; valid: boolean }
export interface StakeholderView {
  id: string; accountId: string; bdrOwnerId?: string; firstName: string; lastName?: string; designation?: string;
  level?: number; department?: Department; priorityRank: number; buyingRole?: string; rightPoc: boolean; primarySpoc: boolean;
  decisionMaker: boolean; engagement: EngagementStatus; connectionType?: string; referredById?: string; linkedinUrl?: string;
  doNotContact: boolean; callAttempts: number; lastInteractionAt?: string; nextFollowUpAt?: string;
  emails: EmailView[]; phones: PhoneView[]; masked: boolean;
}

export interface TimelineEvent {
  kind: string; id: string; stakeholderId?: string; type: string; summary?: string; at: string; byId?: string; byName?: string; zone?: string;
}

export interface MeetingRow {
  id: string; level: MeetingLevel; alsoCompletesL2: boolean; status: string; outcome?: MeetingOutcome; bookedOn?: string;
  bookedBy: string; ae?: string; scheduledStart: string; scheduledEnd?: string; meetingLink?: string; notes?: string;
  nextStep?: string; nextStepDue?: string; attendees?: string;
}

export interface OpportunitySummary {
  id: string; stage: LifecycleStage; stageEnteredAt?: string; temperature?: Temperature; expectedMrr?: number;
  licenseCount?: number; nextStep?: string; nextStepDue?: string; expectedCloseDate?: string; version: number;
}

export interface AccountPage {
  account: AccountView;
  owners: { role: string; id: string; name: string }[];
  workedBy?: { userId: string; name: string; role: string; me: boolean; calls: number; touches: number; lastAt: string }[];
  stakeholdersByDepartment: Partial<Record<Department, StakeholderView[]>>;
  meetings: MeetingRow[];
  opportunity: OpportunitySummary | null;
  timeline: TimelineEvent[];
}

export interface MyDayItem {
  section: 'OVERDUE' | 'DUE_TODAY' | 'UNTOUCHED' | 'REVIVAL'; taskId?: string; accountId: string; accountName: string;
  stakeholderId?: string; stakeholderName?: string; designation?: string; phone?: string; title?: string; dueAt?: string; priorityRank: number;
}

export interface OutcomePlan {
  newStatus?: EngagementStatus; attemptsAfter: number; taskType?: TaskType; taskDue?: string; revisitOn?: string;
  offerSequence: boolean; markPhoneInvalid: boolean; setIcpFitNo: boolean; openL1Booking: boolean; createReferral: boolean;
  maxAttemptsReached: boolean;
}
export interface LogCallResult {
  activityId: string; plan: OutcomePlan; taskId?: string; referredStakeholder?: StakeholderView; offerSequence: boolean;
  openL1Booking: boolean; suggestedNextStakeholder?: { id: string; name: string; designation?: string } | null; nextQueueItem?: MyDayItem | null;
}

export interface TaskRow {
  id: string; type: TaskType; title: string; dueAt: string; status: string; source: string; accountId: string; accountName: string;
  stakeholderId?: string; stakeholderName?: string; meetingId?: string;
}

export interface CriterionResult { code: string; status: 'PASS' | 'FAIL' | 'NEEDS_APPROVAL'; detail?: string }
export interface SqlChecklist {
  criteria: CriterionResult[]; missingFields: string[]; canSubmit: boolean; needsApproval: boolean; stakeholderLevel?: number; connectionType?: string;
}
export interface SqlRow {
  id: string; accountId: string; accountName: string; status: SqlStatus; submittedBy: string; submittedAt?: string;
  sizeBucket?: string; locationPriority?: string; smallException: boolean; intentRating?: IntentRating;
}
export interface QueueRow {
  submissionId: string; status: SqlStatus; accountId: string; accountName: string; sizeBucket?: string; locationPriority?: string;
  smallException: boolean; submittedBy: string; submittedAt?: string; l1At?: string; aeOwner?: string;
}
export interface AeLoad {
  aeId: string; name: string; activeAccounts: number; l1Pending: number; l2: number; l3: number; negotiation: number;
  inactive: number; totalAssigned: number; weightedLoad: number; lastAssignedAt?: string;
}
export interface CapacityRow { load: AeLoad; workload: 'LOW' | 'BALANCED' | 'HIGH'; rank: number }

export interface NotificationRow {
  id: string; type: string; title: string; body?: string; entityType?: string; entityId?: string; readAt?: string; createdAt: string;
}
export interface Achievement { userId: string; userName: string; metric: string; target: number; actual: number; pct?: number }
