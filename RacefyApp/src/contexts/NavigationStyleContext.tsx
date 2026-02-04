import React, { createContext, useContext, useState, ReactNode } from 'react';

type NavigationStyle = 'legacy' | 'dynamic';

interface NavigationStyleContextType {
  style: NavigationStyle;
  setStyle: (style: NavigationStyle) => void;
}

const NavigationStyleContext = createContext<NavigationStyleContextType>({
  style: 'legacy',
  setStyle: () => {},
});

export function NavigationStyleProvider({ children }: { children: ReactNode }) {
  // Default to 'legacy' - will be updated based on API config
  const [style, setStyle] = useState<NavigationStyle>('legacy');

  return (
    <NavigationStyleContext.Provider value={{ style, setStyle }}>
      {children}
    </NavigationStyleContext.Provider>
  );
}

export function useNavigationStyle() {
  return useContext(NavigationStyleContext);
}
