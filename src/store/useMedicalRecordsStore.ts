import { create } from 'zustand';

const generateId = () => Math.random().toString(36).substring(2, 11);

export type RecordType =
  | 'visit'
  | 'lab'
  | 'imaging'
  | 'prescription'
  | 'vaccination'
  | 'allergy'
  | 'surgery'
  | 'dental'
  | 'vision';

export interface MedicalRecord {
  id: string;
  memberId: string;
  memberName: string;
  type: RecordType;
  title: string;
  date: string; // ISO
  provider: string; // doctor/clinic name
  notes: string;
  results: string; // lab results, findings
  followUpDate?: string;
  attachmentCount: number; // simulated
  isCritical: boolean; // allergies, major diagnoses
  createdAt: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  address: string;
  memberId: string; // which member they're the doctor for
}

interface MedicalRecordsState {
  records: MedicalRecord[];
  doctors: Doctor[];
  addRecord: (record: Omit<MedicalRecord, 'id' | 'createdAt'>) => void;
  removeRecord: (id: string) => void;
  addDoctor: (doctor: Omit<Doctor, 'id'>) => void;
  removeDoctor: (id: string) => void;
  getRecordsForMember: (memberId: string) => MedicalRecord[];
  getCriticalRecords: () => MedicalRecord[];
}

const _now = new Date().toISOString();

const seedRecords: MedicalRecord[] = [
  {
    id: 'mr1',
    memberId: 'member-2',
    memberName: 'Mom',
    type: 'vaccination',
    title: 'Flu Shot 2024',
    date: '2024-10-15',
    provider: 'CVS Pharmacy',
    notes: 'Annual flu vaccination',
    results: 'Administered successfully',
    attachmentCount: 0,
    isCritical: false,
    createdAt: _now,
  },
  {
    id: 'mr2',
    memberId: 'member-2',
    memberName: 'Mom',
    type: 'allergy',
    title: 'Penicillin Allergy',
    date: '2018-03-22',
    provider: 'Dr. Sarah Chen',
    notes: 'Severe allergic reaction documented',
    results: 'Anaphylactic reaction confirmed. Avoid all penicillin-class antibiotics.',
    attachmentCount: 2,
    isCritical: true,
    createdAt: _now,
  },
  {
    id: 'mr3',
    memberId: 'member-1',
    memberName: 'Dad',
    type: 'dental',
    title: 'Annual Dental Cleaning',
    date: '2025-06-10',
    provider: 'Bright Smile Dental',
    notes: 'Routine cleaning and checkup',
    results: 'No cavities. Minor tartar buildup on lower molars.',
    followUpDate: '2026-01-10',
    attachmentCount: 1,
    isCritical: false,
    createdAt: _now,
  },
  {
    id: 'mr4',
    memberId: 'member-1',
    memberName: 'Dad',
    type: 'lab',
    title: 'Annual Blood Panel',
    date: '2025-05-20',
    provider: 'LabCorp',
    notes: 'Comprehensive metabolic panel + lipid panel',
    results: 'Cholesterol: 185 mg/dL (normal). Glucose: 92 mg/dL (normal). A1C: 5.2% (normal).',
    attachmentCount: 3,
    isCritical: false,
    createdAt: _now,
  },
  {
    id: 'mr5',
    memberId: 'member-3',
    memberName: 'Emma',
    type: 'vaccination',
    title: 'HPV Vaccine - Dose 1',
    date: '2025-04-05',
    provider: 'Pediatric Associates',
    notes: 'First dose of HPV series',
    results: 'Administered. Schedule dose 2 in 6-12 months.',
    followUpDate: '2026-04-05',
    attachmentCount: 0,
    isCritical: false,
    createdAt: _now,
  },
  {
    id: 'mr6',
    memberId: 'member-3',
    memberName: 'Emma',
    type: 'allergy',
    title: 'Peanut Allergy',
    date: '2015-08-12',
    provider: 'Allergy & Asthma Center',
    notes: 'Confirmed via skin prick test',
    results: 'Moderate peanut allergy. Carry EpiPen at all times.',
    attachmentCount: 2,
    isCritical: true,
    createdAt: _now,
  },
];

const seedDoctors: Doctor[] = [
  {
    id: 'doc1',
    name: 'Dr. Sarah Chen',
    specialty: 'Family Medicine',
    phone: '(555) 234-5678',
    address: '123 Medical Plaza, Suite 200, Springfield, IL 62701',
    memberId: 'member-1',
  },
  {
    id: 'doc2',
    name: 'Dr. James Patel',
    specialty: 'Pediatrics',
    phone: '(555) 345-6789',
    address: '456 Children\'s Way, Springfield, IL 62702',
    memberId: 'member-3',
  },
  {
    id: 'doc3',
    name: 'Dr. Linda Morrison',
    specialty: 'OB/GYN',
    phone: '(555) 456-7890',
    address: '789 Women\'s Health Blvd, Springfield, IL 62703',
    memberId: 'member-2',
  },
];

export const useMedicalRecordsStore = create<MedicalRecordsState>()((set, get) => ({
  records: seedRecords,
  doctors: seedDoctors,

  addRecord: (record) =>
    set((s) => ({
      records: [{ ...record, id: generateId(), createdAt: new Date().toISOString() }, ...s.records],
    })),

  removeRecord: (id) =>
    set((s) => ({ records: s.records.filter((r) => r.id !== id) })),

  addDoctor: (doctor) =>
    set((s) => ({
      doctors: [{ ...doctor, id: generateId() }, ...s.doctors],
    })),

  removeDoctor: (id) =>
    set((s) => ({ doctors: s.doctors.filter((d) => d.id !== id) })),

  getRecordsForMember: (memberId) =>
    get().records.filter((r) => r.memberId === memberId),

  getCriticalRecords: () =>
    get().records.filter((r) => r.isCritical),
}));
