import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { translations } from '@/translations';

type Language = 'en' | 'es' | 'fr' | 'de';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { preferences, updatePreferences } = useUserPreferences();
    const [language, setLanguageState] = useState<Language>('en');

    // Sync with user preferences on load
    useEffect(() => {
        if (preferences?.preferred_language) {
            setLanguageState(preferences.preferred_language as Language);
        }
    }, [preferences?.preferred_language]);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        updatePreferences({ preferred_language: lang });
    };

    /**
     * Recursive translation helper
     * Usage: t('settings.appearance.title')
     */
    const t = (key: string): string => {
        const keys = key.split('.');
        let current: any = translations[language];
        let fallback: any = translations['en'];

        for (const k of keys) {
            if (current && current[k] !== undefined) {
                current = current[k];
            } else {
                current = undefined; // Path failed in current language
            }

            if (fallback && fallback[k] !== undefined) {
                fallback = fallback[k];
            } else {
                fallback = undefined; // Path failed in fallback (shouldn't happen if en covers all)
            }
        }

        return (current as string) || (fallback as string) || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
