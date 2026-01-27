texts = ["Aldığın Dersleri Seç", "Almak İstediğin Dersleri Seç"];

window.onload = (_) => {
    updateStepText(0);
};

function nextStep() {
    if (prereqManager == undefined) {
        return;
    } else if (prereqManager.graphMode == GraphMode.TAKEN_COURSES) {
        prereqManager.switchGraphMode(GraphMode.COURSES_TO_TAKE);
        document.getElementById("previousStep").disabled = false;
        updateStepText(1);
    } else if (prereqManager.graphMode == GraphMode.COURSES_TO_TAKE) {
        location.href = "#CoursePlanCreator";
    }
}

function previousStep() {
    if (prereqManager == undefined) {
        return;
    } else if (prereqManager.graphMode == GraphMode.COURSES_TO_TAKE) {
        prereqManager.switchGraphMode(GraphMode.TAKEN_COURSES);
        document.getElementById("previousStep").disabled = true;
        updateStepText(0);
    }
}

function updateStepText(index) {
    let currentStepText = document.getElementById("currentStepText");
    currentStepText.innerHTML = texts[index];
}
