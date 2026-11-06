'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ResultCheckerPortal } from '@/components/ResultCheckerPortal';
import {
  INITIAL_CLASSES,
  INITIAL_STUDENTS,
  INITIAL_TEACHERS,
} from '@/lib/initialData';
import {
  getStudents,
  getClasses,
  getTeachers,
  syncDataFromCloud,
} from '@/lib/storage';
import { syncCredentialsFromCloud } from '@/lib/auth';

export default function Home() {
  const [classes, setClasses] = useState(INITIAL_CLASSES);
  const [students, setStudents] = useState(INITIAL_STUDENTS);
  const [teachers, setTeachers] = useState(INITIAL_TEACHERS);
  const [isLoaded, setIsLoaded] = useState(false);

  const hydrateData = useCallback(() => {
    try {
      const storedClasses = getClasses();
      if (storedClasses && storedClasses.length > 0) {
        setClasses(storedClasses);
      }
      const storedStudents = getStudents();
      if (storedStudents && storedStudents.length > 0) {
        setStudents(storedStudents);
      }
      const storedTeachers = getTeachers();
      if (storedTeachers && storedTeachers.length > 0) {
        setTeachers(storedTeachers);
      }
    } catch (e) {
      console.warn('Hydration fallback to initial dataset:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    hydrateData();
    // Hydrate cloud backup if available
    syncDataFromCloud().then(() => {
      hydrateData();
    });
    syncCredentialsFromCloud();

    const handleStorageUpdate = () => {
      hydrateData();
    };
    window.addEventListener('storage', handleStorageUpdate);
    return () => window.removeEventListener('storage', handleStorageUpdate);
  }, [hydrateData]);

  return (
    <ResultCheckerPortal
      initialClasses={classes}
      initialStudents={students}
      initialTeachers={teachers}
    />
  );
}
