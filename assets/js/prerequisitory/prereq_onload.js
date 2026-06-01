var ituHelper = new ITUHelper();

window.addEventListener('load', function () {
    console.log('Starting data fetch...');
    ituHelper.onFetchComplete = function() {
        console.log('Data fetch complete. Courses:', ituHelper.courses.length);
        console.log('Semesters:', Object.keys(ituHelper.semesters).length);
        generateDropdowns();
    };
    ituHelper.fetchData();
})
