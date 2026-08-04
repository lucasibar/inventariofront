import { useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { Provider as ReduxProvider } from 'react-redux';
import { darkTheme, lightTheme } from './styles/theme';
import { store } from './store';
import type { ReactNode } from 'react';

interface AppProviderProps {
    children: ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
    const [themeMode, setThemeMode] = useState<'dark' | 'light'>(
        () => (localStorage.getItem('app-theme') as 'dark' | 'light') || 'dark'
    );

    useEffect(() => {
        const observer = new MutationObserver(() => {
            const current = document.documentElement.getAttribute('data-theme');
            if (current === 'light' || current === 'dark') {
                setThemeMode(current);
            }
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    const muiTheme = themeMode === 'light' ? lightTheme : darkTheme;

    return (
        <ReduxProvider store={store}>
            <ThemeProvider theme={muiTheme}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </ReduxProvider>
    );
};
