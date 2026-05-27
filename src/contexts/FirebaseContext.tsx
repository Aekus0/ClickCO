import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  deleteDoc, 
  collection, 
  onSnapshot, 
  Timestamp,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { ConversionResult } from '../types';
import { Language } from '../utils/translations';

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  syncedHistory: ConversionResult[];
  settings: {
    language: Language;
    purgeAfterTimer: boolean;
    purgeAfterDownload: boolean;
  } | null;
  saveSettingsToDb: (lang: Language, timer: boolean, download: boolean) => Promise<void>;
  addConversionToDb: (item: ConversionResult) => Promise<void>;
  deleteConversionFromDb: (id: string) => Promise<void>;
  clearConversionsFromDb: () => Promise<void>;
  isDbConnected: boolean;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncedHistory, setSyncedHistory] = useState<ConversionResult[]>([]);
  const [settings, setSettings] = useState<FirebaseContextType['settings']>(null);
  const [isDbConnected, setIsDbConnected] = useState(true);

  // Validate connection to Firestore initially
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        setIsDbConnected(true);
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.warn("Please check your Firebase configuration or network.");
          setIsDbConnected(false);
        }
      }
    }
    testConnection();
  }, []);

  // Monitor Auth State changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      setLoading(false);
      if (!usr) {
        setSyncedHistory([]);
        setSettings(null);
      }
    });
    return unsubscribe;
  }, []);

  // Sync settings and history from firestore if authenticated
  useEffect(() => {
    if (!user) return;

    const userDocPath = `users/${user.uid}`;
    const userDocRef = doc(db, 'users', user.uid);

    // Subscribe to settings document
    const unsubSettings = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings({
          language: data.language as Language,
          purgeAfterTimer: !!data.purgeAfterTimer,
          purgeAfterDownload: !!data.purgeAfterDownload
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, userDocPath);
    });

    // Subscribe to nested conversions collection
    const conversionsPath = `users/${user.uid}/conversions`;
    const conversionsColRef = collection(db, 'users', user.uid, 'conversions');

    const unsubConversions = onSnapshot(conversionsColRef, (querySnap) => {
      const items: ConversionResult[] = [];
      querySnap.forEach((docSnap) => {
        const data = docSnap.data();
        let jsDate = new Date();
        if (data.timestamp) {
          if (data.timestamp instanceof Timestamp) {
            jsDate = data.timestamp.toDate();
          } else if (data.timestamp.seconds) {
            jsDate = new Date(data.timestamp.seconds * 1000);
          } else {
            jsDate = new Date(data.timestamp);
          }
        }

        items.push({
          id: docSnap.id,
          fileName: data.fileName || '',
          originalSize: Number(data.originalSize || 0),
          convertedSize: Number(data.convertedSize || 0),
          originalFormat: data.originalFormat || '',
          targetFormat: data.targetFormat || '',
          downloadUrl: data.downloadUrl || '',
          timestamp: jsDate,
          status: data.status || 'success',
          error: data.error || undefined
        });
      });

      // Sort conversions by timestamp descending
      items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setSyncedHistory(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, conversionsPath);
    });

    return () => {
      unsubSettings();
      unsubConversions();
    };
  }, [user]);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Google Sign-Out Error:', error);
    }
  };

  const saveSettingsToDb = async (lang: Language, timer: boolean, download: boolean) => {
    if (!user) return;
    const path = `users/${user.uid}`;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        language: lang,
        purgeAfterTimer: timer,
        purgeAfterDownload: download,
        updatedAt: Timestamp.now()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const addConversionToDb = async (item: ConversionResult) => {
    if (!user) return;
    const path = `users/${user.uid}/conversions/${item.id}`;
    try {
      const payload: Record<string, any> = {
        userId: user.uid,
        fileName: item.fileName,
        originalSize: item.originalSize,
        convertedSize: item.convertedSize,
        originalFormat: item.originalFormat,
        targetFormat: item.targetFormat,
        downloadUrl: item.downloadUrl,
        timestamp: Timestamp.fromDate(item.timestamp),
        status: item.status
      };
      if (item.error) {
        payload.error = item.error;
      }
      await setDoc(doc(db, 'users', user.uid, 'conversions', item.id), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const deleteConversionFromDb = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/conversions/${id}`;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'conversions', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const clearConversionsFromDb = async () => {
    if (!user) return;
    // Batch deletes sequentially or collectively since client collections don't support simple truncate
    try {
      const promises = syncedHistory.map(item => 
        deleteDoc(doc(db, 'users', user.uid, 'conversions', item.id))
      );
      await Promise.all(promises);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/conversions/*`);
    }
  };

  return (
    <FirebaseContext.Provider value={{
      user,
      loading,
      signIn,
      signOut,
      syncedHistory,
      settings,
      saveSettingsToDb,
      addConversionToDb,
      deleteConversionFromDb,
      clearConversionsFromDb,
      isDbConnected
    }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}
