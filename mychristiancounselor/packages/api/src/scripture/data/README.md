# Scripture Data Directory

This directory contains Bible verse data and Strong's concordance information for the MyChristianCounselor application.

## Directory Structure

```
data/
├── README.md                      # This file
├── kjv-verses.json               # King James Version verses with Strong's numbers
├── asv-verses.json               # American Standard Version verses with Strong's numbers
└── strongs/                      # Strong's Concordance lexicon data
    ├── greek-dictionary.js       # Source: Greek Strong's dictionary
    ├── hebrew-dictionary.js      # Source: Hebrew Strong's dictionary
    ├── greek-definitions.json    # Converted: Greek definitions (5,523 entries)
    ├── hebrew-definitions.json   # Converted: Hebrew definitions (8,674 entries)
    ├── convert-greek-dictionary.js   # Conversion script for Greek
    └── convert-hebrew-dictionary.js  # Conversion script for Hebrew
```

## Bible Verses Format

### File Naming
- `{translation}-verses.json` (e.g., `kjv-verses.json`, `asv-verses.json`)

### JSON Structure

Each verse file should be an array of verse objects:

```json
[
  {
    "book": "Genesis",
    "chapter": 1,
    "verse": 1,
    "text": "In the beginning God created the heaven and the earth.",
    "translation": "KJV",
    "strongs": [
      {
        "word": "beginning",
        "number": "H7225",
        "position": 2
      },
      {
        "word": "God",
        "number": "H430",
        "position": 3
      },
      {
        "word": "created",
        "number": "H1254",
        "position": 4
      }
    ]
  }
]
```

### Fields

- `book` (string): Bible book name (e.g., "Genesis", "John")
- `chapter` (number): Chapter number
- `verse` (number): Verse number
- `text` (string): Full verse text
- `translation` (string): Translation code ("KJV" or "ASV")
- `strongs` (array, optional): Array of Strong's number annotations
  - `word` (string): The English word in the verse
  - `number` (string): Strong's number (e.g., "H7225" for Hebrew, "G3056" for Greek)
  - `position` (number): Word position in the verse (1-indexed)

## Strong's Lexicon Format

### Hebrew Lexicon (`strongs/hebrew-lexicon.json`)

```json
{
  "H7225": {
    "number": "H7225",
    "word": "רֵאשִׁית",
    "transliteration": "re'shiyth",
    "pronunciation": "ray-sheeth'",
    "partOfSpeech": "noun feminine",
    "definition": "the first, in place, time, order or rank (specifically, a firstfruit)",
    "kjvUsage": "beginning, chief, first fruits, part, time, principal thing",
    "derivation": "from the same as H7218",
    "occurrences": 51
  }
}
```

### Greek Lexicon (`strongs/greek-lexicon.json`)

```json
{
  "G3056": {
    "number": "G3056",
    "word": "λόγος",
    "transliteration": "logos",
    "pronunciation": "log'-os",
    "partOfSpeech": "noun masculine",
    "definition": "something said (including the thought); by implication, a topic (subject of discourse), also reasoning (the mental faculty) or motive",
    "kjvUsage": "account, cause, communication, concerning, doctrine, matter, mouth, preaching, question, reason, reckon, say, shew, speaker, speech, talk, thing, tidings, treatise, utterance, word, work",
    "derivation": "from G3004",
    "occurrences": 330
  }
}
```

### Lexicon Fields

- `number` (string): Strong's number identifier
- `word` (string): Original Hebrew/Greek word in Unicode
- `transliteration` (string): Romanized pronunciation guide
- `pronunciation` (string): Phonetic pronunciation
- `partOfSpeech` (string): Grammatical category
- `definition` (string): Detailed meaning and usage
- `kjvUsage` (string): How the word is translated in KJV
- `derivation` (string): Etymology and related words
- `occurrences` (number): Number of times used in Bible

## Data Sources

### Public Domain Bible Texts
- **KJV (1611)**: Public domain, widely available with Strong's numbers
- **ASV (1901)**: Public domain, based on Revised Version with American preferences

### Strong's Concordance
- **Original work**: Public domain (published 1890)
- **Hebrew**: 8,674 entries (H1-H8674)
- **Greek**: 5,624 entries (G1-G5624)

### Recommended Data Providers
1. **OpenScriptures** (https://github.com/openscriptures)
   - High-quality public domain texts
   - Strong's numbers integrated
   - JSON format available

2. **STEPBible** (https://www.stepbible.org)
   - Free for non-commercial use
   - Comprehensive tagging
   - Multiple formats

3. **Bible SuperSearch** (https://api.biblesupersearch.com)
   - Free API with Strong's data
   - Multiple translations
   - JSON responses

## Loading Data

### Seeding the Database

Once you've placed the JSON files in this directory:

```bash
cd packages/api
npm run seed
```

The seed script will:
1. Create translation metadata records (KJV, ASV)
2. Import all verses from `kjv-verses.json` and `asv-verses.json`
3. Process Strong's numbers if present

### Expected Data Volume
- **KJV**: ~31,102 verses
- **ASV**: ~31,103 verses
- **Total**: ~62,205 verses
- **Strong's Hebrew**: 8,674 entries
- **Strong's Greek**: 5,624 entries

## Notes

### Strong's Numbers
- Hebrew/Aramaic words: Prefixed with "H" (e.g., H7225)
- Greek words: Prefixed with "G" (e.g., G3056)
- Some verses may have multiple words mapped to same Strong's number
- Not every word has a Strong's number (articles, prepositions may be omitted)

### Copyright & Licensing
- KJV and ASV are in the public domain
- Strong's Concordance is in the public domain
- Ensure any derived datasets maintain public domain status
- Modern Strong's definitions may have updated scholarship but should be open source

### Performance Considerations
- Batch insert 1,000 verses at a time for optimal performance
- Index on `translation_code`, `book`, `chapter`, `verse` for fast lookups
- Consider separate table for Strong's annotations if data is very large
