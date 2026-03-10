import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#D0BCFF', // MD3 Light Purple for Dark Theme
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
            primary: '#E6E1E5',
            secondary: '#CAC4D0',
        }
    },
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h1: { fontSize: '2.5rem', fontWeight: 500 },
        h2: { fontSize: '2rem', fontWeight: 500 },
        body1: { fontSize: '1rem', lineHeight: 1.5 },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: '20px', // Rounder buttons for MD3 feel
                    textTransform: 'none',
                },
            },
        },
        MuiPaper: {
            defaultProps: {
                elevation: 0,
                variant: 'outlined',
            },
            styleOverrides: {
                root: {
                    borderRadius: '12px',
                },
            },
        },
    },
});
