var dataManager = new DataManager();

window.addEventListener('load', function () {
    dataManager.onFileLoad = generateDropdowns;
    dataManager.readAllTextFiles();
})
