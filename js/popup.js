// js/popup.js
export function showPopup({ message, type = 'error', content = null, onConfirm = null }) {
    const existingPopup = document.getElementById('notification-popup');
    if (existingPopup) existingPopup.remove();

    const popup = document.createElement('div');
    popup.id = 'notification-popup';
    popup.className = `
        fixed bg-white rounded-lg shadow-lg z-50 
        border-l-4 ${type === 'error' ? 'border-red-500' : 'border-green-500'} 
        fade-in ${window.innerWidth <= 640 ? 'p-3' : 'p-6'}
    `;

    let innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <div class="flex items-center">
                <i class="fas fa-${type === 'error' ? 'exclamation-circle text-red-500' : 'check-circle text-green-500'} mr-3"></i>
                <p class="text-gray-800 text-sm font-semibold">${message}</p>
            </div>
            <button id="close-popup" class="text-gray-500 hover:text-gray-800 focus:outline-none">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    if (content) {
        innerHTML += `<div class="popup-content">${content}</div>`;
        if (onConfirm) {
            innerHTML += `
                <div class="mt-4 flex justify-end gap-2">
                    <button id="confirm-popup" class="btn bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg">Скопировать</button>
                    <button id="cancel-popup" class="btn bg-gray-300 text-gray-800 hover:bg-gray-400 px-4 py-2 rounded-lg">Отмена</button>
                </div>
            `;
        }
    }

    popup.innerHTML = innerHTML;
    document.body.appendChild(popup);

    const closeButton = popup.querySelector('#close-popup');
    const closePopup = () => {
        popup.classList.remove('fade-in');
        popup.classList.add('fade-out');
        setTimeout(() => popup.remove(), 300);
    };

    closeButton.addEventListener('click', closePopup);

    if (onConfirm) {
        const confirmButton = popup.querySelector('#confirm-popup');
        confirmButton.addEventListener('click', () => {
            onConfirm();
            closePopup();
        });
        const cancelButton = popup.querySelector('#cancel-popup');
        cancelButton.addEventListener('click', closePopup);
    }

    const outsideClickListener = (event) => {
        if (!popup.contains(event.target)) {
            closePopup();
            document.removeEventListener('click', outsideClickListener);
        }
    };
    setTimeout(() => document.addEventListener('click', outsideClickListener), 100);

    // Auto-close only for non-interactive popups
    if (!onConfirm && !content) {
        setTimeout(closePopup, 5000);
    }
}

window.showPopup = showPopup;