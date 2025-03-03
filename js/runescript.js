// Tab Configuration
const TAB_CONFIG = {
    notes: {  // Changed from 'todo'
        title: "Notes",
        content: ""
    },
    narrative_arc: {
        title: "Narrative Arc",
        content: "No analysis available"
    },
    world_setting: {
        title: "World Setting",
        content: "No analysis available"
    },
    characters: {
        title: "Characters",
        content: "No characters detected",
        data: [],  // Store full character data
        isEmpty: true
    }
};

let selectedCharacter = null;
let selectedDialogueType = null;

// Add this new validation function
function validateCharacterSelection() {
    if (!selectedCharacter) {
        showAlert("Please select a character first", "warning");
        return false;
    }
    return true;
}

document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    document.querySelector('.tab-pane[data-tab="notes"]').classList.add('active');  // Changed from 'todo'
    setupSaveLoadButtons();
    initializeNotesEditor();  // Initialize the notes editor in the top-right div
});

// Initialize the notes editor in the top-right div
function initializeNotesEditor() {
    const contentDisplay = document.getElementById('tab-content-display');
    contentDisplay.innerHTML = `
        <h3>Notes</h3>
        <textarea class="notes-editor" placeholder="Start writing your notes..."></textarea>
    `;
}

// Update setupTabs function
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active classes
            tabButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

            // Set active state
            const tabId = button.dataset.tab;
            button.classList.add('active');
            document.querySelector(`.tab-pane[data-tab="${tabId}"]`).classList.add('active');

            // Clear bottom-right panel if not on Characters tab
            if (tabId !== 'characters') {
                document.getElementById('bottom-right-panel').innerHTML = '';
            }

            // Clear selected character and active tab-content buttons when switching away from Characters tab
            if (tabId !== 'characters') {
                selectedCharacter = null;
                document.querySelectorAll('.character-container').forEach(c => c.classList.remove('selected'));
                document.querySelectorAll('.dialogue-button').forEach(btn => btn.classList.remove('active'));
            }

            // Update right panel content
            updateContentDisplay(tabId);
        });
    });

    // Unified event delegation for both panels
    document.addEventListener('click', (event) => {
        // Handle character selection
        const characterContainer = event.target.closest('.character-container');
        if (characterContainer) {
            const newCharacter = characterContainer.querySelector('.character-name').textContent;
            if (selectedCharacter !== newCharacter) {
                selectedCharacter = newCharacter;
                document.querySelectorAll('.character-container').forEach(c => c.classList.remove('selected'));
                characterContainer.classList.add('selected');
                
                // Update bottom panel if any button is active
                if (document.querySelector('.dialogue-button.active')) {
                    updateBottomPanel();
                }
            }
            return;
        }

        // Handle dialogue button clicks
        const dialogueButton = event.target.closest('.dialogue-button');
        if (dialogueButton) {
            if (!validateCharacterSelection()) {
                return; // Stop processing if no character selected
            }

            document.querySelectorAll('.dialogue-button').forEach(btn => btn.classList.remove('active'));
            dialogueButton.classList.add('active');
            updateBottomPanel();
        }
    });
}

// Function to update the bottom panel
function updateBottomPanel() {
    const activeButton = document.querySelector('.dialogue-button.active');
    if (!activeButton || !selectedCharacter) {
        document.getElementById('bottom-right-panel').innerHTML = `
            <div class="selection-warning">
                Please select a character first
            </div>
        `;
        return;
    }

    const buttonType = activeButton.dataset.type;
    const characterInfo = TAB_CONFIG.characters.data.find(c => c.name === selectedCharacter);
    
    let content = `<div class="character-header">
                      <h4>${selectedCharacter}</h4>
                  </div>`;
    
    if (characterInfo) {
        switch(buttonType) {
            case 'description':
                content += `
                    <div class="physical-traits">
                        <div class="trait"><label>Age:</label> ${characterInfo.age}</div>
                        <div class="trait"><label>Gender:</label> ${characterInfo.gender}</div>
                        <div class="trait"><label>Race:</label> ${characterInfo.race}</div>
                        <div class="trait"><label>Physique:</label> ${characterInfo.physique}</div>
                        <div class="trait"><label>Hair:</label> ${characterInfo.hair}</div>
                        <div class="trait"><label>Eyes:</label> ${characterInfo.eyes}</div>
                    </div>`;
                break;
                
            case 'dialogue':
                content += `<div class="dialogue-container">
                    Dialogue data not implemented yet
                </div>`;
                break;
                
            case 'relationships':
                content += `<div class="relationships">
                    Relationship data not implemented yet
                </div>`;
                break;
        }
    } else {
        content = 'No character information available';
    }

    document.getElementById('bottom-right-panel').innerHTML = content;
}

// Update updateContentDisplay function
function updateContentDisplay(tabId) {
    const contentDisplay = document.getElementById('tab-content-display');
    const tabData = TAB_CONFIG[tabId];

    if (tabId === 'characters') {
        const isDefaultMessage = tabData.content === "No characters detected";
        const characters = isDefaultMessage ? [] : tabData.content.split('\n').filter(name => name.trim() !== '');

        if (characters.length > 0) {
            contentDisplay.innerHTML = `
                <h3>${tabData.title}</h3>
                <div class="characters-container">
                    ${characters.map(name => {
                        const charData = TAB_CONFIG.characters.data.find(c => c.name === name) || {};
                        return `
                            <div class="character-container ${selectedCharacter === name ? 'selected' : ''}">
                                <div class="character-image"></div>
                                <div class="character-info">
                                    <div class="character-name">${name}</div>
                                    ${charData.description && charData.description !== 'N/A' ? 
                                        `<div class="character-description-preview">${charData.description.substring(0,50)}...</div>` : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        } else {
            contentDisplay.innerHTML = `
                <h3>${tabData.title}</h3>
                <p>${tabData.content}</p>
            `;
            TAB_CONFIG.characters.isEmpty = true;
        }
    } else if (tabId === 'notes') {
        // Notes tab: Keep the editor in the top-right div
        contentDisplay.innerHTML = `
            <h3>${tabData.title}</h3>
            <textarea class="notes-editor">${tabData.content}</textarea>
        `;
    } else {
        contentDisplay.innerHTML = `
            <h3>${tabData.title}</h3>
            <p>${tabData.content}</p>
        `;
    }
}

function setupSaveLoadButtons() {
    const loadButton = document.getElementById('load-button');
    const saveButton = document.getElementById('save-button');
    const jsonLoadInput = document.getElementById('json-load');

    loadButton.addEventListener('click', () => jsonLoadInput.click());
    saveButton.addEventListener('click', saveRunescriptAsJson);
    jsonLoadInput.addEventListener('change', loadRunescriptFromJson);
}

// Update saveRunescriptAsJson function
function saveRunescriptAsJson() {
    if (TAB_CONFIG.characters.isEmpty) {
        selectedCharacter = null;
        selectedDialogueType = null;
    }

    const runescriptData = {
        notes: {
            content: document.querySelector('.notes-editor').value  // Save notes content
        },
        narrative_arc: TAB_CONFIG.narrative_arc.content,
        world_setting: TAB_CONFIG.world_setting.content,
        characters: TAB_CONFIG.characters.data, // Save full character data
        parsedText: document.querySelector('.bottom-left-panel').textContent,
        selectedCharacter,
        selectedDialogueType
    };

    const jsonData = JSON.stringify(runescriptData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'runescript.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showAlert("Runescript saved as JSON file!", "success");
}

// Update loadRunescriptFromJson function
function loadRunescriptFromJson(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const runescriptData = JSON.parse(e.target.result);

            // Update the TAB_CONFIG with the loaded data
            TAB_CONFIG.notes.content = runescriptData.notes?.content || "Start writing your notes...";
            TAB_CONFIG.narrative_arc.content = runescriptData.narrative_arc || "No analysis available";
            TAB_CONFIG.world_setting.content = runescriptData.world_setting || "No analysis available";
            TAB_CONFIG.characters.data = runescriptData.characters || [];
            TAB_CONFIG.characters.content = TAB_CONFIG.characters.data.map(c => c.name).join('\n') || "No characters detected";

            // Update the notes editor
            const notesEditor = document.querySelector('.notes-editor');
            if (notesEditor) {
                notesEditor.value = TAB_CONFIG.notes.content;
            }

            // Clear the tab-pane content (only buttons should be here)
            document.querySelector('.tab-pane[data-tab="notes"]').innerHTML = "";
            document.querySelector('.tab-pane[data-tab="narrative_arc"]').innerHTML = "";
            document.querySelector('.tab-pane[data-tab="world_setting"]').innerHTML = "";

            // Set up the characters tab pane with buttons
            const charactersPane = document.querySelector('.tab-pane[data-tab="characters"]');
            charactersPane.innerHTML = `
                <div class="dialogue-buttons">
                    <button class="dialogue-button" data-type="description">Description</button>
                    <button class="dialogue-button" data-type="dialogue">Dialogue</button>
                    <button class="dialogue-button" data-type="relationships">Relationships</button>
                </div>
            `;

            // Update the parsed text in the bottom-left panel
            document.querySelector('.bottom-left-panel').textContent = runescriptData.parsedText || "";

            // Update characters emptiness state
            TAB_CONFIG.characters.isEmpty = TAB_CONFIG.characters.content === "No characters detected";

            // Clear bottom panel if empty
            if (TAB_CONFIG.characters.isEmpty) {
                document.getElementById('bottom-right-panel').innerHTML = '';
                selectedCharacter = null;
                selectedDialogueType = null;
            } else {
                selectedCharacter = runescriptData.selectedCharacter || null;
                selectedDialogueType = runescriptData.selectedDialogueType || null;
            }

            // Refresh the display if any tab is active
            const activeTab = document.querySelector('.tab-button.active');
            if (activeTab) {
                updateContentDisplay(activeTab.dataset.tab);
            }
            showAlert("Runescript loaded from JSON file!", "success");
        } catch (error) {
            console.error('Error loading JSON file:', error);
            showAlert("Invalid JSON file. Please load a valid Runescript JSON file.", "error");
        }
    };
    reader.readAsText(file);
}

// File upload handling
document.getElementById('file-upload').addEventListener('change', handleFileUpload);

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const uploadButton = document.querySelector('.upload-button');
    uploadButton.textContent = 'Analyzing...';
    uploadButton.style.background = '#cccccc';

    try {
        const text = await extractTextFromDocx(file);
        document.querySelector('.bottom-left-panel').textContent = text;

        const response = await fetch('http://localhost:5000/analyze-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        const analysisData = await response.json();

        if (!analysisData.characters || !Array.isArray(analysisData.characters)) {
            throw new Error("Invalid response format: characters array missing");
        }

        if (analysisData.characters.length > 0) {
            TAB_CONFIG.characters.data = analysisData.characters;
            TAB_CONFIG.characters.isEmpty = false;
            // Format for display (legacy compatibility)
            TAB_CONFIG.characters.content = analysisData.characters.map(c => c.name).join('\n');
        } else {
            TAB_CONFIG.characters.content = "No characters detected";
            TAB_CONFIG.characters.isEmpty = true;
        }
        
    } catch (error) {
        console.error('Error analyzing document:', error);
        TAB_CONFIG.characters.content = `Error: ${error.message}`;
        updateContentDisplay('characters');
        showAlert("Error analyzing document. Please try again", "error");
    } finally {
        uploadButton.textContent = 'Upload File (.docx)';
        uploadButton.style.background = '#2A6F7F';
    }
}

async function extractTextFromDocx(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const arrayBuffer = event.target.result;
                const result = await mammoth.extractRawText({ arrayBuffer });
                resolve(result.value);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
}

function showAlert(message, type = 'success') {
    const alertBox = document.getElementById('custom-alert');
    const alertMessage = document.getElementById('alert-message');

    // Set the message and style based on the type (e.g., success, error)
    alertMessage.textContent = message;
    alertBox.className = `custom-alert show ${type}`;

    // Show the alert
    alertBox.style.display = 'block';

    // Fade out after 3 seconds
    setTimeout(() => {
        alertBox.classList.add('fade-out');
    }, 3000);

    // Remove the alert from the DOM after the fade-out animation
    setTimeout(() => {
        alertBox.style.display = 'none';
        alertBox.classList.remove('show', 'fade-out');
    }, 3500); // 3.5 seconds total (3s display + 0.5s fade-out)
}