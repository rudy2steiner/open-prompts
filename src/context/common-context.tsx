'use client';
import { createContext, useContext, useState } from 'react';

type CommonContextValue = {
  showLoadingModal: boolean;
  setShowLoadingModal: (v: boolean) => void;
  showGeneratingModal: boolean;
  setShowGeneratingModal: (v: boolean) => void;
};

const CommonContext = createContext<CommonContextValue | null>(null);

export const CommonProvider = ({ children }: { children: React.ReactNode }) => {

  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [showGeneratingModal, setShowGeneratingModal] = useState(false);



  return (
    <CommonContext.Provider
      value={{
        showLoadingModal, setShowLoadingModal,
        showGeneratingModal, setShowGeneratingModal,
      }}
    >
      {children}
    </CommonContext.Provider>
  );

}

export const useCommonContext = (): CommonContextValue => {
  const ctx = useContext(CommonContext);
  if (!ctx) throw new Error('useCommonContext must be used within CommonProvider');
  return ctx;
};
