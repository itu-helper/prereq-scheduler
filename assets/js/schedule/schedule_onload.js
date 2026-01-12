// Initialize ituHelper for schedule creator page
var ituHelper = new ITUHelper();
var scheduleApp; // Global reference to the app

window.addEventListener('load', function () {
    ituHelper.onFetchComplete = async function() {
        // Initialize the Schedule Creator App
        scheduleApp = new ScheduleCreator(ituHelper);
        await scheduleApp.initialize();
    };
    ituHelper.fetchData();

    // Mobile toggle functionality
    const mobileToggleBtn = document.getElementById('mobile-toggle-btn');
    const leftSection = document.querySelector('.left-section');
    
    if (mobileToggleBtn && leftSection) {
        mobileToggleBtn.addEventListener('click', function() {
            leftSection.classList.toggle('collapsed');
        });
    }
});
