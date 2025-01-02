function wrap(text, wordWidth, maxLineCount=5) {
    const wrappedText = text.replace(new RegExp(`(?![^\\n]{1,${wordWidth}}$)([^\\n]{1,${wordWidth}})\\s`, 'g'), '$1\n');

    const wrappedTextLines = wrappedText.split('\n');

    if (wrappedTextLines.length > maxLineCount) {
        truncatedText = wrappedTextLines.slice(0, maxLineCount).join('\n')

        // If the last line has enough place at the end for "...", append it. 
        const lastLineLength = wrappedTextLines[maxLineCount - 1].length
        if (lastLineLength + 3 <= wordWidth)
            truncatedText += '...';
        // If not, remove enough characters from the last line to make space for "..."
        else {
            const remainingSpace = wordWidth - 3; // Space left after reserving space for "..."
            let lastLine = wrappedTextLines[maxLineCount - 1];

            // Truncate the last line to fit "..."
            lastLine = lastLine.slice(0, remainingSpace);

            // Replace the last line in truncatedText with the truncated version
            const lines = truncatedText.split('\n');
            lines[maxLineCount - 1] = lastLine + '...';
            truncatedText = lines.join('\n');
        }

        return truncatedText;
    }

    return wrappedText;
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
