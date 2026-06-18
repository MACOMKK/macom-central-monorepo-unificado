import { createContext, useContext, useState } from 'react';

const EmpresaContext = createContext(null);

export function EmpresaProvider({ children }) {
  const [empresa, setEmpresa] = useState('Todas');
  return (
    <EmpresaContext.Provider value={{ empresa, setEmpresa }}>
      {children}
    </EmpresaContext.Provider>
  );
}

export function useEmpresa() {
  return useContext(EmpresaContext);
}