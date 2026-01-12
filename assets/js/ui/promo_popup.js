const promotion_identifier = "schedule_creator_release";

document.addEventListener('DOMContentLoaded', function() {
    id = "promo_" + promotion_identifier
    const popup = document.getElementById('extensionPopup');
    const closeButton = document.getElementById('closePopup');
    const hideCheckbox = document.getElementById('hideExtensionPopup');

    const isPopupHidden = localStorage.getItem(id);

    if (!isPopupHidden) {
        popup.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    closeButton.addEventListener('click', function () {
        if (hideCheckbox.checked) {
            localStorage.setItem(id, 'true');
        }
        popup.style.display = 'none';
        document.body.style.overflow = 'auto';
    });
});
