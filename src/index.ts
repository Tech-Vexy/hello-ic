import { query, update, Canister, text, Record, StableBTreeMap, Ok, None, Some, Err, Vec, Result, nat64, ic, Opt, Variant } from 'azle';
import { v4 as uuidv4 } from 'uuid';

/**
 * This type represents a note that can be listed in the notebook.
 */
const Note = Record({
    id: text,
    title: text,
    body: text,
    createdAt: nat64,
    updatedAt: Opt(nat64)
});

const Notes = Record({
    title: text,
    body: text,
});

const Error = Variant({
    NotFound: text,
    Invalidnote: text,
});


const notesStorage = StableBTreeMap(text, Note, 0);

export default Canister({
    getNotes: query([], Result(Vec(Note), Error), () => {
        return Ok(notesStorage.values());
    }),
    getNote: query([text], Result(Note, Error), (id) => {
        const note = notesStorage.get(id);
        if ("None" in note) {
            return Err({ NotFound: `the note with id=${id} was not found in the notebook` });
        }
        return Ok(note.Some);
    }),
    addNote: update([Notes], Result(Note, Error), (payload) => {
        const new_note = { id: uuidv4(), createdAt: ic.time(), updatedAt: None, ...payload };
        notesStorage.insert(new_note.id, new_note);
        return Ok(new_note);
    }),
    updateNote: update([text, Notes], Result(Note, Error), (id, payload) => {
        const note = notesStorage.get(id);
        if ("None" in note) {
            return Err({ NotFound: `could not update the note with id=${id}. note was not found` });
        }
        const mynote = note.Some;
        const updatedNote = { ...mynote, ...payload, updatedAt: Some(ic.time()) };
        notesStorage.insert(mynote.id, updatedNote);
        return Ok(updatedNote);
    }),
    deleteNote: update([text], Result(Note, Error), (id) => {
        const deletedNote = notesStorage.remove(id);
        if ("None" in deletedNote) {
            return Err({ NotFound: `could not delete the note with id=${id}. note not found in the notebook` });
        }
        return Ok(deletedNote.Some);
    })
});

// a workaround to make uuid package work with Azle
globalThis.crypto = {
    // @ts-ignore
    getRandomValues: () => {
        let array = new Uint8Array(32);

        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }

        return array;
    }
};