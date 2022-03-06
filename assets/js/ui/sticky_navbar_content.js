texts = ["Aldığın Dersleri Seç", "Almak İstediğin Dersleri Seç"];

function nextStep() {
    let currentStepText = document.getElementById("currentStepText");
    if (prereqGrapher == undefined) {
        return;
    } else if (prereqGrapher.graphMode == 0) {
        prereqGrapher.switchGraphMode(1);
        document.getElementById("previousStep").disabled = false;
        currentStepText.innerHTML = texts[1];
    } else if (prereqGrapher.graphMode == 1) {
        location.href = "#CoursePlanCreator";
    }
}

function previousStep() {
    let currentStepText = document.getElementById("currentStepText");
    if (prereqGrapher == undefined) {
        return;
    } else if (prereqGrapher.graphMode == 1) {
        prereqGrapher.switchGraphMode(0);
        document.getElementById("previousStep").disabled = true;
        currentStepText.innerHTML = texts[0];
    }
}
