import * as React from 'react';
import { ThemeProvider } from 'styled-components'

import { COLORS, DARKCOLORS } from '../constants/colors';
import FONTS from '../constants/fonts';

const GlobalThemeContext = React.createContext({
    theme: {},
    selectedTheme: "",
    changeTheme: () => {}
});

const myThemes = {
    "default": { colors: COLORS, fonts: FONTS },
    "dark": { colors: DARKCOLORS, fonts: FONTS }
}

const GlobalThemeProvider = ({children}) => {
    const localTheme = localStorage.getItem("Theme") || "default";
    
    const [selectedTheme, setSelectedTheme] = React.useState(localTheme);

    const [theme, setTheme] = React.useState(myThemes[localTheme]);
    
    const ThemeMemo = React.useMemo(() => ({
        theme: theme,
        selectedTheme,
        changeTheme: (name) => {
            localStorage.setItem("Theme",name);
            setSelectedTheme(name);
            setTheme(myThemes[name]);
        }
    }), [theme,selectedTheme]);

    return (
        <GlobalThemeContext.Provider value={ThemeMemo}>
            <ThemeProvider theme={theme} >
                {children}
            </ThemeProvider>
        </GlobalThemeContext.Provider>
    )
}

const useGlobalTheme = () => {
    const context = React.useContext(GlobalThemeContext);
    return context;
}

export { useGlobalTheme, GlobalThemeProvider };