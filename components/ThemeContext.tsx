import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Cookie helper functions
const setCookie = (name: string, value: string, days: number) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
};

const getCookie = (name: string): string | null => {
    const nameEQ = `${name}=`;
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.indexOf(nameEQ) === 0) {
            return cookie.substring(nameEQ.length);
        }
    }
    return null;
};

interface ThemeProviderProps {
    children: ReactNode;
}

// Get initial theme from cookie (runs before component mount)
const getInitialTheme = (): Theme => {
    if (typeof document === 'undefined') return 'light';
    const savedTheme = getCookie('uml-studio-theme') ?? getCookie('uml-generator-theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme;
    }
    return 'light';
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    // Initialize state directly from cookie using a getter function
    const [theme, setTheme] = useState<Theme>(getInitialTheme);

    // Save theme to cookie and update document class whenever theme changes
    useEffect(() => {
        setCookie('uml-studio-theme', theme, 365); // Save for 1 year

        // Update document root class for Tailwind dark mode
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
