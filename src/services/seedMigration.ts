import { setDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { AUTHENTIC_TASKS, INITIAL_CLASSES, INITIAL_STUDENTS, INITIAL_ASSIGNMENTS } from '../data/seedData';

async function seedMigration() {
  console.log('Starting seed data migration to Firestore...');
  
  const seedCollections = [
    { name: 'tasks', data: AUTHENTIC_TASKS },
    { name: 'classes', data: INITIAL_CLASSES },
    { name: 'students', data: INITIAL_STUDENTS },
    { name: 'assignments', data: INITIAL_ASSIGNMENTS }
  ];

  for (const col of seedCollections) {
    console.log(`Migrating ${col.name}...`);
    for (const item of col.data) {
      if (!item.id) {
        console.warn(`Skipping item without ID in ${col.name}`, item);
        continue;
      }
      await setDoc(doc(db, col.name, item.id), item);
    }
  }
  console.log('Seed data migration completed.');
}

seedMigration().catch(console.error);
