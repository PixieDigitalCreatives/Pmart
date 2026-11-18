import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { TbVolume as Volume2, TbVolumeOff as VolumeX, TbLanguage as LanguageIcon } from 'react-icons/tb';
import './LanguageSwitcher.scss';

export const LanguageSwitcher = ({ compact = false }) => {
  const { lang, setLang, voiceEnabled, setVoiceEnabled, speak } = useLanguage();

  const toggleLanguage = () => {
    const next = lang === 'hi' ? 'en' : 'hi';
    setLang(next);
  };

  const toggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    if (next) {
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          const u = new SpeechSynthesisUtterance(lang === 'hi' ? 'आवाज़ चालू है' : 'Voice guidance enabled');
          u.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
          window.speechSynthesis.speak(u);
        }
      }, 50);
    }
  };

  return (
    <div className={`pmart-lang-bar ${compact ? 'is-compact' : ''}`}>
      <button
        type="button"
        className={`lang-btn ${lang === 'hi' ? 'is-active' : ''}`}
        onClick={() => setLang('hi')}
        title="हिंदी भाषा चुनें"
      >
        <LanguageIcon size={16} />
        <span>हिंदी</span>
      </button>

      <button
        type="button"
        className={`lang-btn ${lang === 'en' ? 'is-active' : ''}`}
        onClick={() => setLang('en')}
        title="Switch to English"
      >
        <span>English</span>
      </button>

      <button
        type="button"
        className={`voice-toggle-btn ${voiceEnabled ? 'is-active' : ''}`}
        onClick={toggleVoice}
        title={voiceEnabled ? (lang === 'hi' ? 'आवाज़ बंद करें' : 'Disable voice guidance') : (lang === 'hi' ? 'आवाज़ चालू करें' : 'Enable voice guidance')}
      >
        {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        {!compact && <span>{voiceEnabled ? (lang === 'hi' ? 'आवाज़ चालू' : 'Voice on') : (lang === 'hi' ? 'आवाज़ बंद' : 'Voice off')}</span>}
      </button>
    </div>
  );
};

