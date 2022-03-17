texts = ["Aldığın Dersleri Seç", "Almak İstediğin Dersleri Seç"];

window.onload = (_) => {
    updateStepText(0);
};

function nextStep() {
    if (prereqGrapher == undefined) {
        return;
    } else if (prereqGrapher.graphMode == 0) {
        prereqGrapher.switchGraphMode(1);
        document.getElementById("previousStep").disabled = false;
        updateStepText(1);
    } else if (prereqGrapher.graphMode == 1) {
        location.href = "#CoursePlanCreator";
    }
}

function previousStep() {
    if (prereqGrapher == undefined) {
        return;
    } else if (prereqGrapher.graphMode == 1) {
        prereqGrapher.switchGraphMode(0);
        document.getElementById("previousStep").disabled = true;
        updateStepText(0);
    }
}

function updateStepText(index) {
    let currentStepText = document.getElementById("currentStepText");
    currentStepText.innerHTML = texts[index];
}
