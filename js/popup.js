// js/popup.js
export function showPopup({ message, type = 'error', content = null, onConfirm = null }) {
    const existingPopup = document.getElementById('notification-popup');
    if (existingPopup) existingPopup.remove();

    const popup = document.createElement('div');
    popup.id = 'notification-popup';
    popup.className = `
        fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
        bg-white rounded-lg shadow-lg p-6 z-50 max-w-md w-full 
        border-l-4 ${type === 'error' ? 'border-red-500' : 'border-green-500'} 
        fade-in
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
    closeButton.addEventListener('click', () => popup.remove());

    if (onConfirm) {
        const confirmButton = popup.querySelector('#confirm-popup');
        confirmButton.addEventListener('click', () => {
            onConfirm();
            popup.remove();
        });
        const cancelButton = popup.querySelector('#cancel-popup');
        cancelButton.addEventListener('click', () => popup.remove());
    } else {
        setTimeout(() => {
            popup.classList.remove('fade-in');
            popup.classList.add('fade-out');
            setTimeout(() => popup.remove(), 300);
        }, 5000);
    }

    const outsideClickListener = (event) => {
        if (!popup.contains(event.target)) {
            popup.remove();
            document.removeEventListener('click', outsideClickListener);
        }
    };
    setTimeout(() => document.addEventListener('click', outsideClickListener), 100);
}