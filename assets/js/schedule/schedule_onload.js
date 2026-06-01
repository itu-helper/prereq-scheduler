// Initialize ituHelper for schedule creator page
var ituHelper = new ITUHelper();
var scheduleApp; // Global reference to the app

window.addEventListener('load', function () {
    console.log('Schedule page: Starting data fetch...');
    ituHelper.onFetchComplete = async function() {
        console.log('Schedule page: Data fetch complete. Courses:', ituHelper.courses.length);
        console.log('Schedule page: Semesters:', Object.keys(ituHelper.semesters).length);
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
