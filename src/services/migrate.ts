import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
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
    
    // Clear existing to avoid duplicates in this simple migration
    const snapshot = await getDocs(colRef);
    for (const d of snapshot.docs) {
      await deleteDoc(doc(db, col.name, d.id));
    }

    // Add new
    for (const item of col.data) {
      await addDoc(colRef, item);
    }
  }
  console.log('Migration completed.');
}
