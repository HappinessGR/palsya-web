import { defineRelations } from 'drizzle-orm';
import * as schema from './schema';

// Drizzle ORM v1 replaced the classic per-table `relations()` helper with a
// single schema-wide `defineRelations()` call. Relation entries are keyed by
// relation name (not target table name), which is what lets patient_profiles
// have two distinct relations into `users` — `user` via user_id and
// `assignedClinician` via assigned_clinician_id.
export const dbRelations = defineRelations(schema, (r) => ({
  users: {
    patientProfile: r.one.patientProfiles({ from: r.users.id, to: r.patientProfiles.userId }),
    staffProfile: r.one.staffProfiles({ from: r.users.id, to: r.staffProfiles.userId }),
    assignedPatients: r.many.patientProfiles({ from: r.users.id, to: r.patientProfiles.assignedClinicianId }),
    signInEvents: r.many.signInEvents({ from: r.users.id, to: r.signInEvents.userId }),
    sessions: r.many.sessions({ from: r.users.id, to: r.sessions.userId }),
    activityLog: r.many.activityLog({ from: r.users.id, to: r.activityLog.userId }),
    consentRecords: r.many.consentRecords({ from: r.users.id, to: r.consentRecords.userId }),
    reviewedPhaseAssignments: r.many.phaseAssignments({ from: r.users.id, to: r.phaseAssignments.reviewedByStaffId }),
    authoredNotes: r.many.clinicianNotes({ from: r.users.id, to: r.clinicianNotes.authorId }),
  },
  patientProfiles: {
    user: r.one.users({ from: r.patientProfiles.userId, to: r.users.id }),
    assignedClinician: r.one.users({ from: r.patientProfiles.assignedClinicianId, to: r.users.id }),
    assessmentResponses: r.many.assessmentResponses({
      from: r.patientProfiles.id,
      to: r.assessmentResponses.patientProfileId,
    }),
    phaseAssignments: r.many.phaseAssignments({ from: r.patientProfiles.id, to: r.phaseAssignments.patientProfileId }),
    preferences: r.one.patientPreferences({ from: r.patientProfiles.id, to: r.patientPreferences.patientProfileId }),
    dailySessions: r.many.dailySessions({ from: r.patientProfiles.id, to: r.dailySessions.patientProfileId }),
    clinicianNotes: r.many.clinicianNotes({ from: r.patientProfiles.id, to: r.clinicianNotes.patientProfileId }),
  },
  assessmentResponses: {
    patientProfile: r.one.patientProfiles({ from: r.assessmentResponses.patientProfileId, to: r.patientProfiles.id }),
    safetyFlags: r.many.safetyFlags({ from: r.assessmentResponses.id, to: r.safetyFlags.assessmentResponseId }),
    phaseAssignments: r.many.phaseAssignments({
      from: r.assessmentResponses.id,
      to: r.phaseAssignments.assessmentResponseId,
    }),
  },
  safetyFlags: {
    assessmentResponse: r.one.assessmentResponses({
      from: r.safetyFlags.assessmentResponseId,
      to: r.assessmentResponses.id,
    }),
  },
  phaseAssignments: {
    patientProfile: r.one.patientProfiles({ from: r.phaseAssignments.patientProfileId, to: r.patientProfiles.id }),
    assessmentResponse: r.one.assessmentResponses({
      from: r.phaseAssignments.assessmentResponseId,
      to: r.assessmentResponses.id,
    }),
    reviewedByStaff: r.one.users({ from: r.phaseAssignments.reviewedByStaffId, to: r.users.id }),
  },
  consentRecords: {
    user: r.one.users({ from: r.consentRecords.userId, to: r.users.id }),
  },
  patientPreferences: {
    patientProfile: r.one.patientProfiles({ from: r.patientPreferences.patientProfileId, to: r.patientProfiles.id }),
  },
  dailySessions: {
    patientProfile: r.one.patientProfiles({ from: r.dailySessions.patientProfileId, to: r.patientProfiles.id }),
  },
  exercises: {
    stages: r.many.exerciseStages({ from: r.exercises.id, to: r.exerciseStages.exerciseId }),
  },
  exerciseStages: {
    exercise: r.one.exercises({ from: r.exerciseStages.exerciseId, to: r.exercises.id }),
  },
  tapingTechniques: {
    stages: r.many.tapingTechniqueStages({ from: r.tapingTechniques.id, to: r.tapingTechniqueStages.tapingTechniqueId }),
  },
  tapingTechniqueStages: {
    tapingTechnique: r.one.tapingTechniques({
      from: r.tapingTechniqueStages.tapingTechniqueId,
      to: r.tapingTechniques.id,
    }),
  },
  routineItems: {
    stages: r.many.routineItemStages({ from: r.routineItems.id, to: r.routineItemStages.routineItemId }),
  },
  routineItemStages: {
    routineItem: r.one.routineItems({ from: r.routineItemStages.routineItemId, to: r.routineItems.id }),
  },
  staffProfiles: {
    user: r.one.users({ from: r.staffProfiles.userId, to: r.users.id }),
  },
  authMethods: {
    signInEvents: r.many.signInEvents({ from: r.authMethods.id, to: r.signInEvents.authMethodId }),
  },
  signInEvents: {
    user: r.one.users({ from: r.signInEvents.userId, to: r.users.id }),
    authMethod: r.one.authMethods({ from: r.signInEvents.authMethodId, to: r.authMethods.id }),
    sessions: r.many.sessions({ from: r.signInEvents.id, to: r.sessions.signInEventId }),
  },
  sessions: {
    user: r.one.users({ from: r.sessions.userId, to: r.users.id }),
    signInEvent: r.one.signInEvents({ from: r.sessions.signInEventId, to: r.signInEvents.id }),
    activityLog: r.many.activityLog({ from: r.sessions.id, to: r.activityLog.sessionId }),
  },
  actionTypes: {
    activityLog: r.many.activityLog({ from: r.actionTypes.id, to: r.activityLog.actionTypeId }),
  },
  clinicianNotes: {
    patientProfile: r.one.patientProfiles({ from: r.clinicianNotes.patientProfileId, to: r.patientProfiles.id }),
    author: r.one.users({ from: r.clinicianNotes.authorId, to: r.users.id }),
  },
  activityLog: {
    user: r.one.users({ from: r.activityLog.userId, to: r.users.id }),
    session: r.one.sessions({ from: r.activityLog.sessionId, to: r.sessions.id }),
    actionType: r.one.actionTypes({ from: r.activityLog.actionTypeId, to: r.actionTypes.id }),
  },
}));
