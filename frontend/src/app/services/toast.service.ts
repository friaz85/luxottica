import { Injectable, signal } from '@angular/core';
import Swal from 'sweetalert2';

export interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
}

@Injectable({
    providedIn: 'root'
})
export class ToastService {

    private Toast = Swal.mixin({
        toast: false,
        position: 'center',
        showConfirmButton: true,
        confirmButtonColor: '#000000',
        customClass: {
            popup: 'tec-toast-popup',
            title: 'tec-toast-title',
            icon: 'tec-toast-icon'
        }
    });

    show(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration = 3000) {
        let icon: 'success' | 'error' | 'info' | 'warning' = type;

        this.Toast.fire({
            icon: icon,
            title: type === 'error' ? 'ERROR' : type === 'success' ? 'ÉXITO' : type === 'warning' ? 'ADVERTENCIA' : 'AVISO',
            text: message.toUpperCase(),
            background: '#fff',
            color: '#333',
            confirmButtonText: 'ACEPTAR',
            iconColor: type === 'success' ? '#00cc66' : type === 'error' ? '#ff4444' : type === 'warning' ? '#f2e74b' : '#000000',
        });
    }
}
