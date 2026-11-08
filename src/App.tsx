import { useState, useEffect } from 'react';
import { WelcomePortal } from './components/portal/WelcomePortal';
import { TeacherPortal } from './components/teacher/TeacherPortal';
import { StudentPortal } from './components/student/StudentPortal';
import { AssessmentTask, Student, ClassGroup } from './types';
import { AUTHENTIC_TASKS } from './data/seedData';
import { api } from './services/api';
import { testFirestoreConnection } from './services/firebase';

export default function App() {
  const [currentView, setCurrentView] = useState<'welcome' | 'teacher' | 'student'>('welcome');
  const [tasks, setTasks] = useState<AssessmentTask[]>(AUTHENTIC_TASKS);

  // Active Teacher State
  const [activeTeacher, setActiveTeacher] = useState<{
    id: string;
    name: string;
    email: string;
    role: string;
  }>({
    id: 'user-bongnguyen',
    name: 'Cô Bống Nguyễn',
    email: 'Bongnguyen446@gmail.com',
    role: 'teacher'
  });

  // Active Student State
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [activeStudentClass, setActiveStudentClass] = useState<ClassGroup | undefined>(undefined);

  // On mount, load tasks from server and validate Firestore connection
  useEffect(() => {
    async function init() {
      // Validate live connection to Firestore
      try {
        await testFirestoreConnection();
      } catch (err) {
        console.warn('Firestore initial check:', err);
      }

      try {
        const fetchedTasks = await api.getTasks();
        if (fetchedTasks && fetchedTasks.length > 0) {
          setTasks(fetchedTasks);
        }
      } catch (err) {
        console.warn('Sử dụng dữ liệu nhiệm vụ cục bộ ban đầu:', err);
      }
    }
    init();
  }, []);

  const handleTeacherLogin = (user: any) => {
    setActiveTeacher({
      id: user.id,
      name: user.name || 'Giáo viên',
      email: user.email,
      role: user.role || 'teacher'
    });
    setCurrentView('teacher');
  };

  const handleStudentLogin = (data: { student: any; classGroup: any; tasks: any[] }) => {
    setActiveStudent(data.student);
    setActiveStudentClass(data.classGroup);
    if (data.tasks && data.tasks.length > 0) {
      setTasks(data.tasks);
    }
    setCurrentView('student');
  };

  return (
    <div className="min-h-screen text-slate-800 antialiased font-sans">
      {currentView === 'welcome' && (
        <WelcomePortal
          onTeacherLogin={handleTeacherLogin}
          onStudentLogin={handleStudentLogin}
        />
      )}

      {currentView === 'teacher' && (
        <TeacherPortal
          currentTeacher={activeTeacher}
          tasks={tasks}
          onExit={() => setCurrentView('welcome')}
        />
      )}

      {currentView === 'student' && activeStudent && (
        <StudentPortal
          student={activeStudent}
          classGroup={activeStudentClass}
          tasks={tasks}
          onExit={() => {
            setActiveStudent(null);
            setCurrentView('welcome');
          }}
        />
      )}
    </div>
  );
}
