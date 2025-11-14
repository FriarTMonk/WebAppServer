/**
 * Convert greek-dictionary.js to the format needed for StrongsDefinition interface
 *
 * Input format (from greek-dictionary.js):
 * {
 *   "G1615": {
 *     "strongs_def": " to complete fully",
 *     "derivation": "from G1537 (ἐκ) and G5055 (τελέω);",
 *     "translit": "ekteléō",
 *     "lemma": "ἐκτελέω",
 *     "kjv_def": "finish"
 *   }
 * }
 *
 * Output format (StrongsDefinition):
 * {
 *   "G1615": {
 *     "number": "G1615",
 *     "transliteration": "ekteléō",
 *     "pronunciation": "ek-tel-eh'-o",
 *     "definition": "to complete fully; finish",
 *     "derivation": "from G1537 (ἐκ) and G5055 (τελέω)",
 *     "usage": "finish"
 *   }
 * }
 */

const fs = require('fs');
const path = require('path');

// Load the Greek dictionary
const greekDict = require('./greek-dictionary.js');

// Function to generate pronunciation from transliteration
// This is a simple approximation - the original pronunciation isn't in the data
function generatePronunciation(translit) {
  if (!translit) return '';

  // Simple rules to convert transliteration to pronunciation guide
  return translit
    .toLowerCase()
    .replace(/ē/g, 'ay')
    .replace(/ō/g, 'o')
    .replace(/ý/g, 'ee')
    .replace(/á/g, 'ah')
    .replace(/é/g, 'eh')
    .replace(/ó/g, 'o')
    .replace(/ḗ/g, 'ay')
    .replace(/î/g, 'ee')
    .replace(/û/g, 'oo');
}

// Convert the dictionary
const convertedDict = {};
let totalEntries = 0;

for (const [strongsNum, entry] of Object.entries(greekDict)) {
  totalEntries++;

  // Clean up strings (remove leading/trailing spaces)
  const strongsDef = (entry.strongs_def || '').trim();
  const kjvDef = (entry.kjv_def || '').trim();
  const derivation = (entry.derivation || '').trim();
  const translit = (entry.translit || '').trim();

  // Combine strongs_def and kjv_def for a fuller definition
  let definition = strongsDef;
  if (kjvDef && !strongsDef.toLowerCase().includes(kjvDef.toLowerCase())) {
    definition = strongsDef ? `${strongsDef}; ${kjvDef}` : kjvDef;
  }

  convertedDict[strongsNum] = {
    number: strongsNum,
    transliteration: translit,
    pronunciation: generatePronunciation(translit),
    definition: definition || 'No definition available',
    lemma: entry.lemma || '',  // Keep the Greek word for reference
    derivation: derivation || undefined,
    usage: kjvDef || undefined,
  };
}

// Output as JSON
const outputPath = path.join(__dirname, 'greek-definitions.json');
fs.writeFileSync(
  outputPath,
  JSON.stringify(convertedDict, null, 2),
  'utf8'
);

console.log(`✅ Converted ${totalEntries} Greek Strong's entries`);
console.log(`📝 Output written to: ${outputPath}`);
console.log(`📊 File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);

// Show a sample entry
const sampleKey = Object.keys(convertedDict)[0];
console.log('\n📖 Sample entry:');
console.log(JSON.stringify({ [sampleKey]: convertedDict[sampleKey] }, null, 2));
