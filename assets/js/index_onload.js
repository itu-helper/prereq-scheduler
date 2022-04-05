var ituHelper = new ITUHelper();

window.addEventListener('load', function () {
    ituHelper.onFetchComplete = generateDropdowns;
    ituHelper.fetchData();
})
