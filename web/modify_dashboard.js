const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/Dashboard.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add useTranslation import
if (!content.includes('useTranslation')) {
    content = content.replace(
        "import FavoritesManager from './FavoritesManager';",
        "import FavoritesManager from './FavoritesManager';\nimport { useTranslation } from '../i18n/useTranslation';"
    );
}

// 2. Add t() hook
if (!content.includes('const t = useTranslation();')) {
    content = content.replace(
        "export default function Dashboard({ mode = 'dashboard' }) {",
        "export default function Dashboard({ mode = 'dashboard' }) {\n  const t = useTranslation();"
    );
}

// 3. Replace Loading State (Line 354 approx)
content = content.replace(
    /if \(loading\) return <div style=\{\{ color: 'var\(--text-muted\)' \}\}>Carregando dados...<\/div>;/g,
    `if (loading) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-container border-t-transparent rounded-full animate-spin mb-4"></div>
      <span className="text-on-surface-variant text-sm">{t('common.loading')}</span>
    </div>
  );`
);

// 4. Tab Profile (Lines 566-593)
content = content.replace(
    /<div className="card" style=\{\{ padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' \}\}>/g,
    `<div className="bg-surface-container border border-surface-variant rounded-xl p-5 flex justify-between items-center flex-wrap gap-3 mb-5">`
);

content = content.replace(
    /style=\{\{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var\(--tmd-orange\)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' \}\}/g,
    `className="w-10 h-10 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-lg"`
);

content = content.replace(
    /className="btn" onClick=\{\(\) => setIsEditingProfile\(true\)\}/g,
    `className="bg-primary-container text-white font-bold text-sm px-4 py-2 rounded-lg hover:bg-[#e66000] transition-colors" onClick={() => setIsEditingProfile(true)}`
);

content = content.replace(
    /className="btn" type="submit"/g,
    `className="bg-primary-container text-white font-bold text-sm px-4 py-2 rounded-lg hover:bg-[#e66000] transition-colors" type="submit"`
);

content = content.replace(
    /className="btn-secondary" type="button"/g,
    `className="bg-transparent border border-surface-variant text-on-surface-variant hover:text-white text-sm px-4 py-2 rounded-lg transition-colors ml-2" type="button"`
);

content = content.replace(
    /style=\{\{ padding: '8px', background: 'var\(--bg-darker\)', border: '1px solid var\(--border-color\)', color: '#fff', borderRadius: '4px', width: '100%' \}\}/g,
    `className="w-full bg-[#0D0D0D] border border-surface-variant text-white rounded-lg px-3 py-2 focus:outline-none focus:border-primary-container transition-colors"`
);


// 5. Tab Licenses
content = content.replace(
    /<div className="card" style=\{\{ margin: 0, borderTop: '3px solid var\(--tmd-orange\)' \}\}>/g,
    `<div className="bg-surface-container border border-surface-variant rounded-xl p-6 border-t-[3px] border-t-primary-container">`
);

content = content.replace(
    /<div style=\{\{ background: 'var\(--bg-darker\)', padding: '15px', borderRadius: '6px', marginBottom: '15px' \}\}>/g,
    `<div className="bg-[#0D0D0D] rounded-lg p-4 mb-4 space-y-3">`
);

content = content.replace(
    /<span style=\{\{ color: 'var\(--tmd-orange\)', fontWeight: 'bold' \}\}>/g,
    `<span className="text-primary-container font-bold">`
);

content = content.replace(
    /style=\{\{ padding: '8px', background: 'var\(--bg-darker\)', border: '1px solid var\(--border-color\)', color: '#fff', borderRadius: '4px', width: '100px', marginLeft: '10px' \}\}/g,
    `className="bg-[#0D0D0D] border border-surface-variant text-white rounded-lg px-3 py-2 w-24 focus:outline-none focus:border-primary-container transition-colors ml-2"`
);

content = content.replace(
    /style=\{\{ marginTop: '10px', fontSize: '0.85rem', color: '#ffeb3b', background: 'rgba\(255, 235, 59, 0.1\)', padding: '10px', borderRadius: '4px' \}\}/g,
    `className="mt-3 text-sm bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-yellow-400"`
);

content = content.replace(
    /style=\{\{ display: 'flex', gap: '10px' \}\}/g,
    `className="flex gap-3"`
);

content = content.replace(
    /style=\{\{ flex: 1, padding: '10px', background: 'var\(--bg-darker\)', border: '1px solid var\(--border-color\)', color: 'var\(--tmd-orange\)', borderRadius: '4px', fontFamily: 'monospace' \}\}/g,
    `className="flex-1 bg-[#0D0D0D] border border-surface-variant text-primary-container font-mono px-3 py-2 rounded-lg"`
);

// 6. Tab Notifications
content = content.replace(
    /style=\{\{ background: 'var\(--panel-bg\)', border: '1px solid var\(--panel-border\)', borderRadius: '8px', padding: '20px' \}\}/g,
    `className="bg-surface-container border border-surface-variant rounded-xl p-6"`
);

content = content.replace(
    /style=\{\{ padding: '15px', background: n\.read \? 'var\(--bg-color\)' : 'var\(--bg-color\)', borderLeft: n\.read \? 'none' : '4px solid var\(--tmd-orange\)', borderRadius: '6px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' \}\}/g,
    `className={\`p-4 rounded-lg mb-3 flex justify-between items-center \${n.read ? 'bg-[#0D0D0D]' : 'bg-[#0D0D0D] border-l-4 border-l-primary-container'}\`}`
);

// 7. Grid Pattern Main View
content = content.replace(
    /style=\{\{ flex: 1, padding: '30px', overflowY: 'auto', backgroundImage: 'radial-gradient\(rgba\(255, 255, 255, 0.05\) 1px, transparent 1px\)', backgroundSize: '30px 30px' \}\}/g,
    `className="flex-1 p-8 overflow-y-auto bg-grid-pattern"`
);

// 8. Support Modal
content = content.replace(
    /style=\{\{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba\(0,0,0,0.7\)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 \}\}/g,
    `className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000] backdrop-blur-sm"`
);

content = content.replace(
    /style=\{\{ background: 'var\(--panel-bg\)', border: '1px solid var\(--panel-border\)', borderRadius: '12px', padding: '25px', width: '400px', maxWidth: '90%' \}\}/g,
    `className="bg-surface-container border border-surface-variant rounded-2xl p-6 w-[400px] max-w-[90%] shadow-elevation-3"`
);

content = content.replace(
    /style=\{\{ width: '100%', padding: '10px', background: 'var\(--bg-color\)', border: '1px solid var\(--border-color\)', color: '#fff', borderRadius: '4px', marginBottom: '15px' \}\}/g,
    `className="w-full bg-[#0D0D0D] border border-surface-variant text-white rounded-lg px-3 py-3 focus:outline-none focus:border-primary-container mb-4"`
);

// 9. FAQ Section
content = content.replace(
    /style=\{\{ width: '100%', textAlign: 'left', padding: '15px', background: 'var\(--panel-bg\)', border: '1px solid var\(--panel-border\)', borderRadius: '6px', color: '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' \}\}/g,
    `className="w-full text-left p-4 bg-surface-container border-none text-white rounded-lg cursor-pointer flex justify-between items-center hover:bg-surface-container-high transition-colors"`
);
content = content.replace(
    /style=\{\{ padding: '15px', background: 'var\(--bg-color\)', marginTop: '-5px', border: '1px solid var\(--panel-border\)', borderTop: 'none', borderBottomLeftRadius: '6px', borderBottomRightRadius: '6px', color: 'var\(--text-muted\)', fontSize: '0.9rem' \}\}/g,
    `className="p-4 bg-[#0D0D0D] text-on-surface-variant text-sm border border-t-0 border-surface-variant rounded-b-lg"`
);


// 10. Auth View Texts
content = content.replace(/'Criar Conta'/g, "t('auth.createAccount')");
content = content.replace(/'Bem-vindo de volta'/g, "t('auth.welcomeBack')");
content = content.replace(/'Junte-se à plataforma LispCentral Beta.'/g, "t('auth.joinBeta')");
content = content.replace(/'Entre para gerenciar suas rotinas LISP.'/g, "t('auth.manageRoutines')");
content = content.replace(/>E-mail Corporativo</g, ">{t('auth.corporateEmail')}<");
content = content.replace(/>Senha</g, ">{t('auth.password')}<");
content = content.replace(/>Confirmar Senha</g, ">{t('auth.confirmPassword')}<");
content = content.replace(/>ou</g, ">{t('auth.or')}<");
content = content.replace(/>Continuar com Google</g, ">{t('auth.continueGoogle')}<");
content = content.replace(/>Já tem uma conta\? </g, ">{t('auth.haveAccount')} <");
content = content.replace(/>Não tem uma conta\? </g, ">{t('auth.noAccount')} <");
content = content.replace(/>Fazer Login</g, ">{t('auth.doLogin')}<");
content = content.replace(/>Criar Conta Gratuita</g, ">{t('auth.createFree')}<");
content = content.replace(/'Entrar no Painel'/g, "t('auth.signIn')");
content = content.replace(/>Voltar ao site</g, ">{t('auth.backToSite')}<");

// 11. Dashboard Sidebar Texts
content = content.replace(/>Gestor de LISPs</g, ">{t('dashboard.sidebar.manager')}<");
content = content.replace(/>Minha Coleção</g, ">{t('dashboard.sidebar.collection')}<");
content = content.replace(/>Meu Perfil</g, ">{t('dashboard.sidebar.profile')}<");
content = content.replace(/>Assinaturas e Licenças</g, ">{t('dashboard.sidebar.licenses')}<");
content = content.replace(/>Notificações</g, ">{t('dashboard.sidebar.notifications')}<");
content = content.replace(/>Reportar Bug</g, ">{t('dashboard.sidebar.reportBug')}<");
content = content.replace(/>Sair</g, ">{t('dashboard.sidebar.logout')}<");
content = content.replace(/>Principal</g, ">{t('dashboard.sidebar.sectionMain')}<");
content = content.replace(/>Conta & Config</g, ">{t('dashboard.sidebar.sectionAccount')}<");
content = content.replace(/>Ajuda</g, ">{t('dashboard.sidebar.sectionHelp')}<");

// 12. Breadcrumbs & Profile
content = content.replace(/>Painel do Cliente</g, ">{t('dashboard.breadcrumb.panel')}<");
content = content.replace(/>Editar Perfil</g, ">{t('dashboard.profile.editProfile')}<");
content = content.replace(/>Salvar</g, ">{t('dashboard.profile.save')}<");
content = content.replace(/>Cancelar</g, ">{t('dashboard.profile.cancel')}<");

// 13. Licenses
content = content.replace(/>Assinatura & Licenças</g, ">{t('dashboard.licenses.title')}<");
content = content.replace(/>Gerencie os equipamentos vinculados e seu plano de faturamento.</g, ">{t('dashboard.licenses.desc')}<");
content = content.replace(/>Plano Atual:</g, ">{t('dashboard.licenses.currentPlan')}<");
content = content.replace(/>Beta Tester \(Ilimitado\)</g, ">{t('dashboard.licenses.betaTester')}<");
content = content.replace(/>Preço Base:</g, ">{t('dashboard.licenses.basePrice')}<");
content = content.replace(/>Assentos Necessários:</g, ">{t('dashboard.licenses.seatsNeeded')}<");
content = content.replace(/>Atualizar Plano via Stripe</g, ">{t('dashboard.licenses.updatePlan')}<");
content = content.replace(/>⚠️ O plano deve ser atualizado via Stripe para liberar mais vagas.</g, ">{t('dashboard.licenses.stripeWarning')}<");
content = content.replace(/>Sua Chave de Acesso \(Loader\)</g, ">{t('dashboard.licenses.accessKey')}<");
content = content.replace(/>Baixar</g, ">{t('dashboard.licenses.download')}<");

// 14. Equipment
content = content.replace(/>Equipamentos Vinculados</g, ">{t('dashboard.equipment.title')}<");
content = content.replace(/>PCs que estão rodando seus LISPs atualmente.</g, ">{t('dashboard.equipment.desc')}<");
content = content.replace(/>Desvincular</g, ">{t('dashboard.equipment.unlink')}<");
content = content.replace(/placeholder="Notas \(ex: PC Eng\. Marcos\)"/g, "placeholder={t('dashboard.equipment.placeholder')}");
content = content.replace(/>Nenhum equipamento conectado no momento\. Rode o Loader no AutoCAD.</g, ">{t('dashboard.equipment.empty')}<");
content = content.replace(/>💻</g, "><span className=\"material-symbols-outlined text-[18px] text-green-400\">computer</span><");

// 15. LISP Manager
content = content.replace(/>LISPs do Workspace</g, ">{t('dashboard.lisp.workspace')}<");
content = content.replace(/>\+ Adicionar LISPs</g, ">{t('dashboard.lisp.addLisps')}<");
content = content.replace(/>Gerencie as rotinas na nuvem. Você pode editar ícones, nomes e grupos clicando na linha correspondente.</g, ">{t('dashboard.lisp.desc')}<");
content = content.replace(/>Aguardando Upload</g, ">{t('dashboard.lisp.awaitingUpload')}<");
content = content.replace(/> rotinas prontas para subir.</g, "> {t('dashboard.lisp.readyForUpload')}<");
content = content.replace(/>Confirmar Upload</g, ">{t('dashboard.lisp.confirmUpload')}<");
content = content.replace(/>Enviando ao servidor...</g, ">{t('dashboard.lisp.uploading')}<");

// 16. Notifications
content = content.replace(/>Notificações do Sistema</g, ">{t('dashboard.notifications.title')}<");
content = content.replace(/>Nenhuma notificação no momento.</g, ">{t('dashboard.notifications.empty')}<");
content = content.replace(/>✔ Marcar como Lido</g, ">{t('dashboard.notifications.markRead')}<");

// 17. FAQ
content = content.replace(/>Central de Ajuda \/ FAQ</g, ">{t('dashboard.faq.title')}<");
content = content.replace(/>Encontre respostas rápidas para os problemas mais comuns.</g, ">{t('dashboard.faq.desc')}<");

// 18. Support Modal
content = content.replace(/>Reportar Bug \/ Enviar Feedback</g, ">{t('dashboard.support.title')}<");
content = content.replace(/>🐛 Reportar um Bug</g, ">{t('dashboard.support.bug')}<");
content = content.replace(/>✨ Sugerir Melhoria</g, ">{t('dashboard.support.feature')}<");
content = content.replace(/>❓ Preciso de Ajuda Técnica</g, ">{t('dashboard.support.help')}<");
content = content.replace(/placeholder="Descreva seu problema ou sugestão em detalhes..."/g, "placeholder={t('dashboard.support.placeholder')}");
content = content.replace(/>Enviar Mensagem</g, ">{t('dashboard.support.send')}<");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Modifications applied successfully');
