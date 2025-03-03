from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json
import re
import traceback

app = Flask(__name__)
CORS(app)

# Global document storage
document_text = None

# Common words to exclude from character names
COMMON_FILTER = {
    'A', 'An', 'The', 'And', 'But', 'Or', 'For', 'Nor', 'As', 'At', 'By', 'From',
    'In', 'Of', 'On', 'To', 'With', 'It', 'Its', 'They', 'Them', 'Their', 'This',
    'That', 'These', 'Those', 'Is', 'Are', 'Was', 'Were', 'Be', 'Been', 'Being',
    'Have', 'Has', 'Had', 'Do', 'Does', 'Did', 'Will', 'Would', 'Should', 'Can',
    'Could', 'May', 'Might', 'Must', 'Shall', 'Ought', 'Not', 'No', 'Yes', 'Here',
    'There', 'What', 'When', 'Where', 'Why', 'How', 'Which', 'Who', 'Whom', 'While',
    'She', 'He', 'His', 'Her', 'Him', 'We', 'Us', 'Our', 'You', 'Your', 'Yours',
    'Every', 'All', 'Some', 'Any', 'Such', 'Each', 'Either', 'Neither', 'Both',
    'Yet', 'So', 'Than', 'Then', 'Now', 'Just', 'Only', 'Even', 'Still', 'Also',
    'Within', 'Without', 'Above', 'Below', 'Under', 'Over', 'Between', 'Among',
    'Submit', 'Submitter', 'Submitted', 'Submission', 'Submissions', 'Submitters',
    'Shadows', 'Shadow', 'However', 'Restrained', 'Restraint', 'Restraints', 'Restrain',
}

# Patterns for fantasy names
FANTASY_PATTERNS = [
    r'\b[A-Z][a-z]*(?:ion|us|ar|is|or)\b',  # Common fantasy suffixes
    r'\b(?:D\'|Von|El|Al|Ben)[A-Z][a-z]+\b',  # Name prefixes
    r'\b[A-Z][a-z]+-[A-Z][a-z]+\b'  # Hyphenated names
]

# Contextual triggers for names
CONTEXT_TRIGGERS = {
    'before': ['Lord', 'Lady', 'King', 'Queen', 'Sir', 'Dame', 'Doctor', 'Captain'],
    'after': ['said', 'asked', 'exclaimed', 'shouted', 'whispered', 'replied']
}

# Helper functions
def is_likely_name(word, context_words):
    """Determine if a word is likely a fantasy name using multiple heuristics"""
    word_lower = word.lower()
    if len(word) < 3 or word_lower in {w.lower() for w in COMMON_FILTER}:
        return False
    if any(re.search(pattern, word) for pattern in FANTASY_PATTERNS):
        return True
    prev_word, next_word = context_words
    if (prev_word in CONTEXT_TRIGGERS['before'] or
        next_word.lower() in CONTEXT_TRIGGERS['after']):
        return True
    if word.istitle() and not word.isupper():
        return True
    return False

def extract_characters(text):
    """Advanced name extraction without external dependencies"""
    sentences = re.split(r'(?<=[.!?])\s+', text)
    word_freq = {}
    candidates = []
    multi_word_names = set()

    for sentence in sentences:
        words = re.findall(r'\b\w+\b', sentence)
        i = 0
        while i < len(words):
            word = words[i]
            if word.isupper() and len(word) > 1:
                i += 1
                continue
            if is_likely_name(word, ('', '')):
                if i + 1 < len(words) and is_likely_name(words[i + 1], ('', '')):
                    full_name = f"{word} {words[i + 1]}"
                    candidates.append(full_name)
                    word_freq[full_name] = word_freq.get(full_name, 0) + 1
                    multi_word_names.add(full_name)
                    i += 2
                else:
                    if not any(word in full_name.split() for full_name in multi_word_names):
                        candidates.append(word)
                        word_freq[word] = word_freq.get(word, 0) + 1
                    i += 1
            else:
                i += 1
    return sorted(
        [name for name, count in word_freq.items() if count > 1],
        key=lambda x: (-word_freq[x], x)
    )

def safe_json_parse(llm_output):
    """Robust JSON parser with LLM output sanitization"""
    try:
        # First try to parse as complete JSON
        parsed = json.loads(llm_output)
        if isinstance(parsed, dict):
            return parsed.get("characters", [])
        return parsed if isinstance(parsed, list) else []
    except json.JSONDecodeError:
        # Fallback to pattern matching
        try:
            match = re.search(r'(\[.*?\])', llm_output, re.DOTALL)
            if match:
                return json.loads(match.group(1))
            return []
        except Exception as e:
            print(f"Secondary JSON parsing failed: {str(e)}")
            return []
    except Exception as e:
        print(f"JSON parsing error: {str(e)}")
        return []

# Feature processors
def process_characters(text):
    """Process characters using combined LLM and regex approach"""
    prompt_template = "Analyze the story below and list ALL characters as a JSON array. Example: [\"Alice\", \"Officer Lysander\"].\nStory Text:\n{text}"
    llm_output = None
    
    try:
        response = requests.post(
            'http://localhost:8080/completion',
            json={
                "prompt": prompt_template.format(text=text),
                "temperature": 0.3,
                "n_predict": 128,
                "stream": False
            },
            timeout=600
        )
        llm_output = response.json().get("content", "[]") if response.status_code == 200 else None
    except Exception as e:
        print(f"LLM query error: {str(e)}")
        llm_output = None

    llm_characters = safe_json_parse(llm_output) if llm_output else []
    fallback_chars = extract_characters(text)
    valid_llm = [name for name in llm_characters if is_likely_name(name, ('', ''))]
    return list(set(valid_llm + fallback_chars))

def extract_physical_features(text, character_name):
    """Fallback regex-based feature extraction"""
    features = {'hair': 'N/A', 'eyes': 'N/A', 'gender': 'N/A'}
    
    # Gender detection
    gender_pattern = rf"(?i)\b({character_name}[^.!?]*\b(he|him|his)\b)"
    if re.search(gender_pattern, text):
        features['gender'] = 'Male'
    else:
        gender_pattern = rf"(?i)\b({character_name}[^.!?]*\b(she|her|hers)\b)"
        if re.search(gender_pattern, text):
            features['gender'] = 'Female'
    
    # Hair extraction pattern
    hair_pattern = r"(?i)(hair|tresses)[^\.,]*?(\b\w+\s\w+)+(?=\W|$)"
    hair_match = re.search(hair_pattern, text)
    if hair_match:
        features['hair'] = hair_match.group(2)
    
    # Eye extraction pattern
    eye_pattern = r"(?i)(eyes|gaze)[^\.,]*?(\b\w+\s\w+)+(?=\W|$)"
    eye_match = re.search(eye_pattern, text)
    if eye_match:
        features['eyes'] = eye_match.group(2)
    
    return features

def process_descriptions(text, characters):
    """Extract character descriptions using direct quotes from text"""
    if not characters:
        return {}

    # Clean text and get relevant excerpt
    clean_text = text.replace('"', "'").replace('\n', ' ')
    excerpt_length = min(10000, len(clean_text))  # Increased to 10k characters
    relevant_text = clean_text[:excerpt_length]
    
    prompt = f"""ANALYSIS RULES:
1. Extract ALL DESCRIBED features including pronouns and implied traits
2. Infer gender from pronouns like 'he/him' or 'she/her'
3. Use EXACT wording from text when available
4. For unspecified details, infer from context using this priority:
   - Gender: from pronouns (he/she/they)
   - Age: from terms like "young", "elderly", or explicit numbers
   - Race: from cultural references (e.g., "elf", "human", "fae")
   - Physique: physical descriptions (e.g., "pale", "dark", "tall", "short", "muscular", "slender")

CHARACTERS TO ANALYZE: {characters}

STORY EXCERPT:
{relevant_text}

RETURN STRICT JSON FORMAT:
{{
  "characters": [
    {{
      "name": "Exact Name", 
      "age": "Estimated age or N/A", 
      "gender": "Inferred from pronouns or N/A",
      "race": "Cultural references or N/A",
      "physique": "Exact description from text or N/A",
      "hair": "Exact description from text or N/A",
      "eyes": "Exact description from text or N/A"
    }}
  ]
}}"""

    try:
        response = requests.post(
            'http://localhost:8080/completion',
            json={
                "prompt": prompt,
                "temperature": 0.1,
                "n_predict": 512,
                "stop": ["\n</response>"],
                "stream": False
            },
            timeout=120
        )
        
        if response.status_code != 200:
            return {}

        raw_output = response.json().get("content", "{}")
        if "characters" not in raw_output:  # Only debug if unexpected format
            print(f"LLM Raw Output Sample:\n{raw_output[:200]}...")  # Limited logging
        
        result = safe_json_parse(raw_output)
        
        # Handle both response formats
        characters_data = result if isinstance(result, list) else result.get("characters", [])
        
        # Enhance with regex fallback
        final_data = {}
        for char in characters_data:
            if "name" not in char:
                continue
                
            # Add fallback extraction
            if char.get("hair") == "N/A" or char.get("eyes") == "N/A":
                fallback_features = extract_physical_features(relevant_text, char["name"])
                char["hair"] = fallback_features["hair"] if char.get("hair") == "N/A" else char["hair"]
                char["eyes"] = fallback_features["eyes"] if char.get("eyes") == "N/A" else char["eyes"]
            
            # Pronoun analysis fallback
            if char.get("gender") == "N/A":
                context_window = re.search(rf"({char['name']}[^.!?]*?[.!?])", relevant_text, re.IGNORECASE)
                if context_window:
                    context = context_window.group(1)
                    if re.search(r'\b(he|him|his)\b', context, re.IGNORECASE):
                        char["gender"] = "Male"
                    elif re.search(r'\b(she|her|hers)\b', context, re.IGNORECASE):
                        char["gender"] = "Female"
            
            final_data[char["name"]] = char
        
        return final_data
        
    except Exception as e:
        print(f"Description extraction error: {str(e)}")
        return {}

# API endpoints
@app.route('/analyze-document', methods=['POST'])
def analyze_document():
    global document_text
    data = request.json
    text = data.get('text')
    
    if not text:
        return jsonify({"error": "No text provided"}), 400
    
    document_text = text
    characters = process_characters(text)
    
    # Debug logging only when needed
    if not characters:
        print("No characters found in text")
    
    descriptions = process_descriptions(text, characters) if characters else {}
    
    # Merge character data with fallback values
    character_data = []
    for char in characters:
        char_info = descriptions.get(char, {})
        character_data.append({
            "name": char,
            "age": char_info.get("age", "N/A"),
            "gender": char_info.get("gender", "N/A"),
            "race": char_info.get("race", "N/A"),
            "physique": char_info.get("physique", "N/A"),
            "hair": char_info.get("hair", "N/A"),
            "eyes": char_info.get("eyes", "N/A")
        })
    
    return jsonify({"characters": character_data})

@app.route('/refresh-characters', methods=['POST'])
def refresh_characters():
    global document_text
    if not document_text:
        return jsonify({"error": "No document available"}), 400
    characters = process_characters(document_text)
    descriptions = process_descriptions(document_text, characters) if characters else {}
    
    # Merge character data
    character_data = []
    for char in characters:
        char_info = descriptions.get(char, {
            "name": char,
            "age": "N/A",
            "gender": "N/A",
            "race": "N/A",
            "physique": "N/A",
            "hair": "N/A",
            "eyes": "N/A"
        })
        character_data.append(char_info)
    
    return jsonify({"characters": character_data})

@app.errorhandler(500)
def handle_server_error(e):
    return jsonify({
        "error": "Processing failed",
        "details": traceback.format_exc()
    }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)