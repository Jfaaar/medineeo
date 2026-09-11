export {
  clinicalApi,
  useListClinicalNotesQuery,
  useGetClinicalNoteQuery,
  useCreateClinicalNoteMutation,
  useUpdateClinicalNoteMutation,
  useSignClinicalNoteMutation,
  useDeleteClinicalNoteMutation,
} from './api/clinicalApi';
export type { ClinicalNote } from './api/clinicalApi';

export {
  medicalApi,
  useListVitalsQuery,
  useCreateVitalMutation,
  useUpdateVitalMutation,
  useDeleteVitalMutation,
  useListProblemsQuery,
  useCreateProblemMutation,
  useUpdateProblemMutation,
  useDeleteProblemMutation,
  useListVaccinationsQuery,
  useCreateVaccinationMutation,
  useUpdateVaccinationMutation,
  useDeleteVaccinationMutation,
  useListBodyRegionsQuery,
  useCreateBodyRegionMutation,
  useUpdateBodyRegionMutation,
  useDeleteBodyRegionMutation,
} from './api/medicalApi';
export type {
  VitalSigns,
  Problem,
  ProblemStatus,
  Vaccination,
  BodyRegionFinding,
  BodyRegionSide,
} from './api/medicalApi';

export { VitalsForm } from './VitalsForm';
export { VitalsTimeline } from './VitalsTimeline';
export { SOAPNoteEditor } from './SOAPNoteEditor';
export { ProblemListPanel } from './ProblemListPanel';
export { VaccinationsList } from './VaccinationsList';
