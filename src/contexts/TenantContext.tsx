import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useStore } from '../store';

interface TenantContextValue {
  tenantId: string;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const user = useStore((state) => state.user);
  const [tenantId, setTenantId] = useState<string>(user?.tenantId ?? '');

  useEffect(() => {
    if (user?.tenantId) {
      setTenantId(user.tenantId);
    }
  }, [user]);

  return (
    <TenantContext.Provider value={{ tenantId }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = (): TenantContextValue => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
};