import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#6750A4', // MD3 Purple
            light: '#EADDFF',
            dark: '#21005D',
            contrastText: '#FFFFFF',
        },
        secondary: {
            main: '#625B71',
            light: '#E8DEF8',
            dark: '#1D192B',
            contrastText: '#FFFFFF',
        },
        background: {
            default: '#FFFBFE',
            paper: '#FFFFFF',
        },
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
