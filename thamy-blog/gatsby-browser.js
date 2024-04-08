import React from 'react';
import { GlobalThemeProvider } from './src/hooks/useGlobalTheme';

import browserHydrateFunction from './src/utilities/gatsby/browser-hydrate-function';

export const replaceHydrateFunction = browserHydrateFunction;

export const wrapRootElement = ({ element }) => (
  <GlobalThemeProvider>{element}</GlobalThemeProvider>
);