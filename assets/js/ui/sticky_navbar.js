window.onscroll = function() {
    stickyNavBar();
};

let navbar = document.getElementById("navbar");
let prerequisitoryChains = document.getElementById("prerequisitoryChains");
let isSticky = false;
let fxWidthDelay = 0.1;

function easeInExpo(x) {
    return x === 0 ? 0 : Math.pow(2, 10 * x - 10);
}

function stickyNavBar() {
    let dist = prerequisitoryChains.offsetTop;
    let margin = navbar.offsetHeight;

    let fxRatio = window.pageYOffset / dist;
    let alpha = (fxRatio * 34) / 255;
    let widthPercentage = 85 + 15 * (easeInExpo(Math.max(fxRatio - fxWidthDelay, 0) * (1 + fxWidthDelay)) / (1 - fxWidthDelay));

    navbar.style.backgroundColor = "rgba(0, 0, 0, " + alpha + ")";
    navbar.style.width = widthPercentage + "%";

    if (window.pageYOffset > dist) {
        navbar.classList.add("sticky");
        isSticky = true;
        document.getElementById("mountNode").style.marginTop = margin.toString() + "px";
    } else {
        navbar.classList.remove("sticky");
        isSticky = false;
        document.getElementById("mountNode").style.marginTop = 0;
    }
}
