// Initialize ituHelper for schedule creator page
var ituHelper = new ITUHelper();

window.addEventListener('load', function () {
    ituHelper.onFetchComplete = initializeScheduleCreator;
    ituHelper.fetchData();
});
