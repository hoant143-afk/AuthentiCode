import { collection, setDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import data from '../../data/authenticode_db.json';

export async function migrateData() {
  console.log('Starting migration to Firestore...');
  const collections = [
    { name: 'users', data: data.users },
    { name: 'tasks', data: data.tasks },
    { name: 'assignments', data: data.assignments },
    { name: 'classes', data: data.classes },
    { name: 'students', data: data.students },
    { name: 'submissions', data: data.submissions },
    { name: 'evaluations', data: data.evaluations },
    { name: 'appeals', data: data.appeals },
    { name: 'auditLogs', data: data.auditLogs }
  ];

  for (const col of collections) {
    console.log(`Migrating ${col.name}...`);
    const colRef = collection(db, col.name);
    
    // Migrate preserving document IDs, without deleting existing collection records
    for (const item of col.data) {
      if (!item.id) {
        console.warn(`Bỏ qua tài liệu không có ID trong ${col.name}`);
        continue;
      }
      await setDoc(doc(db, col.name, item.id), item, { merge: true });
    }
  }
  console.log('Migration completed safely without deleting existing documents.');
}
