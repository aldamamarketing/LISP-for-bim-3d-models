import React, { useState } from 'react';
import { auth, loginWithGoogle } from '../../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useTranslation } from '../../i18n/useTranslation';

export default function AuthLogin() {
  const { t } = useTranslation();
  const [emailStr, setEmailStr] = useState('');
  const [passwordStr, setPasswordStr] = useState('');
  const [passwordConfirmStr, setPasswordConfirmStr] = useState('');
  const [authError, setAuthError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try { 
      await signInWithEmailAndPassword(auth, emailStr, passwordStr); 
      if (window.location.pathname.includes('/login')) {
        window.location.href = '/dashboard';
      }
    } catch (err) { 
      setAuthError('Erro: ' + err.message); 
    }
  };

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (passwordStr !== passwordConfirmStr) return setAuthError('As senhas não coincidem.');
    try { 
      await createUserWithEmailAndPassword(auth, emailStr, passwordStr); 
      if (window.location.pathname.includes('/login')) {
        window.location.href = '/dashboard';
      }
    } catch (err) { 
      setAuthError('Erro: ' + err.message); 
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#141414] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden relative">
        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="font-headline-lg text-headline-lg text-white mb-2">
              {isRegistering ? t('auth.createAccount') : t('auth.welcomeBack')}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {isRegistering ? t('auth.joinBeta') : t('auth.manageRoutines')}
            </p>
          </div>
          
          <form className="space-y-4" onSubmit={isRegistering ? handleEmailSignup : handleEmailLogin}>
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">{t('auth.corporateEmail')}</label>
              <input 
                type="email" 
                value={emailStr} 
                onChange={(e) => setEmailStr(e.target.value)} 
                className="w-full bg-[#0D0D0D] border border-[#262626] text-white font-body-md px-4 py-3 rounded-lg focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
                placeholder="seu@email.com"
                required
              />
            </div>
            
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">{t('auth.password')}</label>
              <input 
                type="password" 
                value={passwordStr} 
                onChange={(e) => setPasswordStr(e.target.value)} 
                className="w-full bg-[#0D0D0D] border border-[#262626] text-white font-body-md px-4 py-3 rounded-lg focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {isRegistering && (
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1">{t('auth.confirmPassword')}</label>
                <input 
                  type="password" 
                  value={passwordConfirmStr} 
                  onChange={(e) => setPasswordConfirmStr(e.target.value)} 
                  className="w-full bg-[#0D0D0D] border border-[#262626] text-white font-body-md px-4 py-3 rounded-lg focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            )}

            {authError && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 font-code-sm text-code-sm">
                {authError}
              </div>
            )}
            
            <button 
              type="submit" 
              className="w-full bg-primary-container text-white font-label-md text-label-md font-bold px-8 py-3.5 rounded-lg hover:bg-[#e66000] transition-colors shadow-[0_0_15px_rgba(255,107,0,0.2)] mt-6"
            >
              {isRegistering ? t('auth.createAccount') : t('auth.signIn')}
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center space-x-4">
            <div className="flex-1 h-px bg-[#262626]"></div>
            <span className="font-code-sm text-code-sm text-on-surface-variant">{t('auth.or')}</span>
            <div className="flex-1 h-px bg-[#262626]"></div>
          </div>

          <button 
            type="button"
            onClick={loginWithGoogle} 
            className="w-full mt-6 bg-white text-black font-label-md text-label-md font-bold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-3"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            {t('auth.continueGoogle')}
          </button>
        </div>
        
        <div className="bg-[#0D0D0D] border-t border-[#262626] p-6 text-center">
          <span className="font-body-md text-body-md text-on-surface-variant">
            {isRegistering ? t('auth.haveAccount') + ' ' : t('auth.noAccount') + ' '}
          </span>
          <button 
            type="button"
            onClick={(e) => { e.preventDefault(); setIsRegistering(!isRegistering); setAuthError(''); }}
            className="font-label-md text-label-md font-bold text-primary-container hover:text-white transition-colors ml-2"
          >
            {isRegistering ? t('auth.doLogin') : t('auth.createFree')}
          </button>
        </div>
      </div>
      
      <a href="/" className="mt-8 font-label-md text-label-md text-on-surface-variant hover:text-white transition-colors flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        {t('auth.backToSite')}
      </a>
    </div>
  );
}
