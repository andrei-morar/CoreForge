export type Language = 'ro' | 'en';

export const translations = {
  ro: {
    // Navigation tabs
    nav_system: 'Local AI & Hardware',
    nav_command: 'Comandă Agenți',
    nav_chat: 'Chat Direct',
    nav_ide: 'Editor Cod',
    nav_analytics: 'Analitice Tokeni',
    nav_agents: 'Agent Hub',
    nav_telemetry: 'Telemetrie Live',
    nav_memory: 'Arhivă Memorie',
    nav_settings: 'Setări & Update',

    // Status bar
    status_offline: '100% Local (Offline)',
    status_ollama: 'Ollama Pregătit',
    status_nominal: 'Sistem Nominal',
    status_cpu: 'CPU',
    status_ram: 'RAM',

    // Hardware Hub
    hw_title: 'Local AI Engine & Hardware Diagnostics',
    hw_subtitle: 'Rulează 100% offline pe laptopul tău. Fără costuri, fără cloud și fără chei API.',
    hw_rescan: 'Re-scan Hardware',
    hw_dedicated_gpu: 'Dedicated GPU',
    hw_vram_avail: 'VRAM Utilizabil',
    hw_sys_ram: 'System Memory',
    hw_ram_avail: 'RAM Disponibil',
    hw_cpu: 'Processor & Engine',
    hw_cores: 'Nuclee CPU',
    hw_cpu_desc: 'Suport nativ pentru execuție multi-thread și accelerare hardware NVIDIA GPU passthrough.',
    hw_manager_title: 'Configurare Team Manager: Mod 100% Local vs Cloud',
    hw_manager_desc: 'Alege dacă dorești ca Team Manager-ul (creierul de planificare CrewAI) să ruleze complet pe laptopul tău sau prin Google Gemini.',
    hw_mode_local: '100% Local (Fără Costuri)',
    hw_mode_cloud: 'Cloud (Gemini API)',

    // Code Editor
    editor_save: 'Salvează (Ctrl+S)',
    editor_saved: 'Salvat',
    editor_saving: 'Se salvează...',
    editor_export_zip: 'Export .ZIP',
    editor_open_vscode: 'VS Code',
    editor_autofix: 'Auto-Fix & Heal',
    editor_run_sandbox: 'Rulează Sandbox',
    editor_live_preview: 'Live Preview',
    editor_code_mode: 'Mod Cod',

    // Agent Hub
    agent_hub_title: 'Agent Customization Hub',
    agent_hub_subtitle: 'Configurează echipa autonomă de agenți și abilitățile active',
    agent_templates_btn: 'Șabloane Echipe (1-Click)',
    agent_new_btn: 'Agent Nou',
    agent_tab_squad: 'Echipa Activă',
    agent_tab_skills: 'Skills & Tools Marketplace',
    agent_apply_btn: 'Aplică Echipa (1-Click)',
    agent_active: 'Activ',
    agent_inactive: 'Inactiv',

    // Settings
    settings_title: 'Setări Globale & Actualizări',
    settings_subtitle: 'Configurează mediul de rulare, modelele locale și actualizările aplicației',
    settings_sub_update: 'Actualizare Software',
    settings_sub_general: 'General & Rețea',
    settings_sub_models: 'Modele AI',
    settings_sub_ai: 'Inteligență AI & Modele',
    settings_sub_sandbox: 'Sandbox & Securitate',
    settings_sub_mobile: 'Conectare iPhone & iPad',
    mobile_card_title: 'Conectare iPhone & iPad Companion',
    mobile_card_subtitle: 'Scanează codul QR cu Safari pe iPhone/iPad pentru a folosi CoreForge ca aplicație nativă pe Wi-Fi',
    mobile_qr_label: 'Scanează cu Camera foto',
    mobile_lan_url: 'Adresă Rețea Directă',
    mobile_copy_url: 'Copiază Adresa',
    mobile_copied: 'Copiat!',
    mobile_pwa_badge: 'Mod Standalone iOS PWA Activ',
    mobile_step1: 'Conectează iPhone/iPad la aceeași rețea Wi-Fi cu calculatorul.',
    mobile_step2: 'Scanează codul QR cu Camera foto sau deschide link-ul direct în Safari.',
    mobile_step3: 'Apasă butonul de Partajare (Share - pătrat cu săgeată sus din Safari).',
    mobile_step4: 'Alege "Adaugă la ecranul principal" (Add to Home Screen) pentru experiență nativă completă.',
    settings_lang_label: 'Limba Interfeței (Language)',

    // Actions & Feedback
    action_delete: 'Șterge',
    action_cancel: 'Anulează',
    action_confirm: 'Confirmă',
    action_download: 'Descarcă',
    action_install: 'Instalează'
  },
  en: {
    // Navigation tabs
    nav_system: 'Local AI & Hardware',
    nav_command: 'Agent Command',
    nav_chat: 'Direct Chat',
    nav_ide: 'Code Editor',
    nav_analytics: 'Token Analytics',
    nav_agents: 'Agent Hub',
    nav_telemetry: 'Live Telemetry',
    nav_memory: 'Memory Archive',
    nav_settings: 'Settings & Updates',

    // Status bar
    status_offline: '100% Local (Offline)',
    status_ollama: 'Ollama Ready',
    status_nominal: 'System Nominal',
    status_cpu: 'CPU',
    status_ram: 'RAM',

    // Hardware Hub
    hw_title: 'Local AI Engine & Hardware Diagnostics',
    hw_subtitle: 'Runs 100% offline on your device. Zero cloud costs, zero API keys required.',
    hw_rescan: 'Re-scan Hardware',
    hw_dedicated_gpu: 'Dedicated GPU',
    hw_vram_avail: 'Available VRAM',
    hw_sys_ram: 'System Memory',
    hw_ram_avail: 'Available RAM',
    hw_cpu: 'Processor & Engine',
    hw_cores: 'CPU Cores',
    hw_cpu_desc: 'Native support for multi-threaded execution and NVIDIA GPU hardware passthrough.',
    hw_manager_title: 'Team Manager Configuration: 100% Local vs Cloud Mode',
    hw_manager_desc: 'Choose whether the CrewAI planning manager executes locally on your hardware or via Google Gemini.',
    hw_mode_local: '100% Local (Zero Cost)',
    hw_mode_cloud: 'Cloud (Gemini API)',

    // Code Editor
    editor_save: 'Save (Ctrl+S)',
    editor_saved: 'Saved',
    editor_saving: 'Saving...',
    editor_export_zip: 'Export .ZIP',
    editor_open_vscode: 'VS Code',
    editor_autofix: 'Auto-Fix & Heal',
    editor_run_sandbox: 'Run Sandbox',
    editor_live_preview: 'Live Preview',
    editor_code_mode: 'Code Mode',

    // Agent Hub
    agent_hub_title: 'Agent Customization Hub',
    agent_hub_subtitle: 'Configure your autonomous worker swarm and active tool skills',
    agent_templates_btn: 'Squad Templates (1-Click)',
    agent_new_btn: 'New Agent',
    agent_tab_squad: 'Active Squad',
    agent_tab_skills: 'Skills & Tools Marketplace',
    agent_apply_btn: 'Apply Squad (1-Click)',
    agent_active: 'Active',
    agent_inactive: 'Inactive',

    // Settings
    settings_title: 'Global Settings & Updates',
    settings_subtitle: 'Configure runtime parameters, local models, and software updates',
    settings_sub_update: 'Software Update',
    settings_sub_general: 'General & Network',
    settings_sub_models: 'AI Models',
    settings_sub_ai: 'AI Intelligence & Models',
    settings_sub_sandbox: 'Sandbox & Security',
    settings_sub_mobile: 'iPhone & iPad Connect',
    mobile_card_title: 'iPhone & iPad Companion Connect',
    mobile_card_subtitle: 'Scan QR code with Safari on iPhone/iPad to run CoreForge as a native app over Wi-Fi',
    mobile_qr_label: 'Scan with Camera',
    mobile_lan_url: 'Direct Network Address',
    mobile_copy_url: 'Copy Address',
    mobile_copied: 'Copied!',
    mobile_pwa_badge: 'iOS Standalone PWA Enabled',
    mobile_step1: 'Connect your iPhone or iPad to the same Wi-Fi network as this PC.',
    mobile_step2: 'Scan the QR code with your Camera app or open the link directly in Safari.',
    mobile_step3: 'Tap the Share icon (square with arrow pointing up) at the bottom of Safari.',
    mobile_step4: 'Select "Add to Home Screen" for a seamless, full-screen native experience.',
    settings_lang_label: 'Interface Language',

    // Actions & Feedback
    action_delete: 'Delete',
    action_cancel: 'Cancel',
    action_confirm: 'Confirm',
    action_download: 'Download',
    action_install: 'Install'
  }
};
