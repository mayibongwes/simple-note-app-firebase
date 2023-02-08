class Note {
    constructor(id, title, text) {
        this.id = id;
        this.title = title;
        this.text = text;
        this.updated = Date.now();
    }
}

class App {
    constructor() {
        /**testing with local storage */
        // this.notes = JSON.parse(localStorage.getItem('notes')) || [];

        this.notes = [];

        /**
         * Page Elements
         */
        this.$formTitle = document.querySelector("#note-title");
        this.$formText = document.querySelector("#note-text");
        this.$formButton = document.querySelector("#submit");
        this.$notes = document.querySelector("#notes");
        this.$app = document.querySelector("#app");
        this.$firebaseContainer = document.querySelector("#firebaseui-auth-container");
        this.$authUserName = document.querySelector("#auth-username")
        this.$logoutBtn = document.querySelector(".logout")
        this.$userId = "";

        this.$app.style.display = "none"
        /* firebase login ui */
        // Initialize the FirebaseUI Widget using Firebase.
        this.ui = new firebaseui.auth.AuthUI(auth);
        this.handleAuth()

        this.addEventListeners()
        this.displayNotes()
    }

    handleAuth() {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                // User is signed in, see docs for a list of available properties
                // https://firebase.google.com/docs/reference/js/firebase.User
                this.$userId = user.uid;

                this.$authUserName.innerHTML = user.displayName;
                this.redirectToApp()
                console.log("after redirecting to app");
            } else {
                // User is signed out
                this.redirectToAuth()
            }
        });
    }

    handleLogout() {
        firebase.auth().signOut().then(() => {
            this.redirectToAuth()
        }).catch((error) => {
            console.log("Error Occured", error);
        });
    }

    redirectToApp() {
        this.$firebaseContainer.style.display = "none"
        this.$app.style.display = "block"
        this.fetchNotes()
    }

    redirectToAuth() {
        this.$firebaseContainer.style.display = "block"
        this.$app.style.display = "none"

        this.ui.start('#firebaseui-auth-container', {
            callbacks: {
                signInSucessWithAuthResult: (authResult, redirectUrl) => {
                    this.$userId = authResult.user.uid
                    this.$authUserName.innerHTML = user.displayName;
                    this.redirectToApp();
                }
            },
            signInOptions: [
                firebase.auth.EmailAuthProvider.PROVIDER_ID,
                firebase.auth.GoogleAuthProvider.PROVIDER_ID
            ],
            // Other config options...
        });
    }

    addNote({ title, text }) {
        if (text != "") {
            // removed because we cannot save custom objects (Note{}) to firestore
            // need a regular Javascript Object/ JSOn
            // const newNote = new Note(Date.now(), title, text);
            const newNote = { id: Date.now(), title, text, updated: Date.now() }
            this.notes = [...this.notes, newNote];
            this.render();
        }
    }

    editNote(id, { title, text }) {
        this.notes = this.notes.map((note) => {
            if (note.id == id) {
                // note.title = title; don't want to change note title yet
                note.text = text;
            }
            return note;
        });
        this.render();
    }

    deleteNote(id) {
        this.notes = this.notes.filter((note) => note.id != id);
        this.render();
    }

    addEventListeners() {
        this.$formTitle.addEventListener("click", () => this.expandForm());

        this.$formButton.addEventListener("click", (event) => {
            event.preventDefault()
            const title = this.$formTitle.value;
            const text = this.$formText.value;
            this.addNote({ title, text });
            this.hideControls(this.$formText, this.$formButton)
            this.$formTitle.value = "";
            this.$formText.value = "";
        })

        this.$logoutBtn.addEventListener("click", () => this.handleLogout())
    }

    expandForm() {
        this.$formTitle.placeholder = "Title";
        this.showControls(this.$formText, this.$formButton)
    }

    collapseForm() {
        this.$formTitle.placeholder = "Add Note";
        this.hideControls(this.$formText, this.$formButton)
    }

    showControls(...controls) {
        controls.forEach((control) => {
            control.classList.contains("hide") ? control.classList.remove("hide") : true
            control.classList.contains("show") ? true : control.classList.add("show")
        });
    }

    hideControls(...controls) {
        controls.forEach((control) => {
            control.classList.contains("show") ? control.classList.remove("show") : true
            control.classList.contains("hide") ? true : control.classList.add("hide")
        });
    }

    saveNotes() {
        // localStorage.setItem('notes', JSON.stringify(this.notes));
        // Add a new document in collection "cities"
        db.collection("users").doc(this.$userId).set({
            notes: this.notes
        })
            .then(() => {
                console.log("Notes successfully saved!");
            })
            .catch((error) => {
                console.error("Error writing Notes: ", error);
            });
    }

    fetchNotes() {
        console.log(this.$userId);
        var docRef = db.collection("users").doc(this.$userId.toString());

        docRef.get().then((doc) => {
            if (doc.exists) {
                this.notes = doc.data().notes;
                this.displayNotes();
            } else {
                // doc.data() will be undefined in this case
                console.log("No such document");
                db.collection("users").doc(this.$userId).set({
                    notes: []
                })
                    .then(() => {
                        console.log("Notes successfully saved!");
                    })
                    .catch((error) => {
                        console.error("Error writing Notes: ", error);
                    });
            }
        }).catch((error) => {
            console.log("Error getting document:", error);
        });
    }

    render() {
        this.saveNotes();
        this.displayNotes();
    }

    editNoteEvent(event) {
        const noteDiv = event.target.closest('.note')
        const pText = noteDiv.querySelector('p')
        const cCheck = noteDiv.querySelector('.fa-check')
        const contenteditable = pText.getAttribute('contenteditable')
        if (!contenteditable || contenteditable == "false") {
            pText.setAttribute('contenteditable', true)
        }
        event.target.style.display = "none";
        cCheck.style.display = "block"
    }

    confirmNoteEdit(event) {
        const noteDiv = event.target.closest('.note')
        const pText = noteDiv.querySelector('p')
        const cPencil = noteDiv.querySelector('.fa-pencil')
        const contenteditable = pText.getAttribute('contenteditable')
        const noteId = noteDiv.querySelector('span').innerHTML
        if (contenteditable || contenteditable == "true") {
            pText.setAttribute('contenteditable', false)
        }
        event.target.style.display = "none";
        cPencil.style.display = "block"
        this.editNote(noteId, { title: "", text: pText.innerHTML })
        this.render()
    }

    deleteNoteEvent(event) {
        const noteDiv = event.target.closest('.note')
        const noteId = noteDiv.querySelector('span').innerHTML
        this.deleteNote(noteId)
        this.render()
    }

    /**
     * edit icon: fa-pencil
     * confirm icon: fa-check
     * editable paragraph: contenteditable="true"
     */
    displayNotes() {
        this.$notes.innerHTML = this.notes.map((note, idx) => {
            console.log(note);
            const noteDate = new Date(note.updated)
            const dateFormat = noteDate.getDate() + "/"
                + (noteDate.getMonth() + 1) + "/"
                + noteDate.getFullYear() + " "
                + noteDate.getHours() + ":"
                + noteDate.getMinutes() + ":"
                + noteDate.getSeconds();
            return `
                ${idx > 0 ? "<hr />." : ""}
                <div class="note">
                    <span style="display:none">${note.id}</span>
                    <h2 for="note1">${note.title}</h2>
                    <div class="note-body">
                        <p contenteditable="false">${note.text}</p>
                        <div class="controls">
                            <i class="fa-solid fa-pencil" onclick="app.editNoteEvent(event)"></i>
                            <i class="fa-solid fa-check" style="display: none;" onclick="app.confirmNoteEdit(event)"></i>
                            </a><i class="fa-solid fa-trash" onclick="app.deleteNoteEvent(event)"></i>
                        </div>
                    </div>
                    <em>Updated: ${dateFormat}</em>
                </div>
            `
        }).join("");
    }

}

// const baseNote = new Note(1,"Sample Title","Body of the Note here")
const app = new App();