import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

function mount() {
  const el = document.getElementById('root');
  if (!el) {
    document.body.innerHTML =
      '<div style="font-family:sans-serif;padding:2rem;color:#b91c1c">' +
      '<b>GovTaskPro:</b> ไม่พบ #root — โหลด HTML ไม่ครบ</div>';
    return;
  }
  // No StrictMode: it double-invokes effects and can deadlock SpreadsheetApp via concurrent getBootstrap
  createRoot(el).render(<App />);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
