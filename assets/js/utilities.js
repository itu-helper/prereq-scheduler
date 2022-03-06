function wrap(text, wordWidth) {
    return text.replace(new RegExp(`(?![^\\n]{1,${wordWidth}}$)([^\\n]{1,${wordWidth}})\\s`, 'g'), '$1\n');
}

function fixPunctuation(text) {
    return text
        .replaceAll(":", ": ")
        .replaceAll(".", ". ")
        .replaceAll("&amp;", " & ")
        .replaceAll("-", " - ")
        .replaceAll("(", " (").replaceAll(")", ") ")
        .replaceAll("  ", " ");
}
