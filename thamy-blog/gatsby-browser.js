import React from 'react';
import { GlobalThemeProvider } from './src/hooks/useGlobalTheme';

export const wrapRootElement = ({ element }) => (
  <GlobalThemeProvider>{element}</GlobalThemeProvider>
);