document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const notesContainer = document.getElementById('notes-container');
    const noteEditor = document.getElementById('note-editor');
    const addNoteBtn = document.getElementById('add-note-btn');
    const saveNoteBtn = document.getElementById('save-note');
    const cancelEditBtn = document.getElementById('cancel-edit');
    const noteTitleInput = document.getElementById('note-title');
    const noteContentInput = document.getElementById('note-content');
    const searchInput = document.getElementById('search-notes');
    const colorOptions = document.querySelectorAll('.color-option');
    const attachFileBtn = document.getElementById('attach-file');
    const fileInput = document.getElementById('file-input');
    const attachmentsContainer = document.getElementById('attachments-container');
    const themeToggle = document.getElementById('theme-toggle');
    const viewOptions = document.querySelectorAll('.view-option');
    
    // State variables
    let notes = JSON.parse(localStorage.getItem('notes')) || [];
    let currentNoteId = null;
    let selectedColor = '#ffffff';
    let currentAttachments = [];
    let currentView = 'grid';
    
    // Initialize the app
    function init() {
        // Load theme preference
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.className = `${savedTheme}-mode`;
        themeToggle.checked = savedTheme === 'dark';
        
        // Load view preference
        const savedView = localStorage.getItem('view') || 'grid';
        setView(savedView);
        document.querySelector(`.view-option[data-view="${savedView}"]`).classList.add('active');
        
        renderNotes();
        setupEventListeners();
    }
    
    // Set up event listeners
    function setupEventListeners() {
        addNoteBtn.addEventListener('click', openNewNote);
        saveNoteBtn.addEventListener('click', saveNote);
        cancelEditBtn.addEventListener('click', closeEditor);
        searchInput.addEventListener('input', filterNotes);
        
        colorOptions.forEach(option => {
            option.addEventListener('click', function() {
                selectColor(this);
            });
        });
        
        attachFileBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFileUpload);
        
        themeToggle.addEventListener('change', toggleTheme);
        
        viewOptions.forEach(option => {
            option.addEventListener('click', function() {
                viewOptions.forEach(opt => opt.classList.remove('active'));
                this.classList.add('active');
                setView(this.dataset.view);
                localStorage.setItem('view', this.dataset.view);
            });
        });
    }
    
    // Render all notes
    function renderNotes(filteredNotes = null) {
        const notesToRender = filteredNotes || notes;
        
        if (notesToRender.length === 0) {
            notesContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-alt"></i>
                    <h3>No Notes Found</h3>
                    <p>Create your first note by clicking the "New Note" button</p>
                </div>
            `;
            return;
        }
        
        notesContainer.innerHTML = '';
        
        notesToRender.forEach(note => {
            const noteElement = document.createElement('div');
            noteElement.className = 'note-card';
            noteElement.style.backgroundColor = note.color;
            noteElement.style.borderColor = note.color === '#ffffff' ? 'var(--border-color)' : 'transparent';
            
            let imageContent = '';
            if (note.attachments && note.attachments.length > 0) {
                const firstImage = note.attachments[0];
                imageContent = `
                    <div class="note-image">
                        <img src="${firstImage.url}" alt="Note attachment">
                    </div>
                `;
            }
            
            noteElement.innerHTML = `
                <div class="note-actions">
                    <button class="edit-note" data-id="${note.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-note" data-id="${note.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                ${imageContent}
                <div class="note-content-wrapper">
                    <h3>${note.title}</h3>
                    <p>${note.content}</p>
                    <div class="note-date">
                        <i class="far fa-calendar-alt"></i>
                        ${formatDate(note.date)}
                        ${note.attachments && note.attachments.length > 0 ? 
                          `<span class="attachment-count"><i class="fas fa-paperclip"></i> ${note.attachments.length}</span>` : ''}
                    </div>
                </div>
            `;
            
            // Add click event to open note for editing
            noteElement.addEventListener('click', function(e) {
                // Don't open editor if clicking on action buttons
                if (!e.target.closest('.note-actions')) {
                    openNoteForEditing(note.id);
                }
            });
            
            // Add event listeners for action buttons
            const editBtn = noteElement.querySelector('.edit-note');
            const deleteBtn = noteElement.querySelector('.delete-note');
            
            editBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                openNoteForEditing(this.dataset.id);
            });
            
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                deleteNote(this.dataset.id);
            });
            
            notesContainer.appendChild(noteElement);
        });
    }
    
    // Open editor for a new note
    function openNewNote() {
        currentNoteId = null;
        noteTitleInput.value = '';
        noteContentInput.value = '';
        selectedColor = '#ffffff';
        currentAttachments = [];
        renderAttachments();
        resetColorSelection();
        noteEditor.style.display = 'block';
        noteTitleInput.focus();
        
        // Scroll to editor smoothly
        noteEditor.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Open editor with an existing note
    function openNoteForEditing(noteId) {
        const note = notes.find(n => n.id === noteId);
        if (note) {
            currentNoteId = noteId;
            noteTitleInput.value = note.title;
            noteContentInput.value = note.content;
            selectedColor = note.color;
            currentAttachments = note.attachments || [];
            
            // Select the color
            resetColorSelection();
            colorOptions.forEach(option => {
                if (option.dataset.color === note.color) {
                    option.classList.add('selected');
                }
            });
            
            renderAttachments();
            noteEditor.style.display = 'block';
            noteTitleInput.focus();
            
            // Scroll to editor smoothly
            noteEditor.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    // Save note (create or update)
    function saveNote() {
        const title = noteTitleInput.value.trim();
        const content = noteContentInput.value.trim();
        
        if (!title) {
            alert('Please enter a title for your note');
            return;
        }
        
        const now = new Date();
        
        if (currentNoteId) {
            // Update existing note
            const noteIndex = notes.findIndex(n => n.id === currentNoteId);
            if (noteIndex !== -1) {
                notes[noteIndex] = {
                    ...notes[noteIndex],
                    title,
                    content,
                    color: selectedColor,
                    attachments: currentAttachments,
                    date: now
                };
            }
        } else {
            // Create new note
            const newNote = {
                id: generateId(),
                title,
                content,
                color: selectedColor,
                attachments: currentAttachments,
                date: now
            };
            notes.unshift(newNote); // Add to beginning of array
        }
        
        saveToLocalStorage();
        renderNotes();
        closeEditor();
    }
    
    // Delete note
    function deleteNote(noteId) {
        if (confirm('Are you sure you want to delete this note?')) {
            notes = notes.filter(note => note.id !== noteId);
            saveToLocalStorage();
            renderNotes();
            closeEditor();
        }
    }
    
    // Close the editor
    function closeEditor() {
        noteEditor.style.display = 'none';
        currentNoteId = null;
        currentAttachments = [];
    }
    
    // Filter notes based on search input
    function filterNotes() {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredNotes = notes.filter(note => 
            note.title.toLowerCase().includes(searchTerm) || 
            note.content.toLowerCase().includes(searchTerm)
        );
        renderNotes(filteredNotes);
    }
    
    // Handle file upload
    function handleFileUpload(e) {
        const files = e.target.files;
        if (files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        currentAttachments.push({
                            id: generateId(),
                            name: file.name,
                            type: file.type,
                            url: event.target.result
                        });
                        renderAttachments();
                    };
                    reader.readAsDataURL(file);
                }
            }
        }
        fileInput.value = ''; // Reset input
    }
    
    // Render attachments in editor
    function renderAttachments() {
        attachmentsContainer.innerHTML = '';
        currentAttachments.forEach(attachment => {
            const attachmentElement = document.createElement('div');
            attachmentElement.className = 'attachment-preview';
            attachmentElement.innerHTML = `
                <img src="${attachment.url}" alt="${attachment.name}">
                <button class="remove-attachment" data-id="${attachment.id}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            const removeBtn = attachmentElement.querySelector('.remove-attachment');
            removeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                removeAttachment(attachment.id);
            });
            
            attachmentsContainer.appendChild(attachmentElement);
        });
    }
    
    // Remove attachment
    function removeAttachment(attachmentId) {
        currentAttachments = currentAttachments.filter(att => att.id !== attachmentId);
        renderAttachments();
    }
    
    // Select a color for the note
    function selectColor(element) {
        resetColorSelection();
        element.classList.add('selected');
        selectedColor = element.dataset.color;
    }
    
    // Reset all color selections
    function resetColorSelection() {
        colorOptions.forEach(option => {
            option.classList.remove('selected');
        });
    }
    
    // Toggle between light and dark theme
    function toggleTheme() {
        if (themeToggle.checked) {
            document.body.className = 'dark-mode';
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.className = 'light-mode';
            localStorage.setItem('theme', 'light');
        }
    }
    
    // Set view mode (grid or list)
    function setView(view) {
        currentView = view;
        notesContainer.className = `notes-container ${view}-view`;
    }
    
    // Save notes to localStorage
    function saveToLocalStorage() {
        localStorage.setItem('notes', JSON.stringify(notes));
    }
    
    // Generate a unique ID
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    // Format date for display
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    // Initialize the app
    init();
});