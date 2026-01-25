texts = ["Aldığın Dersleri Seç", "Almak İstediğin Dersleri Seç"];

window.onload = (_) => {
    updateStepText(0);
};

function nextStep() {
    if (prereqGrapher == undefined) {
        return;
    } else if (prereqGrapher.graphMode == GraphMode.TAKEN_COURSES) {
        prereqGrapher.switchGraphMode(GraphMode.COURSES_TO_TAKE);
        document.getElementById("previousStep").disabled = false;
        updateStepText(1);
    } else if (prereqGrapher.graphMode == GraphMode.COURSES_TO_TAKE) {
        location.href = "#CoursePlanCreator";
    }
}

function previousStep() {
    if (prereqGrapher == undefined) {
        return;
    } else if (prereqGrapher.graphMode == GraphMode.COURSES_TO_TAKE) {
        prereqGrapher.switchGraphMode(GraphMode.TAKEN_COURSES);
        document.getElementById("previousStep").disabled = true;
        updateStepText(0);
    }
}

function updateStepText(index) {
    let currentStepText = document.getElementById("currentStepText");
    currentStepText.innerHTML = texts[index];
}
