const texts = ["Aldığın Dersleri Seç", "Almak İstediğin Dersleri Seç"];

window.onload = _ => {
    updateStepText(0);
};

function nextStep() {
    if (!prereqOrchestrator) {
        return;
    } else if (prereqOrchestrator.graphMode === GraphMode.TAKEN_COURSES) {
        prereqOrchestrator.switchGraphMode(GraphMode.COURSES_TO_TAKE);
        document.getElementById("previousStep").disabled = false;
        updateStepText(1);
    } else if (prereqOrchestrator.graphMode === GraphMode.COURSES_TO_TAKE) {
        location.href = "#CoursePlanCreator";
    }
}

function previousStep() {
    if (!prereqOrchestrator) {
        return;
    } else if (prereqOrchestrator.graphMode === GraphMode.COURSES_TO_TAKE) {
        prereqOrchestrator.switchGraphMode(GraphMode.TAKEN_COURSES);
        document.getElementById("previousStep").disabled = true;
        updateStepText(0);
    }
}

function updateStepText(index) {
    const currentStepText = document.getElementById("currentStepText");
    currentStepText.innerHTML = texts[index];
}
