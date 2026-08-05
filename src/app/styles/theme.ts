import { createTheme } from '@mui/material/styles';

const sharedComponents = {
    MuiButton: {
        styleOverrides: {
            root: {
                borderRadius: '20px',
                textTransform: 'none' as const,
            },
        },
    },
    MuiPaper: {
        defaultProps: {
            elevation: 0,
            variant: 'outlined' as const,
        },
        styleOverrides: {
            root: {
                borderRadius: '12px',
            },
        },
    },
};

const sharedTypography = {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2.5rem', fontWeight: 500 },
    h2: { fontSize: '2rem', fontWeight: 500 },
    body1: { fontSize: '1rem', lineHeight: 1.5 },
};

export const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#D0BCFF',
            light: '#EADDFF',
            dark: '#381E72',
            contrastText: '#381E72',
        },
        secondary: {
            main: '#CCC2DC',
            light: '#E8DEF8',
            dark: '#332D41',
            contrastText: '#332D41',
        },
        background: {
            default: '#0f1117',
            paper: '#1a1d2e',
        },
        text: {
            primary: '#f3f4f6',
            secondary: '#9ca3af',
        },
    },
    typography: sharedTypography,
    components: sharedComponents,
});

export const lightTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#6366f1',
            light: '#818cf8',
            dark: '#4f46e5',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#7c3aed',
            light: '#a78bfa',
            dark: '#5b21b6',
            contrastText: '#ffffff',
        },
        background: {
            default: '#f8fafc',
            paper: '#ffffff',
        },
        text: {
            primary: '#0f172a',
            secondary: '#475569',
        },
    },
    typography: sharedTypography,
    components: sharedComponents,
});

// Keep backward compatibility
export const theme = darkTheme;
