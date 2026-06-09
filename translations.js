const AVAILABLE_LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'pl', name: 'Polski' },
    { code: 'sv', name: 'Svenska' },
    { code: 'de', name: 'Deutsch' },
    { code: 'fr', name: 'Français' }
];

function getTranslation(translations, key) {
    return key.split('.').reduce((obj, k) => obj && obj[k], translations);
}

function translatePage() {
    const select = document.getElementById('languageSelect');
    const currentLang = select ? select.value : (localStorage.getItem('selectedLanguage') || 'en');
    const translations = window.translations && window.translations[currentLang];

    if (!translations) {
        console.error('No translations found for language:', currentLang);
        return;
    }

    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        const translation = getTranslation(translations, key);
        if (translation) {
            if (key === 'app.recordCount' && element.id === 'record-count') {
                const count = (typeof comicDatabase !== 'undefined' && Array.isArray(comicDatabase))
                    ? comicDatabase.length
                    : (typeof window.comicDatabase !== 'undefined' && Array.isArray(window.comicDatabase))
                        ? window.comicDatabase.length
                        : 0;
                element.textContent = translation.replace('{count}', count);
            } else {
                element.textContent = translation;
            }
        }
    });

    document.querySelectorAll('[data-translate-placeholder]').forEach(element => {
        const key = element.getAttribute('data-translate-placeholder');
        const translation = getTranslation(translations, key);
        if (translation) {
            element.placeholder = translation;
        }
    });

    localStorage.setItem('selectedLanguage', currentLang);
}

async function loadTranslations() {
    const translationPromises = AVAILABLE_LANGUAGES.map(lang =>
        fetch(`translations/${lang.code}.json`).then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load translations for ${lang.code}`);
            }
            return response.json();
        })
    );

    const translationData = await Promise.all(translationPromises);
    const translations = {};
    translationData.forEach((data, index) => {
        translations[AVAILABLE_LANGUAGES[index].code] = data;
    });

    window.translations = translations;
    window.availableLanguages = AVAILABLE_LANGUAGES;
}

async function initializeTranslations() {
    try {
        if (!window.translations) {
            await loadTranslations();
        }

        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            languageSelect.innerHTML = '';
            AVAILABLE_LANGUAGES.forEach(lang => {
                const option = document.createElement('option');
                option.value = lang.code;
                option.textContent = lang.name;
                languageSelect.appendChild(option);
            });

            const savedLang = localStorage.getItem('selectedLanguage') || 'en';
            languageSelect.value = AVAILABLE_LANGUAGES.some(lang => lang.code === savedLang)
                ? savedLang
                : 'en';
        }

        translatePage();
    } catch (error) {
        console.error('Error loading translations:', error);
    }
}

document.addEventListener('DOMContentLoaded', initializeTranslations); 