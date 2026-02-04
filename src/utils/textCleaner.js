/**
 * Cleans special characters from text responses.
 * Removes escaped characters like \n, \t, \r, etc. and returns clean text.
 * 
 * @param {string} text - The text to clean
 * @returns {string} - The cleaned text
 */
export const cleanResponseText = (text) => {
  if (typeof text !== 'string') {
    return text;
  }

  // Remove escaped newline, tab, carriage return, and other special characters
  // This handles cases like "Hello\nWorld" -> "HelloWorld"
  let cleaned = text.replace(/\\n/g, '')
                    .replace(/\\t/g, '')
                    .replace(/\\r/g, '')
                    .replace(/\\f/g, '')
                    .replace(/\\v/g, '')
                    .replace(/\\b/g, '');

  return cleaned;
};