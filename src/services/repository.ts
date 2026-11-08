import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

// Collection names
const COLLECTIONS = {
  USERS: 'users',
  TASKS: 'tasks',
  ASSIGNMENTS: 'assignments',
  CLASSES: 'classes',
  STUDENTS: 'students',
  SUBMISSIONS: 'submissions',
  EVALUATIONS: 'evaluations',
  APPEALS: 'appeals',
  AUDIT_LOGS: 'auditLogs',
};

// Generic Repository Class
class FirestoreRepository<T> {
  collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  async getAll(): Promise<T[]> {
    try {
      const snapshot = await getDocs(collection(db, this.collectionName));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, this.collectionName);
      return [];
    }
  }

  async getById(id: string): Promise<T | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() } as T;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${this.collectionName}/${id}`);
      return null;
    }
  }

  async create(data: Omit<T, 'id'>, id?: string): Promise<string> {
    try {
      const dataWithTimestamp = { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
      if (id) {
        await setDoc(doc(db, this.collectionName, id), dataWithTimestamp);
        return id;
      } else {
        const docRef = await addDoc(collection(db, this.collectionName), dataWithTimestamp);
        return docRef.id;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, this.collectionName);
      return '';
    }
  }

  async update(id: string, data: Partial<T>): Promise<void> {
    try {
      await updateDoc(doc(db, this.collectionName, id), { ...data, updatedAt: serverTimestamp() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${this.collectionName}/${id}`);
    }
  }
}

// Export specialized repositories
export const UserRepo = new FirestoreRepository<any>(COLLECTIONS.USERS);
export const TaskRepo = new FirestoreRepository<any>(COLLECTIONS.TASKS);
export const AssignmentRepo = new FirestoreRepository<any>(COLLECTIONS.ASSIGNMENTS);
export const SubmissionRepo = new FirestoreRepository<any>(COLLECTIONS.SUBMISSIONS);
export const EvaluationRepo = new FirestoreRepository<any>(COLLECTIONS.EVALUATIONS);
export const AppealRepo = new FirestoreRepository<any>(COLLECTIONS.APPEALS);
export const AuditLogRepo = new FirestoreRepository<any>(COLLECTIONS.AUDIT_LOGS);
