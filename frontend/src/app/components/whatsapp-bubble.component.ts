import { Component } from '@angular/core';

@Component({
  selector: 'app-whatsapp-bubble',
  standalone: true,
  template: `
    <a href="https://wa.me/525574479668?text=Hola,%20vengo%20del%20Portal%20Embajadores%20TEC%20y%20necesito%20ayuda" target="_blank" class="wa-bubble">
      <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="Support">
      <span class="tooltip">¿Necesitas ayuda?</span>
    </a>
  `,
  styles: [`
    .wa-bubble { position: fixed; bottom: 30px; right: 30px; background: #25D366; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px rgba(0,0,0,0.3); z-index: 1000; transition: 0.3s; }
    .wa-bubble:hover { transform: scale(1.1) rotate(10deg); }
    img { width: 35px; }
    .tooltip { position: absolute; right: 75px; background: white; color: #1A0B2E; padding: 0.5rem 1rem; border-radius: 0.5rem; font-size: 0.8rem; font-weight: bold; white-space: nowrap; opacity: 0; transition: 0.3s; pointer-events: none; }
    .wa-bubble:hover .tooltip { opacity: 1; right: 85px; }
  `]
})
export class WhatsappBubbleComponent { }
