import { createContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AppStateContext = createContext();

export function AppStateProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [showLanding, setShowLanding] = useState(false);

  useEffect(() => {
    const init = async () => {
      const done = await AsyncStorage.getItem('questionnaireDone');
      if (done === 'true') {
        setShowLanding(false);  
      } else {
        setShowQuestionnaire(true);  
      }
      setLoading(false);
    };
    init();
  }, []);

  return (
    <AppStateContext.Provider
      value={{
        loading,
        showQuestionnaire,
        setShowQuestionnaire,
        showLanding,
        setShowLanding,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}
